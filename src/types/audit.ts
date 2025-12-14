/**
 * 監査証跡（Audit Trail）関連の型定義
 * 上場企業の監査要件に対応するための変更履歴管理
 */

/**
 * 変更を行ったユーザー情報
 * Firebase AuthのUserオブジェクトから取得
 */
export interface AuditUser {
  uid: string;
  displayName: string;
  email: string;
}

/**
 * 操作タイプ
 */
export type AuditOperation =
  | 'create'    // 新規作成
  | 'update'    // 更新
  | 'delete'    // 削除
  | 'restore'   // 復元（削除からの復旧）
  | 'rollback'; // ロールバック（特定バージョンへの復元）

/**
 * エンティティタイプ
 */
export type AuditEntityType = 'Customer' | 'Deal' | 'Relationship' | 'TreeBurialDeal' | 'BurialPerson';

/**
 * フィールド単位の変更内容
 */
export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * 履歴エントリ（サブコレクション用）
 * パス: Customers/{id}/History, Deals/{id}/History, Relationships/{id}/History
 * 目的: 高速な履歴取得、ロールバック操作
 */
export interface HistoryEntry {
  id: string;
  version: number;
  operation: AuditOperation;
  changedBy: AuditUser;
  changedAt: string; // ISO 8601形式
  changes: FieldChange[];
  snapshot: Record<string, unknown>; // 変更後のドキュメント全体のスナップショット
  rollbackFromVersion?: number; // ロールバック操作時のソースバージョン
  rollbackToVersion?: number;   // ロールバック操作時のターゲットバージョン
}

/**
 * 監査ログエントリ（AuditLogsコレクション用）
 * パス: AuditLogs
 * 目的: 改ざん防止、横断的な監査クエリ、長期保存
 */
export interface AuditLogEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  operation: AuditOperation;
  changedBy: AuditUser;
  changedAt: string; // ISO 8601形式
  changes: FieldChange[];
  version: number;
  // 将来的な拡張用
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

/**
 * 履歴取得のオプション
 */
export interface HistoryQueryOptions {
  limit?: number;
  startAfterVersion?: number;
  operation?: AuditOperation;
}

/**
 * 監査ログ検索のフィルター
 */
export interface AuditLogFilter {
  entityType?: AuditEntityType;
  entityId?: string;
  operation?: AuditOperation;
  changedByUid?: string;
  changedByEmail?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * ロールバックリクエスト
 */
export interface RollbackRequest {
  entityType: AuditEntityType;
  entityId: string;
  targetVersion: number;
  reason?: string;
}

/**
 * ロールバック結果
 */
export interface RollbackResult {
  success: boolean;
  newVersion: number;
  restoredData: Record<string, unknown>;
  error?: string;
}
