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
import type { BurialPerson } from '../types/firestore';

const BURIAL_PERSONS_COLLECTION = 'BurialPersons';

/**
 * 埋葬者一覧を取得
 */
export async function getBurialPersons(maxResults = 100): Promise<BurialPerson[]> {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  const q = query(personsRef, orderBy('genieCreatedAt', 'desc'), limit(maxResults));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as BurialPerson[];
}

/**
 * 埋葬者をリアルタイムで監視
 */
export function subscribeToBurialPersons(
  callback: (persons: BurialPerson[]) => void,
  maxResults = 100
): Unsubscribe {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  const q = query(personsRef, orderBy('genieCreatedAt', 'desc'), limit(maxResults));

  return onSnapshot(q, (snapshot) => {
    const persons = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BurialPerson[];
    callback(persons);
  });
}

/**
 * 埋葬者をIDで取得
 */
export async function getBurialPersonById(id: string): Promise<BurialPerson | null> {
  const docRef = doc(db, BURIAL_PERSONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as BurialPerson;
  }
  return null;
}

/**
 * geniee CRMのレコードIDで埋葬者を取得
 */
export async function getBurialPersonByRecordId(recordId: string): Promise<BurialPerson | null> {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  const q = query(personsRef, where('recordId', '==', recordId), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.docs.length > 0) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as BurialPerson;
  }
  return null;
}

/**
 * 埋葬有無で埋葬者を取得
 */
export async function getBurialPersonsByBurialStatus(burialStatus: string): Promise<BurialPerson[]> {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  const q = query(
    personsRef,
    where('burialStatus', '==', burialStatus),
    orderBy('genieCreatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as BurialPerson[];
}

/**
 * 拠点で埋葬者を取得
 */
export async function getBurialPersonsByLocation(location: string): Promise<BurialPerson[]> {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  const q = query(
    personsRef,
    where('location', '==', location),
    orderBy('genieCreatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as BurialPerson[];
}

/**
 * 紐づけ済みの顧客IDで埋葬者を取得
 */
export async function getBurialPersonsByCustomerId(customerId: string): Promise<BurialPerson[]> {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  const q = query(
    personsRef,
    where('linkedCustomerId', '==', customerId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as BurialPerson[];
}

/**
 * 紐づけ済みの樹木墓商談IDで埋葬者を取得
 */
export async function getBurialPersonsByTreeBurialDealId(dealId: string): Promise<BurialPerson[]> {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  const q = query(
    personsRef,
    where('linkedTreeBurialDealId', '==', dealId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as BurialPerson[];
}

/**
 * 埋葬者を更新
 */
export async function updateBurialPerson(
  id: string,
  updates: Partial<BurialPerson>
): Promise<void> {
  const docRef = doc(db, BURIAL_PERSONS_COLLECTION, id);
  const updatedAt = new Date().toISOString();
  await updateDoc(docRef, {
    ...updates,
    updatedAt,
  });
}

/**
 * 埋葬者を作成
 */
export async function createBurialPerson(
  person: Omit<BurialPerson, 'id'>
): Promise<string> {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  const createdAt = new Date().toISOString();
  const personData = {
    ...person,
    createdAt,
    updatedAt: createdAt,
  };

  const docRef = await addDoc(personsRef, personData);
  return docRef.id;
}

/**
 * 埋葬者を削除
 */
export async function deleteBurialPerson(id: string): Promise<void> {
  const docRef = doc(db, BURIAL_PERSONS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * 埋葬者を一括作成（インポート用）
 */
export async function batchCreateBurialPersons(
  persons: Omit<BurialPerson, 'id'>[]
): Promise<number> {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  const createdAt = new Date().toISOString();
  let count = 0;

  // Firestoreのバッチは500件まで
  const batchSize = 500;
  for (let i = 0; i < persons.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = persons.slice(i, i + batchSize);

    for (const person of chunk) {
      const docRef = doc(personsRef);
      batch.set(docRef, {
        ...person,
        createdAt,
        updatedAt: createdAt,
      });
      count++;
    }

    await batch.commit();
    console.log(`[batchCreateBurialPersons] Committed ${Math.min(i + batchSize, persons.length)} / ${persons.length}`);
  }

  return count;
}

/**
 * 顧客と埋葬者を紐づけ
 */
export async function linkBurialPersonToCustomer(
  personId: string,
  customerId: string,
  customerTrackingNo: string
): Promise<void> {
  await updateBurialPerson(personId, {
    linkedCustomerId: customerId,
    linkedCustomerTrackingNo: customerTrackingNo,
  });
}

/**
 * 樹木墓商談と埋葬者を紐づけ
 */
export async function linkBurialPersonToTreeBurialDeal(
  personId: string,
  dealId: string
): Promise<void> {
  await updateBurialPerson(personId, {
    linkedTreeBurialDealId: dealId,
  });
}

/**
 * 使用者名または埋葬者名で検索
 */
export async function searchBurialPersons(searchTerm: string): Promise<BurialPerson[]> {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  // Firestoreは部分一致検索ができないため、全件取得してフィルタ
  const q = query(personsRef, orderBy('genieCreatedAt', 'desc'), limit(10000));
  const snapshot = await getDocs(q);
  const persons = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as BurialPerson[];

  const term = searchTerm.toLowerCase();
  return persons.filter(person =>
    person.userName?.toLowerCase().includes(term) ||
    person.userNameKana?.toLowerCase().includes(term) ||
    person.buriedPersonName?.toLowerCase().includes(term) ||
    person.buriedPersonNameKana?.toLowerCase().includes(term) ||
    person.dealName?.toLowerCase().includes(term)
  );
}

/**
 * 全埋葬者を削除（データ再インポート用）
 */
export async function deleteAllBurialPersons(): Promise<number> {
  const personsRef = collection(db, BURIAL_PERSONS_COLLECTION);
  const snapshot = await getDocs(personsRef);
  let count = 0;

  const batchSize = 500;
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(i, i + batchSize);

    for (const doc of chunk) {
      batch.delete(doc.ref);
      count++;
    }

    await batch.commit();
    console.log(`[deleteAllBurialPersons] Deleted ${Math.min(i + batchSize, snapshot.docs.length)} / ${snapshot.docs.length}`);
  }

  return count;
}
