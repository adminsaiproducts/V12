/**
 * 監査ログAPI
 * 変更履歴の記録・取得・検索
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  AuditUser,
  AuditOperation,
  AuditEntityType,
  FieldChange,
  HistoryEntry,
  AuditLogEntry,
  HistoryQueryOptions,
  AuditLogFilter,
} from '../types/audit';

// コレクション名
const AUDIT_LOGS_COLLECTION = 'AuditLogs';

/**
 * エンティティタイプからコレクション名を取得
 */
function getCollectionName(entityType: AuditEntityType): string {
  switch (entityType) {
    case 'Customer':
      return 'Customers';
    case 'Deal':
      return 'Deals';
    case 'Relationship':
      return 'Relationships';
    case 'TreeBurialDeal':
      return 'TreeBurialDeals';
    case 'BurialPerson':
      return 'BurialPersons';
  }
}

/**
 * 履歴サブコレクションのパスを取得
 */
function getHistoryCollectionPath(entityType: AuditEntityType, entityId: string): string {
  return `${getCollectionName(entityType)}/${entityId}/History`;
}

/**
 * 次のバージョン番号を取得
 */
async function getNextVersion(entityType: AuditEntityType, entityId: string): Promise<number> {
  try {
    const historyPath = getHistoryCollectionPath(entityType, entityId);
    const historyRef = collection(db, historyPath);

    // インデックスなしでも動作するように全件取得して最大バージョンを探す
    const snapshot = await getDocs(historyRef);

    if (snapshot.empty) {
      return 1;
    }

    let maxVersion = 0;
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as HistoryEntry;
      if (data.version > maxVersion) {
        maxVersion = data.version;
      }
    });

    return maxVersion + 1;
  } catch (error) {
    console.error('[audit] getNextVersion error:', error);
    // エラー時はタイムスタンプベースのバージョンを返す
    return Date.now();
  }
}

/**
 * 履歴エントリを作成（サブコレクション + AuditLogs）
 */
export async function createHistoryEntry(
  entityType: AuditEntityType,
  entityId: string,
  operation: AuditOperation,
  changes: FieldChange[],
  snapshot: Record<string, unknown>,
  user: AuditUser,
  rollbackFromVersion?: number,
  rollbackToVersion?: number
): Promise<{ historyId: string; auditLogId: string; version: number }> {
  const changedAt = new Date().toISOString();
  const version = await getNextVersion(entityType, entityId);

  let historyDocId = '';
  let auditLogDocId = '';

  try {
    // 1. サブコレクションに履歴を追加
    const historyPath = getHistoryCollectionPath(entityType, entityId);
    console.log('[audit] Creating history entry at path:', historyPath);
    const historyRef = collection(db, historyPath);

    const historyEntry: Omit<HistoryEntry, 'id'> = {
      version,
      operation,
      changedBy: user,
      changedAt,
      changes,
      snapshot,
      ...(rollbackFromVersion !== undefined && { rollbackFromVersion }),
      ...(rollbackToVersion !== undefined && { rollbackToVersion }),
    };

    const historyDoc = await addDoc(historyRef, historyEntry);
    historyDocId = historyDoc.id;
    console.log('[audit] History entry created:', historyDocId);
  } catch (error) {
    console.error('[audit] Failed to create history entry:', error);
    // 履歴サブコレクションへの書き込みに失敗しても続行
  }

  try {
    // 2. AuditLogsコレクションに追加（横断的な監査用）
    const auditLogsRef = collection(db, AUDIT_LOGS_COLLECTION);
    console.log('[audit] Creating audit log entry');

    const auditLogEntry: Omit<AuditLogEntry, 'id'> = {
      entityType,
      entityId,
      operation,
      changedBy: user,
      changedAt,
      changes,
      version,
    };

    const auditLogDoc = await addDoc(auditLogsRef, auditLogEntry);
    auditLogDocId = auditLogDoc.id;
    console.log('[audit] Audit log entry created:', auditLogDocId);
  } catch (error) {
    console.error('[audit] Failed to create audit log entry:', error);
    // AuditLogsへの書き込みに失敗しても続行
  }

  return {
    historyId: historyDocId,
    auditLogId: auditLogDocId,
    version,
  };
}

/**
 * エンティティの履歴を取得
 */
export async function getHistory(
  entityType: AuditEntityType,
  entityId: string,
  options: HistoryQueryOptions = {}
): Promise<HistoryEntry[]> {
  const { limit: maxResults = 50, startAfterVersion, operation } = options;

  const historyPath = getHistoryCollectionPath(entityType, entityId);
  const historyRef = collection(db, historyPath);

  let q = query(historyRef, orderBy('version', 'desc'), limit(maxResults));

  if (operation) {
    q = query(historyRef, where('operation', '==', operation), orderBy('version', 'desc'), limit(maxResults));
  }

  if (startAfterVersion !== undefined) {
    // startAfterVersionのドキュメントを取得してカーソルとして使用
    const startAfterQuery = query(
      historyRef,
      where('version', '==', startAfterVersion),
      limit(1)
    );
    const startAfterSnapshot = await getDocs(startAfterQuery);

    if (!startAfterSnapshot.empty) {
      q = query(
        historyRef,
        orderBy('version', 'desc'),
        startAfter(startAfterSnapshot.docs[0]),
        limit(maxResults)
      );
    }
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as HistoryEntry[];
}

/**
 * 特定バージョンの履歴エントリを取得
 */
export async function getHistoryByVersion(
  entityType: AuditEntityType,
  entityId: string,
  version: number
): Promise<HistoryEntry | null> {
  const historyPath = getHistoryCollectionPath(entityType, entityId);
  const historyRef = collection(db, historyPath);
  const q = query(historyRef, where('version', '==', version), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as HistoryEntry;
}

/**
 * 特定バージョンのスナップショットを取得
 */
export async function getVersionSnapshot(
  entityType: AuditEntityType,
  entityId: string,
  version: number
): Promise<Record<string, unknown> | null> {
  const entry = await getHistoryByVersion(entityType, entityId, version);
  return entry?.snapshot || null;
}

/**
 * 最新バージョン番号を取得
 */
export async function getLatestVersion(
  entityType: AuditEntityType,
  entityId: string
): Promise<number> {
  const historyPath = getHistoryCollectionPath(entityType, entityId);
  const historyRef = collection(db, historyPath);
  const q = query(historyRef, orderBy('version', 'desc'), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return 0;
  }

  const latestEntry = snapshot.docs[0].data() as HistoryEntry;
  return latestEntry.version;
}

/**
 * 監査ログを検索（管理者用）
 */
export async function searchAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
  const { entityType, entityId, operation, changedByEmail, startDate, endDate, limit: maxResults = 100 } = filter;

  const auditLogsRef = collection(db, AUDIT_LOGS_COLLECTION);
  let q = query(auditLogsRef, orderBy('changedAt', 'desc'), limit(maxResults));

  // Firestoreの制約上、複合クエリには複合インデックスが必要
  // 単一フィールドでのフィルタリングを優先
  if (entityType) {
    q = query(auditLogsRef, where('entityType', '==', entityType), orderBy('changedAt', 'desc'), limit(maxResults));
  } else if (entityId) {
    q = query(auditLogsRef, where('entityId', '==', entityId), orderBy('changedAt', 'desc'), limit(maxResults));
  } else if (operation) {
    q = query(auditLogsRef, where('operation', '==', operation), orderBy('changedAt', 'desc'), limit(maxResults));
  } else if (changedByEmail) {
    q = query(auditLogsRef, where('changedBy.email', '==', changedByEmail), orderBy('changedAt', 'desc'), limit(maxResults));
  }

  const snapshot = await getDocs(q);
  let results = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AuditLogEntry[];

  // クライアント側でさらにフィルタリング
  if (startDate) {
    results = results.filter((entry) => entry.changedAt >= startDate);
  }
  if (endDate) {
    results = results.filter((entry) => entry.changedAt <= endDate);
  }

  return results;
}

/**
 * エンティティの履歴件数を取得
 */
export async function getHistoryCount(
  entityType: AuditEntityType,
  entityId: string
): Promise<number> {
  const historyPath = getHistoryCollectionPath(entityType, entityId);
  const historyRef = collection(db, historyPath);
  const snapshot = await getDocs(historyRef);
  return snapshot.size;
}

/**
 * 履歴が存在するか確認
 */
export async function hasHistory(
  entityType: AuditEntityType,
  entityId: string
): Promise<boolean> {
  const count = await getHistoryCount(entityType, entityId);
  return count > 0;
}
