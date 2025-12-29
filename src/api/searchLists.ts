/**
 * 検索条件リスト API
 * Firestoreの CustomerSearchLists コレクションを操作
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { CustomerSearchList, FilterConditionGroup } from '../types/searchList';
import { SYSTEM_LISTS } from '../types/searchList';

const COLLECTION_NAME = 'CustomerSearchLists';

/**
 * Firestoreタイムスタンプを文字列に変換
 */
function convertTimestamp(timestamp: unknown): string {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return new Date().toISOString();
}

/**
 * すべての検索リストを取得（システム定義 + カスタム）
 */
export async function getAllSearchLists(): Promise<CustomerSearchList[]> {
  const now = new Date().toISOString();

  // システム定義リスト
  const systemLists: CustomerSearchList[] = SYSTEM_LISTS.map(list => ({
    ...list,
    createdAt: now,
    updatedAt: now,
  }));

  // Firestoreからカスタムリストを取得
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const customLists: CustomerSearchList[] = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || '',
      description: data.description,
      isSystem: false,
      conditionGroups: data.conditionGroups || [],
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      createdBy: data.createdBy,
    };
  });

  return [...systemLists, ...customLists];
}

/**
 * 検索リストを取得
 */
export async function getSearchList(id: string): Promise<CustomerSearchList | null> {
  // システムリストをチェック
  const systemList = SYSTEM_LISTS.find(list => list.id === id);
  if (systemList) {
    const now = new Date().toISOString();
    return {
      ...systemList,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Firestoreから取得
  const docRef = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name || '',
    description: data.description,
    isSystem: false,
    conditionGroups: data.conditionGroups || [],
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    createdBy: data.createdBy,
  };
}

/**
 * 検索リストを作成
 */
export async function createSearchList(
  name: string,
  conditionGroups: FilterConditionGroup[],
  description?: string
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    name,
    description: description || null,
    conditionGroups,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * 検索リストを更新
 */
export async function updateSearchList(
  id: string,
  updates: {
    name?: string;
    description?: string;
    conditionGroups?: FilterConditionGroup[];
  }
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 検索リストを削除
 */
export async function deleteSearchList(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
