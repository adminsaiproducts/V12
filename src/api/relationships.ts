/**
 * 関係性API - Firestore CRUD操作
 * Updated: 2025-12-07 22:15 - customer_ prefix対応
 * Updated: 2025-12-11 - 監査証跡機能追加
 */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import relationshipTypesData from '../data/relationshipTypes.json';
import type { AuditUser } from '../types/audit';
import { createHistoryEntry } from './audit';
import { calculateChanges } from '../utils/diff';

// 関係性タイプ
export interface RelationshipType {
  code: string;
  name: string;
  category: string;
  reverseCode?: string;
  reverseName?: string;
}

// 関係性レコード
export interface Relationship {
  id: string;
  sourceCustomerId: string;
  targetCustomerId: string;
  relationshipType: string;
  relationshipName?: string;
  direction: 'forward' | 'reverse' | 'bidirectional';
  confidence: number;
  description?: string;
  needsManualResolution: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 関連顧客情報
export interface RelatedCustomer {
  relationship: Relationship;
  customer: {
    id: string;
    trackingNo: string;
    name: string;
    nameKana?: string;
    phone?: string;
    email?: string;
  };
}

// 関係性タイプマスタ（JSONファイルから読み込み）
// reverseNameはreverseCodeから逆引きして設定
const relationshipTypeMap = new Map<string, string>();
relationshipTypesData.forEach(rt => {
  relationshipTypeMap.set(rt.code, rt.name);
});

export const RELATIONSHIP_TYPES: RelationshipType[] = relationshipTypesData
  .filter(rt => rt.isActive)
  .map(rt => ({
    code: rt.code,
    name: rt.name,
    category: rt.category,
    reverseCode: rt.reverseCode,
    reverseName: relationshipTypeMap.get(rt.reverseCode) || rt.reverseCode,
  }));

// Firestoreコレクション
const RELATIONSHIPS_COLLECTION = 'Relationships';
const CUSTOMERS_COLLECTION = 'Customers';

/**
 * 関係性タイプを取得
 */
export function getRelationshipType(code: string): RelationshipType | undefined {
  return RELATIONSHIP_TYPES.find((t) => t.code === code);
}

/**
 * 関係性名を取得
 */
export function getRelationshipName(code: string): string {
  const type = getRelationshipType(code);
  return type?.name || code;
}

/**
 * 顧客の関係性を取得
 */
export async function getCustomerRelationships(customerId: string): Promise<RelatedCustomer[]> {
  console.log('[Relationships] getCustomerRelationships called with:', customerId);
  const relationshipsRef = collection(db, RELATIONSHIPS_COLLECTION);

  // customerIdから customer_ プレフィックス付きIDを生成
  // Firestoreには "customer_823" 形式で保存されているため
  const customerIdWithPrefix = customerId.startsWith('customer_')
    ? customerId
    : `customer_${customerId}`;
  console.log('[Relationships] customerIdWithPrefix:', customerIdWithPrefix);

  // sourceCustomerId/targetCustomerId または sourceTrackingNo/targetTrackingNo で検索
  // データは customer_XXX 形式で保存されているため、両方のパターンで検索
  const [
    sourceSnapshot,
    targetSnapshot,
    sourceWithPrefixSnapshot,
    targetWithPrefixSnapshot,
  ] = await Promise.all([
    // trackingNo形式で検索（customerId = "823" の場合）
    getDocs(query(
      relationshipsRef,
      where('sourceCustomerId', '==', customerId)
    )),
    getDocs(query(
      relationshipsRef,
      where('targetCustomerId', '==', customerId)
    )),
    // customer_XXX 形式で検索（実際のFirestoreデータ形式）
    getDocs(query(
      relationshipsRef,
      where('sourceCustomerId', '==', customerIdWithPrefix)
    )),
    getDocs(query(
      relationshipsRef,
      where('targetCustomerId', '==', customerIdWithPrefix)
    )),
  ]);

  console.log('[Relationships] Query results:', {
    sourceSnapshot: sourceSnapshot.size,
    targetSnapshot: targetSnapshot.size,
    sourceWithPrefixSnapshot: sourceWithPrefixSnapshot.size,
    targetWithPrefixSnapshot: targetWithPrefixSnapshot.size,
  });

  const relationships: Relationship[] = [];
  const addedIds = new Set<string>();

  // sourceCustomerId で見つかった関係性（順方向）
  // 通常形式とcustomer_プレフィックス形式の両方を結合
  [...sourceSnapshot.docs, ...sourceWithPrefixSnapshot.docs].forEach((doc) => {
    if (!addedIds.has(doc.id)) {
      relationships.push({ id: doc.id, ...doc.data() } as Relationship);
      addedIds.add(doc.id);
    }
  });

  // targetCustomerId で見つかった関係性（逆方向）
  // 通常形式とcustomer_プレフィックス形式の両方を結合
  [...targetSnapshot.docs, ...targetWithPrefixSnapshot.docs].forEach((doc) => {
    const data = doc.data();
    // 逆関係として追加（重複防止）
    if (!addedIds.has(doc.id)) {
      relationships.push({
        id: doc.id,
        ...data,
        // 逆方向なので関係性を逆転
        direction: 'reverse',
      } as Relationship);
      addedIds.add(doc.id);
    }
  });

  console.log('[Relationships] Found relationships count:', relationships.length);

  // 関連する顧客情報を取得
  const relatedCustomers: RelatedCustomer[] = [];
  // 重複表示防止用: 同じ顧客+同じ関係性タイプの組み合わせを追跡
  const addedRelationshipKeys = new Set<string>();

  for (const rel of relationships) {
    console.log('[Relationships] Processing relationship:', rel.id, rel);

    // 関連する顧客のIDを特定（customer_XXXX形式で格納されている）
    let targetCustomerIdValue: string;
    let displayRelationType: string;

    // 順方向の場合: 自分がsource → targetを探す
    // 逆方向の場合: 自分がtarget → sourceを探す
    if (rel.direction !== 'reverse') {
      // 順方向: targetを探す、関係性はそのまま
      targetCustomerIdValue = rel.targetCustomerId;
      displayRelationType = rel.relationshipType;
    } else {
      // 逆方向: sourceを探す、関係性は逆タイプ
      targetCustomerIdValue = rel.sourceCustomerId;
      const reverseType = getRelationshipType(rel.relationshipType);
      displayRelationType = reverseType?.reverseCode || rel.relationshipType;
    }

    // targetCustomerIdがnullまたは空の場合はスキップ
    // （関係性抽出時にマッチングできなかったデータ）
    if (!targetCustomerIdValue) {
      console.log('[Relationships] targetCustomerIdValue is null/empty, skipping. relationshipName:', rel.relationshipName);
      continue;
    }

    // customer_XXXX 形式から trackingNo を抽出
    // Firestoreには "customer_10114" で保存されているが、
    // Customersの trackingNo は "10114" で保存されている
    const normalizedTrackingNo = targetCustomerIdValue.startsWith('customer_')
      ? targetCustomerIdValue.replace('customer_', '')
      : targetCustomerIdValue;
    console.log('[Relationships] targetCustomerIdValue:', targetCustomerIdValue, '-> normalizedTrackingNo:', normalizedTrackingNo);

    // 同じ顧客+同じ関係性タイプの組み合わせは1つだけ表示
    // （双方向登録されている場合の重複防止）
    const relationshipKey = `${normalizedTrackingNo}|${displayRelationType}`;
    if (addedRelationshipKeys.has(relationshipKey)) {
      console.log('[Relationships] Duplicate relationship, skipping:', relationshipKey);
      continue;
    }
    addedRelationshipKeys.add(relationshipKey);

    try {
      // trackingNoで顧客を検索（正規化したtrackingNoを使用）
      const customersRef = collection(db, CUSTOMERS_COLLECTION);
      console.log('[Relationships] Searching customer with trackingNo (string):', normalizedTrackingNo);

      // 文字列と数値の両方でクエリを試みる（型の不整合対策）
      let customerSnapshot = await getDocs(
        query(customersRef, where('trackingNo', '==', normalizedTrackingNo))
      );
      console.log('[Relationships] String search result:', customerSnapshot.size);

      // 文字列で見つからない場合は数値でも検索
      if (customerSnapshot.empty) {
        const trackingNoNum = parseInt(normalizedTrackingNo, 10);
        console.log('[Relationships] Searching customer with trackingNo (number):', trackingNoNum);
        if (!isNaN(trackingNoNum)) {
          customerSnapshot = await getDocs(
            query(customersRef, where('trackingNo', '==', trackingNoNum))
          );
          console.log('[Relationships] Number search result:', customerSnapshot.size);
        }
      }

      if (!customerSnapshot.empty) {
        console.log('[Relationships] Customer found!');
        const customerDoc = customerSnapshot.docs[0];
        const customerData = customerDoc.data();

        // 関係性名を決定（逆方向の場合は逆関係名を使用）
        let displayRelationshipName = rel.relationshipName || getRelationshipName(rel.relationshipType);
        if (rel.direction === 'reverse') {
          const reverseType = getRelationshipType(rel.relationshipType);
          if (reverseType?.reverseName) {
            displayRelationshipName = reverseType.reverseName;
          }
        }

        relatedCustomers.push({
          relationship: {
            ...rel,
            relationshipName: displayRelationshipName,
          },
          customer: {
            id: customerDoc.id,
            trackingNo: customerData.trackingNo || '',
            name: customerData.name || '',
            nameKana: customerData.nameKana,
            phone: typeof customerData.phone === 'object'
              ? customerData.phone?.original
              : customerData.phone,
            email: customerData.email,
          },
        });
        console.log('[Relationships] Added to relatedCustomers, count:', relatedCustomers.length);
      } else {
        console.log('[Relationships] Customer NOT found for trackingNo:', normalizedTrackingNo);
      }
    } catch (err) {
      console.error('[Relationships] Error fetching related customer:', err);
    }
  }

  console.log('[Relationships] Final relatedCustomers count:', relatedCustomers.length);
  return relatedCustomers;
}

/**
 * 信頼度レベルを取得
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

/**
 * 信頼度の色を取得
 */
export function getConfidenceColor(confidence: number): 'success' | 'warning' | 'error' {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high': return 'success';
    case 'medium': return 'warning';
    case 'low': return 'error';
  }
}

// ========== CRUD操作 ==========

/**
 * 関係性作成用データ型
 */
export interface CreateRelationshipData {
  sourceCustomerId: string;
  targetCustomerId: string;
  relationshipType: string;
  confidence?: number;
  description?: string;
}

/**
 * 関係性更新用データ型
 */
export interface UpdateRelationshipData {
  relationshipType?: string;
  confidence?: number;
  description?: string;
}

/**
 * 次の関係性IDを生成
 */
async function getNextRelationshipId(): Promise<string> {
  const relationshipsRef = collection(db, RELATIONSHIPS_COLLECTION);
  const snapshot = await getDocs(
    query(relationshipsRef, orderBy('createdAt', 'desc'), limit(1))
  );

  if (snapshot.empty) {
    return 'rel_1';
  }

  // 最新のIDから次のIDを生成
  const latestId = snapshot.docs[0].id;
  const match = latestId.match(/rel_(\d+)/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `rel_${nextNum}`;
  }

  // フォールバック: タイムスタンプベース
  return `rel_${Date.now()}`;
}

/**
 * 顧客を検索（trackingNoまたはname）
 */
export async function searchCustomers(searchText: string): Promise<Array<{
  id: string;
  trackingNo: string;
  name: string;
  nameKana?: string;
}>> {
  if (!searchText || searchText.length < 1) {
    return [];
  }

  const customersRef = collection(db, CUSTOMERS_COLLECTION);
  const results: Array<{
    id: string;
    trackingNo: string;
    name: string;
    nameKana?: string;
  }> = [];

  // trackingNoで完全一致検索
  const trackingNoSnapshot = await getDocs(
    query(customersRef, where('trackingNo', '==', searchText))
  );
  trackingNoSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    results.push({
      id: doc.id,
      trackingNo: String(data.trackingNo || ''),
      name: data.name || '',
      nameKana: data.nameKana,
    });
  });

  // 数値でも検索（trackingNoが数値の場合）
  const trackingNoNum = parseInt(searchText, 10);
  if (!isNaN(trackingNoNum)) {
    const trackingNoNumSnapshot = await getDocs(
      query(customersRef, where('trackingNo', '==', trackingNoNum))
    );
    trackingNoNumSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // 重複チェック
      if (!results.find(r => r.id === doc.id)) {
        results.push({
          id: doc.id,
          trackingNo: String(data.trackingNo || ''),
          name: data.name || '',
          nameKana: data.nameKana,
        });
      }
    });
  }

  // 名前で部分一致検索（先頭一致のみFirestoreでサポート）
  // 日本語の部分一致はFirestoreでは難しいので、
  // ここでは取得したものをフィルタリングするのではなく、
  // 最大100件取得して名前でフィルタリング
  if (results.length < 10) {
    const allCustomersSnapshot = await getDocs(
      query(customersRef, orderBy('trackingNo', 'desc'), limit(500))
    );
    const searchLower = searchText.toLowerCase();
    allCustomersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const name = (data.name || '').toLowerCase();
      const nameKana = (data.nameKana || '').toLowerCase();
      if (
        (name.includes(searchLower) || nameKana.includes(searchLower)) &&
        !results.find(r => r.id === doc.id)
      ) {
        results.push({
          id: doc.id,
          trackingNo: String(data.trackingNo || ''),
          name: data.name || '',
          nameKana: data.nameKana,
        });
      }
    });
  }

  return results.slice(0, 20); // 最大20件
}

/**
 * 関係性を作成
 * @param data 関係性データ
 * @param user 作成を行うユーザー（監査用、省略時は履歴記録なし）
 */
export async function createRelationship(
  data: CreateRelationshipData,
  user?: AuditUser
): Promise<string> {
  const relationshipsRef = collection(db, RELATIONSHIPS_COLLECTION);

  // 関係性タイプ情報を取得
  const relType = getRelationshipType(data.relationshipType);

  // sourceCustomerId と targetCustomerId を customer_XXXX 形式に正規化
  const normalizeCustomerId = (id: string): string => {
    if (id.startsWith('customer_')) return id;
    return `customer_${id}`;
  };

  const sourceId = normalizeCustomerId(data.sourceCustomerId);
  const targetId = normalizeCustomerId(data.targetCustomerId);

  // 次のIDを生成
  const newId = await getNextRelationshipId();
  const createdAt = new Date().toISOString();

  // 関係性を作成
  const relationshipData = {
    sourceCustomerId: sourceId,
    targetCustomerId: targetId,
    relationshipType: data.relationshipType,
    relationshipName: relType?.name || data.relationshipType,
    direction: 'forward',
    confidence: data.confidence ?? 1.0,
    description: data.description || '',
    needsManualResolution: false,
    extractionSource: 'manual',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // カスタムIDでドキュメントを作成
  const docRef = doc(db, RELATIONSHIPS_COLLECTION, newId);
  await updateDoc(docRef, relationshipData).catch(async () => {
    // ドキュメントが存在しない場合は addDoc を使用
    await addDoc(relationshipsRef, { ...relationshipData, id: newId });
  });

  // 監査用: 作成履歴を記録
  if (user) {
    const newData = {
      id: newId,
      ...relationshipData,
      createdAt,
      updatedAt: createdAt,
    };
    const changes = calculateChanges(
      null,
      newData as unknown as Record<string, unknown>
    );

    await createHistoryEntry(
      'Relationship',
      newId,
      'create',
      changes,
      newData as unknown as Record<string, unknown>,
      user
    );
  }

  // 逆関係も自動作成（双方向関係の場合）
  if (relType?.reverseCode && relType.reverseCode !== data.relationshipType) {
    const reverseId = await getNextRelationshipId();
    const reverseRelType = getRelationshipType(relType.reverseCode);
    const reverseData = {
      sourceCustomerId: targetId,
      targetCustomerId: sourceId,
      relationshipType: relType.reverseCode,
      relationshipName: reverseRelType?.name || relType.reverseName || relType.reverseCode,
      direction: 'forward',
      confidence: data.confidence ?? 1.0,
      description: data.description || '',
      needsManualResolution: false,
      extractionSource: 'manual',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const reverseDocRef = doc(db, RELATIONSHIPS_COLLECTION, reverseId);
    await updateDoc(reverseDocRef, reverseData).catch(async () => {
      await addDoc(relationshipsRef, { ...reverseData, id: reverseId });
    });

    // 監査用: 逆関係の作成履歴も記録
    if (user) {
      const reverseNewData = {
        id: reverseId,
        ...reverseData,
        createdAt,
        updatedAt: createdAt,
      };
      const reverseChanges = calculateChanges(
        null,
        reverseNewData as unknown as Record<string, unknown>
      );

      await createHistoryEntry(
        'Relationship',
        reverseId,
        'create',
        reverseChanges,
        reverseNewData as unknown as Record<string, unknown>,
        user
      );
    }
  }

  return newId;
}

/**
 * 関係性を更新
 * @param relationshipId 関係性ID
 * @param data 更新データ
 * @param user 変更を行うユーザー（監査用、省略時は履歴記録なし）
 */
export async function updateRelationship(
  relationshipId: string,
  data: UpdateRelationshipData,
  user?: AuditUser
): Promise<void> {
  const docRef = doc(db, RELATIONSHIPS_COLLECTION, relationshipId);

  // 監査用: 更新前のデータを取得
  let oldData: Relationship | null = null;
  if (user) {
    oldData = await getRelationship(relationshipId);
  }

  const updatedAt = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (data.relationshipType !== undefined) {
    const relType = getRelationshipType(data.relationshipType);
    updateData.relationshipType = data.relationshipType;
    updateData.relationshipName = relType?.name || data.relationshipType;
  }

  if (data.confidence !== undefined) {
    updateData.confidence = data.confidence;
  }

  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  await updateDoc(docRef, updateData);

  // 監査用: 変更履歴を記録
  if (user && oldData) {
    const newData = { ...oldData, ...updateData, updatedAt };
    const changes = calculateChanges(
      oldData as unknown as Record<string, unknown>,
      newData as unknown as Record<string, unknown>
    );

    if (changes.length > 0) {
      await createHistoryEntry(
        'Relationship',
        relationshipId,
        'update',
        changes,
        newData as unknown as Record<string, unknown>,
        user
      );
    }
  }
}

/**
 * 関係性を削除
 * @param relationshipId 関係性ID
 * @param user 削除を行うユーザー（監査用、省略時は履歴記録なし）
 */
export async function deleteRelationship(
  relationshipId: string,
  user?: AuditUser
): Promise<void> {
  const docRef = doc(db, RELATIONSHIPS_COLLECTION, relationshipId);

  // 削除前に関係性データを取得（逆関係も削除するため）
  const docSnapshot = await getDoc(docRef);
  if (docSnapshot.exists()) {
    const data = docSnapshot.data();
    const relType = getRelationshipType(data.relationshipType);

    // 逆関係を検索して削除
    if (relType?.reverseCode) {
      const relationshipsRef = collection(db, RELATIONSHIPS_COLLECTION);
      const reverseSnapshot = await getDocs(
        query(
          relationshipsRef,
          where('sourceCustomerId', '==', data.targetCustomerId),
          where('targetCustomerId', '==', data.sourceCustomerId),
          where('relationshipType', '==', relType.reverseCode)
        )
      );
      for (const reverseDoc of reverseSnapshot.docs) {
        // 監査用: 逆関係の削除履歴を記録
        if (user) {
          const reverseData = reverseDoc.data();
          const reverseChanges = calculateChanges(
            reverseData as unknown as Record<string, unknown>,
            {} as Record<string, unknown>
          );
          await createHistoryEntry(
            'Relationship',
            reverseDoc.id,
            'delete',
            reverseChanges,
            { deleted: true, deletedAt: new Date().toISOString() },
            user
          );
        }
        await deleteDoc(doc(db, RELATIONSHIPS_COLLECTION, reverseDoc.id));
      }
    }

    // 監査用: 本体の削除履歴を記録
    if (user) {
      const changes = calculateChanges(
        data as unknown as Record<string, unknown>,
        {} as Record<string, unknown>
      );
      await createHistoryEntry(
        'Relationship',
        relationshipId,
        'delete',
        changes,
        { deleted: true, deletedAt: new Date().toISOString() },
        user
      );
    }
  }

  // 本体を削除
  await deleteDoc(docRef);
}

/**
 * 関係性を取得
 */
export async function getRelationship(relationshipId: string): Promise<Relationship | null> {
  const docRef = doc(db, RELATIONSHIPS_COLLECTION, relationshipId);
  const docSnapshot = await getDoc(docRef);

  if (!docSnapshot.exists()) {
    return null;
  }

  return {
    id: docSnapshot.id,
    ...docSnapshot.data(),
  } as Relationship;
}
