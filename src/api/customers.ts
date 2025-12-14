import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Customer } from '../types/firestore';
import type { AuditUser } from '../types/audit';
import { createHistoryEntry } from './audit';
import { calculateChanges } from '../utils/diff';

const CUSTOMERS_COLLECTION = 'Customers';

/**
 * 顧客一覧を取得
 */
export async function getCustomers(maxResults = 100): Promise<Customer[]> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);
  const q = query(customersRef, orderBy('name'), limit(maxResults));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Customer[];
}

/**
 * 顧客をリアルタイムで監視
 */
export function subscribeToCustomers(
  callback: (customers: Customer[]) => void,
  maxResults = 100
): Unsubscribe {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);
  const q = query(customersRef, orderBy('name'), limit(maxResults));

  return onSnapshot(q, (snapshot) => {
    const customers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Customer[];
    callback(customers);
  });
}

/**
 * 顧客をIDで取得
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  const docRef = doc(db, CUSTOMERS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Customer;
  }
  return null;
}

/**
 * trackingNoで顧客を取得
 * Note: Firestoreにはtracking番号が文字列または数値として保存されている可能性があるため、
 * 両方の型でクエリを試みる
 */
export async function getCustomerByTrackingNo(
  trackingNo: string
): Promise<Customer | null> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);

  // まず文字列としてクエリ
  const qString = query(customersRef, where('trackingNo', '==', trackingNo), limit(1));
  const snapshotString = await getDocs(qString);

  if (!snapshotString.empty) {
    const doc = snapshotString.docs[0];
    return { id: doc.id, ...doc.data() } as Customer;
  }

  // 文字列で見つからない場合、数値としてクエリ
  const trackingNoNum = parseInt(trackingNo, 10);
  if (!isNaN(trackingNoNum)) {
    const qNumber = query(customersRef, where('trackingNo', '==', trackingNoNum), limit(1));
    const snapshotNumber = await getDocs(qNumber);

    if (!snapshotNumber.empty) {
      const doc = snapshotNumber.docs[0];
      return { id: doc.id, ...doc.data() } as Customer;
    }
  }

  return null;
}

/**
 * 顧客を名前で検索（前方一致）
 */
export async function searchCustomersByName(
  searchQuery: string,
  maxResults = 50
): Promise<Customer[]> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);
  const q = query(
    customersRef,
    where('name', '>=', searchQuery),
    where('name', '<=', searchQuery + '\uf8ff'),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Customer[];
}

/**
 * フリガナを正規化（カタカナに統一、スペース除去）
 */
function normalizeKana(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u3041-\u3096]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) + 0x60))
    .replace(/\s+/g, '')
    .trim();
}

/**
 * 名前を正規化（スペース除去）
 */
function normalizeName(str: string): string {
  if (!str) return '';
  return str.replace(/\s+/g, '').trim();
}

/**
 * 文字列の類似度を計算（レーベンシュタイン距離ベース）
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const len1 = str1.length;
  const len2 = str2.length;

  // 短い方が長い方に含まれていれば高スコア
  if (str2.includes(str1)) return 0.8;
  if (str1.includes(str2)) return 0.7;

  // 最初の2文字が一致すれば中程度のスコア
  if (len1 >= 2 && len2 >= 2 && str1.substring(0, 2) === str2.substring(0, 2)) {
    return 0.5;
  }

  // 最初の1文字が一致すれば低スコア
  if (str1[0] === str2[0]) {
    return 0.3;
  }

  return 0;
}

/**
 * 顧客をフリガナまたは名前であいまい検索
 * @param searchTerm 検索語（フリガナまたは名前）
 * @param maxResults 最大取得件数
 * @returns マッチした顧客の配列（スコア付き）
 */
export async function searchCustomersByFuzzy(
  searchTerm: string,
  maxResults = 50
): Promise<Customer[]> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);
  // Firestoreは全文検索ができないため、全件取得してフィルタリング
  const q = query(customersRef, limit(15000));
  const snapshot = await getDocs(q);

  const normalizedSearchTerm = normalizeKana(searchTerm);
  const normalizedSearchName = normalizeName(searchTerm);

  // 検索語を分割（姓名分離対応）
  const searchParts = searchTerm.trim().split(/\s+/).filter(p => p.length > 0);
  const searchPartsKana = searchParts.map(p => normalizeKana(p));

  console.log('[searchCustomersByFuzzy] Search term:', searchTerm);
  console.log('[searchCustomersByFuzzy] Normalized:', normalizedSearchTerm, normalizedSearchName);
  console.log('[searchCustomersByFuzzy] Total customers:', snapshot.docs.length);

  const customers = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Customer[];

  // スコアリング
  const scored = customers
    .map(customer => {
      let score = 0;
      const customerKana = normalizeKana(customer.nameKana || '');
      const customerName = normalizeName(customer.name || '');
      const trackingNo = String(customer.trackingNo || '');

      // trackingNoで検索（完全一致）
      if (trackingNo && (trackingNo === searchTerm || trackingNo === normalizedSearchName)) {
        score = 100;
      }
      // 完全一致（フリガナ）
      else if (customerKana && customerKana === normalizedSearchTerm) {
        score = 100;
      }
      // 完全一致（名前）
      else if (customerName && customerName === normalizedSearchName) {
        score = 95;
      }
      // 前方一致（フリガナ）
      else if (customerKana && normalizedSearchTerm && customerKana.startsWith(normalizedSearchTerm)) {
        score = 80;
      }
      // 前方一致（名前）
      else if (customerName && normalizedSearchName && customerName.startsWith(normalizedSearchName)) {
        score = 75;
      }
      // 部分一致（フリガナ）
      else if (customerKana && normalizedSearchTerm && customerKana.includes(normalizedSearchTerm)) {
        score = 60;
      }
      // 部分一致（名前）
      else if (customerName && normalizedSearchName && customerName.includes(normalizedSearchName)) {
        score = 55;
      }
      // 逆部分一致（検索語がフリガナに含まれる）
      else if (normalizedSearchTerm && customerKana && normalizedSearchTerm.includes(customerKana)) {
        score = 40;
      }
      // 逆部分一致（検索語が名前に含まれる）
      else if (normalizedSearchName && customerName && normalizedSearchName.includes(customerName)) {
        score = 35;
      }
      // 姓または名の一致（分割検索）
      else if (searchPartsKana.length > 0) {
        for (const part of searchPartsKana) {
          if (part.length >= 2) {
            if (customerKana && customerKana.includes(part)) {
              score = Math.max(score, 50);
            }
            if (customerName && customerName.includes(part)) {
              score = Math.max(score, 45);
            }
          }
        }
      }

      // 類似度ベースのスコアリング（上記でマッチしなかった場合）
      if (score === 0 && normalizedSearchTerm.length >= 2) {
        const kanaSimilarity = calculateSimilarity(normalizedSearchTerm, customerKana);
        const nameSimilarity = calculateSimilarity(normalizedSearchName, customerName);
        const maxSimilarity = Math.max(kanaSimilarity, nameSimilarity);
        if (maxSimilarity >= 0.5) {
          score = Math.round(maxSimilarity * 40);
        }
      }

      return { customer, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.customer);

  console.log('[searchCustomersByFuzzy] Found:', scored.length, 'matches');
  if (scored.length > 0) {
    console.log('[searchCustomersByFuzzy] Top match:', scored[0].name, scored[0].nameKana);
  }

  return scored;
}

/**
 * 顧客を更新
 * @param id 顧客ID
 * @param updates 更新データ
 * @param user 変更を行うユーザー（監査用、省略時は履歴記録なし）
 */
export async function updateCustomer(
  id: string,
  updates: Partial<Customer>,
  user?: AuditUser
): Promise<void> {
  const docRef = doc(db, CUSTOMERS_COLLECTION, id);

  // 監査用: 更新前のデータを取得
  let oldData: Customer | null = null;
  if (user) {
    oldData = await getCustomerById(id);
  }

  const updatedAt = new Date().toISOString();
  await updateDoc(docRef, {
    ...updates,
    updatedAt,
  });

  // 監査用: 変更履歴を記録
  if (user && oldData) {
    const newData = { ...oldData, ...updates, updatedAt };
    const changes = calculateChanges(
      oldData as unknown as Record<string, unknown>,
      newData as unknown as Record<string, unknown>
    );

    if (changes.length > 0) {
      await createHistoryEntry(
        'Customer',
        id,
        'update',
        changes,
        newData as unknown as Record<string, unknown>,
        user
      );
    }
  }
}

/**
 * 顧客を作成
 * @param customer 顧客データ
 * @param user 作成を行うユーザー（監査用、省略時は履歴記録なし）
 */
export async function createCustomer(
  customer: Omit<Customer, 'id'>,
  user?: AuditUser
): Promise<string> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);
  const createdAt = new Date().toISOString();
  const customerData = {
    ...customer,
    createdAt,
    updatedAt: createdAt,
  };

  const docRef = await addDoc(customersRef, customerData);

  // 監査用: 作成履歴を記録
  if (user) {
    const newData = { id: docRef.id, ...customerData };
    const changes = calculateChanges(
      null,
      newData as unknown as Record<string, unknown>
    );

    await createHistoryEntry(
      'Customer',
      docRef.id,
      'create',
      changes,
      newData as unknown as Record<string, unknown>,
      user
    );
  }

  return docRef.id;
}

/**
 * 顧客を削除
 * @param id 顧客ID
 * @param user 削除を行うユーザー（監査用、省略時は履歴記録なし）
 */
export async function deleteCustomer(id: string, user?: AuditUser): Promise<void> {
  const docRef = doc(db, CUSTOMERS_COLLECTION, id);

  // 監査用: 削除前のデータを取得
  let oldData: Customer | null = null;
  if (user) {
    oldData = await getCustomerById(id);
  }

  await deleteDoc(docRef);

  // 監査用: 削除履歴を記録
  if (user && oldData) {
    const changes = calculateChanges(
      oldData as unknown as Record<string, unknown>,
      {} as Record<string, unknown>
    );

    await createHistoryEntry(
      'Customer',
      id,
      'delete',
      changes,
      { deleted: true, deletedAt: new Date().toISOString() },
      user
    );
  }
}
