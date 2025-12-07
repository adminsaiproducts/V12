/**
 * 関係性API - Firestore CRUD操作
 */

import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';

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

// 関係性タイプマスタ（主要なもの）
export const RELATIONSHIP_TYPES: RelationshipType[] = [
  // 家族関係
  { code: 'KAN1001', name: '配偶者', category: '家族関係', reverseCode: 'KAN1001', reverseName: '配偶者' },
  { code: 'KAN1002', name: '父', category: '家族関係', reverseCode: 'KAN1003', reverseName: '子' },
  { code: 'KAN1003', name: '子', category: '家族関係', reverseCode: 'KAN1002', reverseName: '父' },
  { code: 'KAN1004', name: '母', category: '家族関係', reverseCode: 'KAN1003', reverseName: '子' },
  { code: 'KAN1005', name: '兄', category: '家族関係', reverseCode: 'KAN1006', reverseName: '弟' },
  { code: 'KAN1006', name: '弟', category: '家族関係', reverseCode: 'KAN1005', reverseName: '兄' },
  { code: 'KAN1007', name: '姉', category: '家族関係', reverseCode: 'KAN1008', reverseName: '妹' },
  { code: 'KAN1008', name: '妹', category: '家族関係', reverseCode: 'KAN1007', reverseName: '姉' },
  { code: 'KAN1009', name: '兄弟姉妹', category: '家族関係', reverseCode: 'KAN1009', reverseName: '兄弟姉妹' },
  // 親族関係
  { code: 'KAN1101', name: '祖父', category: '親族関係', reverseCode: 'KAN1103', reverseName: '孫' },
  { code: 'KAN1102', name: '祖母', category: '親族関係', reverseCode: 'KAN1103', reverseName: '孫' },
  { code: 'KAN1103', name: '孫', category: '親族関係', reverseCode: 'KAN1101', reverseName: '祖父母' },
  { code: 'KAN1104', name: '叔父', category: '親族関係', reverseCode: 'KAN1106', reverseName: '甥姪' },
  { code: 'KAN1105', name: '叔母', category: '親族関係', reverseCode: 'KAN1106', reverseName: '甥姪' },
  { code: 'KAN1106', name: '甥', category: '親族関係', reverseCode: 'KAN1104', reverseName: '叔父' },
  { code: 'KAN1107', name: '姪', category: '親族関係', reverseCode: 'KAN1105', reverseName: '叔母' },
  // その他
  { code: 'KAN1201', name: '友人', category: 'その他', reverseCode: 'KAN1201', reverseName: '友人' },
  { code: 'KAN1202', name: '知人', category: 'その他', reverseCode: 'KAN1202', reverseName: '知人' },
  { code: 'KAN1203', name: '紹介者', category: 'その他', reverseCode: 'KAN1204', reverseName: '被紹介者' },
  { code: 'KAN1204', name: '被紹介者', category: 'その他', reverseCode: 'KAN1203', reverseName: '紹介者' },
  { code: 'KAN9999', name: 'その他', category: 'その他', reverseCode: 'KAN9999', reverseName: 'その他' },
];

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
  const relationshipsRef = collection(db, RELATIONSHIPS_COLLECTION);

  // sourceCustomerIdまたはtargetCustomerIdに一致する関係性を取得
  const [sourceSnapshot, targetSnapshot] = await Promise.all([
    getDocs(query(
      relationshipsRef,
      where('sourceCustomerId', '==', customerId)
    )),
    getDocs(query(
      relationshipsRef,
      where('targetCustomerId', '==', customerId)
    )),
  ]);

  const relationships: Relationship[] = [];

  sourceSnapshot.docs.forEach((doc) => {
    relationships.push({ id: doc.id, ...doc.data() } as Relationship);
  });

  targetSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    // 逆関係として追加（重複防止）
    if (!relationships.find(r => r.id === doc.id)) {
      relationships.push({
        id: doc.id,
        ...data,
        // 逆方向なので関係性を逆転
        direction: 'reverse',
      } as Relationship);
    }
  });

  // 関連する顧客情報を取得
  const relatedCustomers: RelatedCustomer[] = [];

  for (const rel of relationships) {
    const targetId = rel.sourceCustomerId === customerId
      ? rel.targetCustomerId
      : rel.sourceCustomerId;

    try {
      // trackingNoで顧客を検索
      const customersRef = collection(db, CUSTOMERS_COLLECTION);
      const customerQuery = query(customersRef, where('trackingNo', '==', targetId));
      const customerSnapshot = await getDocs(customerQuery);

      if (!customerSnapshot.empty) {
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
      }
    } catch (err) {
      console.error('Error fetching related customer:', err);
    }
  }

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
