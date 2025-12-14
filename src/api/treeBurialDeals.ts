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
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { TreeBurialDeal, TreeBurialDealStatus } from '../types/firestore';

const TREE_BURIAL_DEALS_COLLECTION = 'TreeBurialDeals';

/**
 * 樹木墓商談一覧を取得
 */
export async function getTreeBurialDeals(maxResults = 100): Promise<TreeBurialDeal[]> {
  const dealsRef = collection(db, TREE_BURIAL_DEALS_COLLECTION);
  const q = query(dealsRef, orderBy('genieCreatedAt', 'desc'), limit(maxResults));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TreeBurialDeal[];
}

/**
 * 樹木墓商談をリアルタイムで監視
 */
export function subscribeToTreeBurialDeals(
  callback: (deals: TreeBurialDeal[]) => void,
  maxResults = 100
): Unsubscribe {
  const dealsRef = collection(db, TREE_BURIAL_DEALS_COLLECTION);
  const q = query(dealsRef, orderBy('genieCreatedAt', 'desc'), limit(maxResults));

  return onSnapshot(q, (snapshot) => {
    const deals = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TreeBurialDeal[];
    callback(deals);
  });
}

/**
 * 樹木墓商談をIDで取得
 */
export async function getTreeBurialDealById(id: string): Promise<TreeBurialDeal | null> {
  const docRef = doc(db, TREE_BURIAL_DEALS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as TreeBurialDeal;
  }
  return null;
}

/**
 * geniee CRMのレコードIDで樹木墓商談を取得
 */
export async function getTreeBurialDealByRecordId(recordId: string): Promise<TreeBurialDeal | null> {
  const dealsRef = collection(db, TREE_BURIAL_DEALS_COLLECTION);
  const q = query(dealsRef, where('recordId', '==', recordId), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.docs.length > 0) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as TreeBurialDeal;
  }
  return null;
}

/**
 * ステータスで樹木墓商談を取得
 */
export async function getTreeBurialDealsByStatus(status: TreeBurialDealStatus): Promise<TreeBurialDeal[]> {
  const dealsRef = collection(db, TREE_BURIAL_DEALS_COLLECTION);
  const q = query(
    dealsRef,
    where('status', '==', status),
    orderBy('genieCreatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TreeBurialDeal[];
}

/**
 * 拠点で樹木墓商談を取得
 */
export async function getTreeBurialDealsByLocation(location: string): Promise<TreeBurialDeal[]> {
  const dealsRef = collection(db, TREE_BURIAL_DEALS_COLLECTION);
  const q = query(
    dealsRef,
    where('location', '==', location),
    orderBy('genieCreatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TreeBurialDeal[];
}

/**
 * 紐づけ済みの顧客IDで樹木墓商談を取得
 */
export async function getTreeBurialDealsByCustomerId(customerId: string): Promise<TreeBurialDeal[]> {
  const dealsRef = collection(db, TREE_BURIAL_DEALS_COLLECTION);
  const q = query(
    dealsRef,
    where('linkedCustomerId', '==', customerId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TreeBurialDeal[];
}

/**
 * 樹木墓商談を更新
 */
export async function updateTreeBurialDeal(
  id: string,
  updates: Partial<TreeBurialDeal>
): Promise<void> {
  const docRef = doc(db, TREE_BURIAL_DEALS_COLLECTION, id);
  const updatedAt = new Date().toISOString();
  await updateDoc(docRef, {
    ...updates,
    updatedAt,
  });
}

/**
 * 樹木墓商談を作成
 */
export async function createTreeBurialDeal(
  deal: Omit<TreeBurialDeal, 'id'>
): Promise<string> {
  const dealsRef = collection(db, TREE_BURIAL_DEALS_COLLECTION);
  const createdAt = new Date().toISOString();
  const dealData = {
    ...deal,
    createdAt,
    updatedAt: createdAt,
  };

  const docRef = await addDoc(dealsRef, dealData);
  return docRef.id;
}

/**
 * 樹木墓商談を削除
 */
export async function deleteTreeBurialDeal(id: string): Promise<void> {
  const docRef = doc(db, TREE_BURIAL_DEALS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * 樹木墓商談を一括作成（インポート用）
 */
export async function batchCreateTreeBurialDeals(
  deals: Omit<TreeBurialDeal, 'id'>[]
): Promise<number> {
  const batch = writeBatch(db);
  const dealsRef = collection(db, TREE_BURIAL_DEALS_COLLECTION);
  const createdAt = new Date().toISOString();
  let count = 0;

  for (const deal of deals) {
    const docRef = doc(dealsRef);
    batch.set(docRef, {
      ...deal,
      createdAt,
      updatedAt: createdAt,
    });
    count++;

    // Firestoreのバッチは500件まで
    if (count % 500 === 0) {
      await batch.commit();
    }
  }

  // 残りをコミット
  if (count % 500 !== 0) {
    await batch.commit();
  }

  return count;
}

/**
 * 顧客と樹木墓商談を紐づけ
 */
export async function linkTreeBurialDealToCustomer(
  dealId: string,
  customerId: string,
  customerTrackingNo: string
): Promise<void> {
  await updateTreeBurialDeal(dealId, {
    linkedCustomerId: customerId,
    linkedCustomerTrackingNo: customerTrackingNo,
  });
}

/**
 * 使用者名で樹木墓商談を検索
 */
export async function searchTreeBurialDealsByUserName(userName: string): Promise<TreeBurialDeal[]> {
  const dealsRef = collection(db, TREE_BURIAL_DEALS_COLLECTION);
  // Firestoreは部分一致検索ができないため、全件取得してフィルタ
  const q = query(dealsRef, orderBy('genieCreatedAt', 'desc'), limit(10000));
  const snapshot = await getDocs(q);
  const deals = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TreeBurialDeal[];

  const searchTerm = userName.toLowerCase();
  return deals.filter(deal =>
    deal.userName?.toLowerCase().includes(searchTerm) ||
    deal.userNameKana?.toLowerCase().includes(searchTerm) ||
    deal.dealName?.toLowerCase().includes(searchTerm)
  );
}

/**
 * 顧客と紐づいていない樹木墓商談を取得
 */
export async function getUnlinkedTreeBurialDeals(): Promise<TreeBurialDeal[]> {
  const dealsRef = collection(db, TREE_BURIAL_DEALS_COLLECTION);
  // linkedCustomerIdがnullまたは空の商談を取得
  // Firestoreの制限でnullクエリが難しいため、全件取得してフィルタ
  const q = query(dealsRef, orderBy('userName', 'asc'), limit(10000));
  const snapshot = await getDocs(q);
  const deals = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TreeBurialDeal[];

  return deals.filter(deal => !deal.linkedCustomerId);
}

/**
 * 顧客との紐づけを解除
 */
export async function unlinkTreeBurialDealFromCustomer(dealId: string): Promise<void> {
  const docRef = doc(db, TREE_BURIAL_DEALS_COLLECTION, dealId);
  await updateDoc(docRef, {
    linkedCustomerId: null,
    linkedCustomerTrackingNo: null,
    updatedAt: new Date().toISOString(),
  });
}
