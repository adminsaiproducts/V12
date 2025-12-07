/**
 * 顧客サービス - Firestore CRUD操作 + Algolia同期
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { CustomerFormData } from '../components/CustomerForm';
import algoliasearch from 'algoliasearch';

// Algolia設定
const ALGOLIA_APP_ID = '5PE7L5U694';
const ALGOLIA_ADMIN_KEY = '8bb33d4b27a2ff5be2c32d1ba2100194';
const ALGOLIA_INDEX_NAME = 'customers';

// Algoliaクライアント（管理者権限）
const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

// Firestoreのコレクション参照
const CUSTOMERS_COLLECTION = 'Customers';

// 顧客データ型（Firestore）
export interface CustomerDocument {
  trackingNo: string;
  name: string;
  nameKana?: string;
  phone?: string | { original?: string; cleaned?: string };
  phone2?: string;
  email?: string;
  address?: {
    zipCode?: string;
    prefecture?: string;
    city?: string;
    town?: string;
    streetNumber?: string;
    building?: string;
    full?: string;
    fullAddress?: string;
  };
  memo?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// カタカナ→ひらがな変換（検索用）
function katakanaToHiragana(str: string): string {
  if (!str) return '';
  return str.replace(/[\u30A1-\u30F6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
}

// 電話番号を正規化
function normalizePhone(phone: string | { original?: string; cleaned?: string } | undefined): string {
  if (!phone) return '';
  if (typeof phone === 'string') return phone.replace(/[-\s]/g, '');
  if (typeof phone === 'object') {
    return (phone.cleaned || phone.original || '').replace(/[-\s]/g, '');
  }
  return '';
}

// 住所を文字列に変換
function formatAddress(address: CustomerDocument['address']): string {
  if (!address) return '';
  if (address.full) return address.full;
  if (address.fullAddress) return address.fullAddress;
  return [
    address.prefecture,
    address.city,
    address.town,
    address.streetNumber,
    address.building,
  ].filter(Boolean).join('');
}

/**
 * 次のtrackingNoを取得（数字の追客NO）
 */
export async function getNextTrackingNo(): Promise<string> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);

  // 数字で始まるtrackingNoのうち、最大のものを取得
  const q = query(
    customersRef,
    orderBy('trackingNo', 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(q);

  let maxNumber = 0;
  snapshot.docs.forEach((doc) => {
    const trackingNo = doc.data().trackingNo;
    if (trackingNo && /^\d+$/.test(trackingNo)) {
      const num = parseInt(trackingNo, 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  // 次の番号を返す
  return String(maxNumber + 1);
}

/**
 * 顧客を新規作成
 */
export async function createCustomer(data: CustomerFormData): Promise<string> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);

  // trackingNoが指定されていない場合は自動採番
  const trackingNo = data.trackingNo || await getNextTrackingNo();

  const now = new Date().toISOString();

  // Firestoreに保存するデータ
  const customerData: CustomerDocument = {
    trackingNo,
    name: data.name,
    nameKana: data.nameKana || '',
    phone: data.phone || '',
    phone2: data.phone2 || '',
    email: data.email || '',
    address: {
      zipCode: data.postalCode || '',
      prefecture: data.prefecture || '',
      city: data.city || '',
      town: data.town || '',
      streetNumber: '',
      building: data.building || '',
      full: [
        data.prefecture,
        data.city,
        data.town,
        data.building,
      ].filter(Boolean).join(''),
    },
    memo: data.memo || '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  // Firestoreに追加
  const docRef = await addDoc(customersRef, customerData);

  // Algoliaに同期
  await syncCustomerToAlgolia(trackingNo, docRef.id, customerData);

  return trackingNo;
}

/**
 * 顧客を更新
 */
export async function updateCustomer(
  firestoreId: string,
  data: CustomerFormData
): Promise<void> {
  const customerRef = doc(db, CUSTOMERS_COLLECTION, firestoreId);

  const now = new Date().toISOString();

  // 更新データを構築
  const updateData: Partial<CustomerDocument> = {
    name: data.name,
    nameKana: data.nameKana || '',
    phone: data.phone || '',
    phone2: data.phone2 || '',
    email: data.email || '',
    address: {
      zipCode: data.postalCode || '',
      prefecture: data.prefecture || '',
      city: data.city || '',
      town: data.town || '',
      streetNumber: '',
      building: data.building || '',
      full: [
        data.prefecture,
        data.city,
        data.town,
        data.building,
      ].filter(Boolean).join(''),
    },
    memo: data.memo || '',
    updatedAt: now,
  };

  // Firestoreを更新
  await updateDoc(customerRef, updateData);

  // 更新後のデータを取得してAlgolia同期
  const updatedDoc = await getDoc(customerRef);
  if (updatedDoc.exists()) {
    const fullData = updatedDoc.data() as CustomerDocument;
    await syncCustomerToAlgolia(fullData.trackingNo, firestoreId, fullData);
  }
}

/**
 * 顧客を論理削除
 */
export async function deleteCustomer(firestoreId: string): Promise<void> {
  const customerRef = doc(db, CUSTOMERS_COLLECTION, firestoreId);

  const now = new Date().toISOString();

  // 論理削除（statusをdeletedに変更）
  await updateDoc(customerRef, {
    status: 'deleted',
    updatedAt: now,
  });

  // Algoliaから削除
  const docSnap = await getDoc(customerRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as CustomerDocument;
    await removeCustomerFromAlgolia(data.trackingNo);
  }
}

/**
 * 顧客をAlgoliaに同期
 */
async function syncCustomerToAlgolia(
  trackingNo: string,
  firestoreId: string,
  data: CustomerDocument
): Promise<void> {
  const record = {
    objectID: trackingNo,
    firestoreId: firestoreId,
    trackingNo: trackingNo,
    name: data.name || '',
    nameKana: data.nameKana || '',
    phone: normalizePhone(data.phone),
    phoneOriginal: typeof data.phone === 'object' ? data.phone?.original : data.phone,
    email: data.email || '',
    address: formatAddress(data.address),
    addressPrefecture: data.address?.prefecture || '',
    addressCity: data.address?.city || '',
    memo: data.memo || '',
    status: data.status || '',
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
    // 検索用の正規化フィールド
    _searchName: katakanaToHiragana(data.name || ''),
    _searchNameKana: katakanaToHiragana(data.nameKana || ''),
  };

  await algoliaIndex.saveObject(record);
}

/**
 * 顧客をAlgoliaから削除
 */
async function removeCustomerFromAlgolia(trackingNo: string): Promise<void> {
  await algoliaIndex.deleteObject(trackingNo);
}

/**
 * trackingNoで顧客を取得
 */
export async function getCustomerByTrackingNo(trackingNo: string): Promise<{
  firestoreId: string;
  data: CustomerDocument;
} | null> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);
  const q = query(customersRef, where('trackingNo', '==', trackingNo), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    firestoreId: doc.id,
    data: doc.data() as CustomerDocument,
  };
}
