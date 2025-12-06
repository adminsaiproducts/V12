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
 */
export async function getCustomerByTrackingNo(
  trackingNo: string
): Promise<Customer | null> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);
  const q = query(customersRef, where('trackingNo', '==', trackingNo), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Customer;
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
 * 顧客を更新
 */
export async function updateCustomer(
  id: string,
  updates: Partial<Customer>
): Promise<void> {
  const docRef = doc(db, CUSTOMERS_COLLECTION, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * 顧客を作成
 */
export async function createCustomer(
  customer: Omit<Customer, 'id'>
): Promise<string> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);
  const docRef = await addDoc(customersRef, {
    ...customer,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * 顧客を削除
 */
export async function deleteCustomer(id: string): Promise<void> {
  const docRef = doc(db, CUSTOMERS_COLLECTION, id);
  await deleteDoc(docRef);
}
