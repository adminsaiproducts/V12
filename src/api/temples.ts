/**
 * Temples API
 * 寺院マスターデータの取得
 */
import {
    collection,
    getDocs,
    query,
    orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Temple } from '../types/firestore';

const TEMPLES_COLLECTION = 'Temples';

/**
 * 寺院一覧を取得
 */
export async function getTemples(): Promise<Temple[]> {
    const templesRef = collection(db, TEMPLES_COLLECTION);
    const q = query(templesRef, orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Temple[];
}
