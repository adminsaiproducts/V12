/**
 * マスターデータ管理API
 *
 * Firestoreの Masters コレクションでマスターデータを管理
 * 各マスタータイプは単一のドキュメントとして保存し、itemsフィールドに選択肢を配列で持つ
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import relationshipTypesData from '../data/relationshipTypes.json';
import templesData from '../data/temples.json';
import employeesData from '../data/employees.json';

// マスタータイプ
export type MasterType =
  | 'branches'           // 拠点
  | 'visitRoutes'        // 来寺経緯
  | 'receptionists'      // 受付担当
  | 'plans'              // 希望プラン
  | 'religiousSects'     // 宗旨・宗派
  | 'transportations'    // 交通手段
  | 'relationships'      // 続柄
  | 'relationshipTypes'  // 関係性タイプ（詳細）
  | 'temples'            // 寺院マスター
  | 'employees';         // 従業員マスター

// マスター項目
export interface MasterItem {
  id: string;
  name: string;
  code?: string;
  sortOrder: number;
  isActive: boolean;
  description?: string;  // 説明（関係性タイプ用）
  category?: string;     // カテゴリ（関係性タイプ用）
  reverseCode?: string;  // 逆関係コード（関係性タイプ用）
  // 寺院マスター用フィールド
  sanGo?: string;        // 山号
  area?: string;         // エリア
  furigana?: string;     // フリガナ
  sect?: string;         // 宗派
  priestName?: string;   // 住職氏名
  postalCode?: string;   // 郵便番号
  prefecture?: string;   // 都道府県
  city?: string;         // 市区
  town?: string;         // 町村
  address?: string;      // 番地
  building?: string;     // 建物名
  phone?: string;        // 電話番号
  mobile?: string;       // 携帯番号
  email?: string;        // メール
  // 従業員マスター用フィールド
  lastName?: string;     // 姓
  firstName?: string;    // 名
  lastNameKana?: string; // 姓カナ
  firstNameKana?: string; // 名カナ
  genderCode?: string;   // 男女コード (1: 男性, 2: 女性)
  birthDate?: string;    // 生年月日
  hireDate?: string;     // 入社日
  resignDate?: string;   // 退職日
  createdAt?: string;
  updatedAt?: string;
}

// マスタードキュメント
export interface MasterDocument {
  type: MasterType;
  displayName: string;
  items: MasterItem[];
  updatedAt?: unknown;
}

// マスタータイプの表示名
export const MASTER_TYPE_LABELS: Record<MasterType, string> = {
  branches: '拠点',
  visitRoutes: '来寺経緯',
  receptionists: '受付担当',
  plans: '希望プラン',
  religiousSects: '宗旨・宗派',
  transportations: '交通手段',
  relationships: '続柄',
  relationshipTypes: '関係性タイプ',
  temples: '寺院',
  employees: '従業員',
};

// 拠点マスターのデフォルトデータ（表示フラグ付き）
interface BranchMasterItem {
  code: string;
  name: string;
  isActive: boolean;
}

const DEFAULT_BRANCHES: BranchMasterItem[] = [
  { code: 'K0000', name: '未設定', isActive: true },
  { code: 'K0001', name: '横浜令和の杜', isActive: true },
  { code: 'K0002', name: '新座令和の杜', isActive: true },
  { code: 'K0003', name: '大多喜令和の杜', isActive: true },
  { code: 'K0004', name: '西湘令和の杜', isActive: true },
  { code: 'K0005', name: '金沢八景令和の杜', isActive: true },
  { code: 'K0006', name: '麻布 樹木墓 庭園墓 合同墓', isActive: true },
  { code: 'K0007', name: '谷中天龍の杜', isActive: true },
  { code: 'K0008', name: '広尾の杜', isActive: true },
  { code: 'K0009', name: '朝霞令和の杜', isActive: true },
  { code: 'K0010', name: '新横浜令和の杜', isActive: true },
  { code: 'K0011', name: '浅草令和の杜', isActive: true },
  { code: 'K0012', name: '青葉台の杜', isActive: true },
  { code: 'K0013', name: '東福寺令和の杜', isActive: true },
  { code: 'K0014', name: '龍口の杜', isActive: true },
  { code: 'K0015', name: '町田 久遠の杜', isActive: true },
  { code: 'K0016', name: 'ふうがくの杜', isActive: true },
  { code: 'K0017', name: '世田谷自然の杜', isActive: false },
  { code: 'K0018', name: '市ヶ谷坂の上堂内廟', isActive: false },
  { code: 'K0019', name: '蒲田庭苑', isActive: false },
  { code: 'K0020', name: '迦桜塔 東京', isActive: false },
  { code: 'K0021', name: '亀有・中川樹木墓苑', isActive: false },
  { code: 'K0022', name: 'シニアライフサポート', isActive: true },
  { code: 'K0023', name: '彩プロダクツ', isActive: true },
];

// デフォルトのマスターデータ（拠点以外）
const DEFAULT_MASTERS: Record<MasterType, string[]> = {
  branches: [], // 拠点は別途 DEFAULT_BRANCHES を使用
  visitRoutes: [
    '境内チラシ',
    '看板広告',
    'インターネット',
    '紹介',
    'DM',
    '電話',
    '来店',
    'その他',
  ],
  receptionists: [
    '加藤美夢',
    '田中',
    '鈴木',
    'その他',
  ],
  plans: [
    '永代供養墓',
    '樹木墓',
    '一般墓',
    '納骨堂',
    '合祀墓',
    'その他',
  ],
  religiousSects: [
    '浄土宗',
    '浄土真宗',
    '真言宗',
    '曹洞宗',
    '臨済宗',
    '日蓮宗',
    '天台宗',
    '神道',
    '無宗教',
    'その他',
  ],
  transportations: [
    '自家用車',
    '電車・バス',
    '徒歩',
    'タクシー',
    'その他',
  ],
  relationships: [
    '本人',
    '配偶者',
    '子',
    '父',
    '母',
    '兄弟姉妹',
    '孫',
    '祖父母',
    '親戚',
    '友人',
    'その他',
  ],
  relationshipTypes: [], // 詳細な関係性タイプは別途初期化
  temples: [], // 寺院マスターは別途JSONから初期化
  employees: [], // 従業員マスターは別途JSONから初期化
};

// Firestoreコレクション
const MASTERS_COLLECTION = 'Masters';

/**
 * マスターデータを取得
 */
export async function getMaster(type: MasterType): Promise<MasterDocument | null> {
  const docRef = doc(db, MASTERS_COLLECTION, type);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as MasterDocument;
    // 関係性タイプの場合、Firestore上のitemsが空または少ない場合はJSONから再初期化
    if (type === 'relationshipTypes' && (!data.items || data.items.length < 10)) {
      // JSONから初期化してFirestoreに保存
      const items: MasterItem[] = relationshipTypesData.map((rt) => ({
        id: rt.code,
        name: rt.name,
        code: rt.code,
        sortOrder: rt.displayOrder,
        isActive: rt.isActive,
        description: rt.description,
        category: rt.category,
        reverseCode: rt.reverseCode,
        createdAt: new Date().toISOString(),
      }));
      const newMaster: MasterDocument = {
        type: 'relationshipTypes',
        displayName: MASTER_TYPE_LABELS.relationshipTypes,
        items,
      };
      await setDoc(docRef, {
        ...newMaster,
        updatedAt: serverTimestamp(),
      });
      return newMaster;
    }
    // 寺院マスターの場合、Firestore上のitemsが空または少ない場合はJSONから再初期化
    if (type === 'temples' && (!data.items || data.items.length < 10)) {
      const items: MasterItem[] = templesData.map((t) => ({
        id: t.code,
        name: t.name,
        code: t.code,
        sortOrder: t.displayOrder,
        isActive: t.isActive,
        sanGo: t.sanGo,
        area: t.area,
        furigana: t.furigana,
        sect: t.sect,
        priestName: t.priestName,
        postalCode: t.postalCode,
        prefecture: t.prefecture,
        city: t.city,
        town: t.town,
        address: t.address,
        building: t.building,
        phone: t.phone,
        mobile: t.mobile,
        email: t.email,
        createdAt: new Date().toISOString(),
      }));
      const newMaster: MasterDocument = {
        type: 'temples',
        displayName: MASTER_TYPE_LABELS.temples,
        items,
      };
      await setDoc(docRef, {
        ...newMaster,
        updatedAt: serverTimestamp(),
      });
      return newMaster;
    }
    // 従業員マスターの場合、Firestore上のitemsが空または少ない場合はJSONから再初期化
    if (type === 'employees' && (!data.items || data.items.length < 10)) {
      const items: MasterItem[] = employeesData.map((e) => ({
        id: e.code,
        name: e.name,
        code: e.code,
        sortOrder: e.displayOrder,
        isActive: e.isActive,
        lastName: e.lastName,
        firstName: e.firstName,
        lastNameKana: e.lastNameKana,
        firstNameKana: e.firstNameKana,
        furigana: e.furigana,
        genderCode: e.genderCode,
        birthDate: e.birthDate,
        hireDate: e.hireDate,
        resignDate: e.resignDate,
        email: e.email,
        createdAt: new Date().toISOString(),
      }));
      const newMaster: MasterDocument = {
        type: 'employees',
        displayName: MASTER_TYPE_LABELS.employees,
        items,
      };
      await setDoc(docRef, {
        ...newMaster,
        updatedAt: serverTimestamp(),
      });
      return newMaster;
    }
    return data;
  }

  // 存在しない場合はデフォルト値で初期化
  let items: MasterItem[];

  if (type === 'branches') {
    // 拠点は特別に表示フラグ付きで初期化
    items = DEFAULT_BRANCHES.map((branch, index) => ({
      id: branch.code,
      name: branch.name,
      code: branch.code,
      sortOrder: index + 1,
      isActive: branch.isActive,
      createdAt: new Date().toISOString(),
    }));
  } else if (type === 'relationshipTypes') {
    // 関係性タイプはJSONファイルから初期化（description, category, reverseCode含む）
    items = relationshipTypesData.map((rt) => ({
      id: rt.code,
      name: rt.name,
      code: rt.code,
      sortOrder: rt.displayOrder,
      isActive: rt.isActive,
      description: rt.description,
      category: rt.category,
      reverseCode: rt.reverseCode,
      createdAt: new Date().toISOString(),
    }));
  } else if (type === 'temples') {
    // 寺院マスターはJSONファイルから初期化（全フィールド含む）
    items = templesData.map((t) => ({
      id: t.code,
      name: t.name,
      code: t.code,
      sortOrder: t.displayOrder,
      isActive: t.isActive,
      sanGo: t.sanGo,
      area: t.area,
      furigana: t.furigana,
      sect: t.sect,
      priestName: t.priestName,
      postalCode: t.postalCode,
      prefecture: t.prefecture,
      city: t.city,
      town: t.town,
      address: t.address,
      building: t.building,
      phone: t.phone,
      mobile: t.mobile,
      email: t.email,
      createdAt: new Date().toISOString(),
    }));
  } else if (type === 'employees') {
    // 従業員マスターはJSONファイルから初期化（全フィールド含む）
    items = employeesData.map((e) => ({
      id: e.code,
      name: e.name,
      code: e.code,
      sortOrder: e.displayOrder,
      isActive: e.isActive,
      lastName: e.lastName,
      firstName: e.firstName,
      lastNameKana: e.lastNameKana,
      firstNameKana: e.firstNameKana,
      furigana: e.furigana,
      genderCode: e.genderCode,
      birthDate: e.birthDate,
      hireDate: e.hireDate,
      resignDate: e.resignDate,
      email: e.email,
      createdAt: new Date().toISOString(),
    }));
  } else {
    const defaultItems = DEFAULT_MASTERS[type] || [];
    items = defaultItems.map((name, index) => ({
      id: `${type}_${index + 1}`,
      name,
      sortOrder: index + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    }));
  }

  const newMaster: MasterDocument = {
    type,
    displayName: MASTER_TYPE_LABELS[type],
    items,
  };

  await setDoc(docRef, {
    ...newMaster,
    updatedAt: serverTimestamp(),
  });

  return newMaster;
}

/**
 * 全マスターデータを取得
 */
export async function getAllMasters(): Promise<Record<MasterType, MasterDocument>> {
  const mastersRef = collection(db, MASTERS_COLLECTION);
  const snapshot = await getDocs(mastersRef);

  const masters: Partial<Record<MasterType, MasterDocument>> = {};

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as MasterDocument;
    masters[data.type] = data;
  });

  // 存在しないマスターはデフォルト値で補完
  const allTypes: MasterType[] = Object.keys(MASTER_TYPE_LABELS) as MasterType[];
  for (const type of allTypes) {
    if (!masters[type]) {
      masters[type] = await getMaster(type) || undefined;
    }
  }

  return masters as Record<MasterType, MasterDocument>;
}

/**
 * マスター項目の選択肢を取得（アクティブなもののみ）
 */
export async function getMasterOptions(type: MasterType): Promise<string[]> {
  const master = await getMaster(type);
  if (!master) return [];

  return master.items
    .filter((item) => item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.name);
}

/**
 * マスターデータを更新（項目の追加・編集・削除）
 */
export async function updateMaster(type: MasterType, items: MasterItem[]): Promise<void> {
  const docRef = doc(db, MASTERS_COLLECTION, type);

  await updateDoc(docRef, {
    items,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    // ドキュメントが存在しない場合は作成
    await setDoc(docRef, {
      type,
      displayName: MASTER_TYPE_LABELS[type],
      items,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * マスター項目を追加
 */
export async function addMasterItem(type: MasterType, name: string): Promise<MasterItem> {
  const master = await getMaster(type);
  if (!master) throw new Error('Master not found');

  const maxSortOrder = Math.max(...master.items.map((i) => i.sortOrder), 0);
  const newItem: MasterItem = {
    id: `${type}_${Date.now()}`,
    name,
    sortOrder: maxSortOrder + 1,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const updatedItems = [...master.items, newItem];
  await updateMaster(type, updatedItems);

  return newItem;
}

/**
 * マスター項目を詳細情報付きで追加（関係性タイプ等用）
 */
export async function addMasterItemWithDetails(
  type: MasterType,
  item: Omit<MasterItem, 'sortOrder' | 'createdAt'> & { sortOrder?: number }
): Promise<MasterItem> {
  const master = await getMaster(type);
  if (!master) throw new Error('Master not found');

  // 同じIDが既に存在する場合はエラー
  if (master.items.some((i) => i.id === item.id)) {
    throw new Error(`Item with id ${item.id} already exists`);
  }

  const maxSortOrder = Math.max(...master.items.map((i) => i.sortOrder), 0);
  const newItem: MasterItem = {
    ...item,
    sortOrder: item.sortOrder ?? maxSortOrder + 1,
    createdAt: new Date().toISOString(),
  };

  const updatedItems = [...master.items, newItem];
  await updateMaster(type, updatedItems);

  return newItem;
}

/**
 * マスター項目を更新
 */
export async function updateMasterItem(
  type: MasterType,
  itemId: string,
  updates: Partial<MasterItem>
): Promise<void> {
  const master = await getMaster(type);
  if (!master) throw new Error('Master not found');

  const updatedItems = master.items.map((item) =>
    item.id === itemId
      ? { ...item, ...updates, updatedAt: new Date().toISOString() }
      : item
  );

  await updateMaster(type, updatedItems);
}

/**
 * マスター項目を削除（論理削除）
 */
export async function deleteMasterItem(type: MasterType, itemId: string): Promise<void> {
  await updateMasterItem(type, itemId, { isActive: false });
}

/**
 * マスター項目を物理削除
 */
export async function removeMasterItem(type: MasterType, itemId: string): Promise<void> {
  const master = await getMaster(type);
  if (!master) throw new Error('Master not found');

  const updatedItems = master.items.filter((item) => item.id !== itemId);
  await updateMaster(type, updatedItems);
}

/**
 * マスター項目の並び順を更新
 */
export async function reorderMasterItems(type: MasterType, itemIds: string[]): Promise<void> {
  const master = await getMaster(type);
  if (!master) throw new Error('Master not found');

  const updatedItems = master.items.map((item) => {
    const newOrder = itemIds.indexOf(item.id);
    return newOrder >= 0
      ? { ...item, sortOrder: newOrder + 1 }
      : item;
  });

  await updateMaster(type, updatedItems);
}
