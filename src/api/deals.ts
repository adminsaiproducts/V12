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
import type { Deal, DealStage } from '../types/firestore';
import type { AuditUser } from '../types/audit';
import { createHistoryEntry } from './audit';
import { calculateChanges } from '../utils/diff';

const DEALS_COLLECTION = 'Deals';

/**
 * 商談一覧を取得
 */
export async function getDeals(maxResults = 100): Promise<Deal[]> {
  const dealsRef = collection(db, DEALS_COLLECTION);
  const q = query(dealsRef, orderBy('createdAt', 'desc'), limit(maxResults));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Deal[];
}

/**
 * 商談をリアルタイムで監視
 */
export function subscribeToDeals(
  callback: (deals: Deal[]) => void,
  maxResults = 100
): Unsubscribe {
  const dealsRef = collection(db, DEALS_COLLECTION);
  const q = query(dealsRef, orderBy('createdAt', 'desc'), limit(maxResults));

  return onSnapshot(q, (snapshot) => {
    const deals = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Deal[];
    callback(deals);
  });
}

/**
 * 商談をIDで取得
 */
export async function getDealById(id: string): Promise<Deal | null> {
  const docRef = doc(db, DEALS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Deal;
  }
  return null;
}

/**
 * 顧客IDで商談を取得
 */
export async function getDealsByCustomerId(customerId: string): Promise<Deal[]> {
  const dealsRef = collection(db, DEALS_COLLECTION);
  const q = query(
    dealsRef,
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Deal[];
}

/**
 * 顧客のtrackingNoで商談を取得
 * 注意: 複合インデックスが不要なようにクライアント側でソート
 */
export async function getDealsByCustomerTrackingNo(trackingNo: string): Promise<Deal[]> {
  const dealsRef = collection(db, DEALS_COLLECTION);
  const q = query(
    dealsRef,
    where('customerTrackingNo', '==', trackingNo)
  );
  const snapshot = await getDocs(q);
  const deals = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Deal[];

  // クライアント側でcreatedAtの降順でソート
  return deals.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * 顧客の商談をリアルタイムで監視
 */
export function subscribeToDealsByCustomerId(
  customerId: string,
  callback: (deals: Deal[]) => void
): Unsubscribe {
  const dealsRef = collection(db, DEALS_COLLECTION);
  const q = query(
    dealsRef,
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const deals = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Deal[];
    callback(deals);
  });
}

/**
 * ステージで商談を取得
 */
export async function getDealsByStage(stage: DealStage): Promise<Deal[]> {
  const dealsRef = collection(db, DEALS_COLLECTION);
  const q = query(
    dealsRef,
    where('stage', '==', stage),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Deal[];
}

/**
 * 寺院IDで商談を取得
 */
export async function getDealsByTempleId(templeId: string): Promise<Deal[]> {
  const dealsRef = collection(db, DEALS_COLLECTION);
  const q = query(
    dealsRef,
    where('templeId', '==', templeId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Deal[];
}

/**
 * 商談を更新
 * @param id 商談ID
 * @param updates 更新データ
 * @param user 変更を行うユーザー（監査用、省略時は履歴記録なし）
 */
export async function updateDeal(
  id: string,
  updates: Partial<Deal>,
  user?: AuditUser
): Promise<void> {
  const docRef = doc(db, DEALS_COLLECTION, id);

  // 監査用: 更新前のデータを取得
  let oldData: Deal | null = null;
  if (user) {
    try {
      oldData = await getDealById(id);
    } catch (error) {
      console.error('[deals] Failed to get old data for audit:', error);
    }
  }

  const updatedAt = new Date().toISOString();
  await updateDoc(docRef, {
    ...updates,
    updatedAt,
  });

  // 監査用: 変更履歴を記録（エラーが発生しても本体の更新は成功とする）
  if (user && oldData) {
    try {
      const newData = { ...oldData, ...updates, updatedAt };
      const changes = calculateChanges(
        oldData as unknown as Record<string, unknown>,
        newData as unknown as Record<string, unknown>
      );

      if (changes.length > 0) {
        await createHistoryEntry(
          'Deal',
          id,
          'update',
          changes,
          newData as unknown as Record<string, unknown>,
          user
        );
      }
    } catch (error) {
      console.error('[deals] Failed to create history entry:', error);
      // 履歴記録に失敗しても、本体の更新は成功しているので例外を投げない
    }
  }
}

/**
 * 商談を作成
 * 顧客情報（customerId, customerTrackingNo, customerName）は必須
 * @param deal 商談データ
 * @param user 作成を行うユーザー（監査用、省略時は履歴記録なし）
 */
export async function createDeal(
  deal: Omit<Deal, 'id'>,
  user?: AuditUser
): Promise<string> {
  // 顧客情報の必須チェック
  if (!deal.customerId || !deal.customerTrackingNo || !deal.customerName) {
    throw new Error('顧客情報（customerId, customerTrackingNo, customerName）は必須です');
  }

  const dealsRef = collection(db, DEALS_COLLECTION);
  const createdAt = new Date().toISOString();
  const dealData = {
    ...deal,
    createdAt,
    updatedAt: createdAt,
  };

  const docRef = await addDoc(dealsRef, dealData);

  // 監査用: 作成履歴を記録
  if (user) {
    const newData = { id: docRef.id, ...dealData };
    const changes = calculateChanges(
      null,
      newData as unknown as Record<string, unknown>
    );

    await createHistoryEntry(
      'Deal',
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
 * 商談を削除
 * @param id 商談ID
 * @param user 削除を行うユーザー（監査用、省略時は履歴記録なし）
 */
export async function deleteDeal(id: string, user?: AuditUser): Promise<void> {
  const docRef = doc(db, DEALS_COLLECTION, id);

  // 監査用: 削除前のデータを取得
  let oldData: Deal | null = null;
  if (user) {
    oldData = await getDealById(id);
  }

  await deleteDoc(docRef);

  // 監査用: 削除履歴を記録
  if (user && oldData) {
    const changes = calculateChanges(
      oldData as unknown as Record<string, unknown>,
      {} as Record<string, unknown>
    );

    await createHistoryEntry(
      'Deal',
      id,
      'delete',
      changes,
      { deleted: true, deletedAt: new Date().toISOString() },
      user
    );
  }
}

/**
 * 商談のステージを更新
 * @param id 商談ID
 * @param stage 新しいステージ
 * @param user 変更を行うユーザー（監査用、省略時は履歴記録なし）
 */
export async function updateDealStage(
  id: string,
  stage: DealStage,
  user?: AuditUser
): Promise<void> {
  // updateDealを使用して監査機能を統一
  await updateDeal(id, { stage }, user);
}
