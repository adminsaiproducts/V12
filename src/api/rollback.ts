/**
 * ロールバックAPI
 * 特定バージョンへのデータ復元機能
 */

import {
  doc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  AuditUser,
  AuditEntityType,
  RollbackRequest,
  RollbackResult,
} from '../types/audit';
import {
  getHistoryByVersion,
  getLatestVersion,
  createHistoryEntry,
} from './audit';
import { calculateChanges } from '../utils/diff';

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
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * 指定バージョンにロールバック
 * @param request ロールバックリクエスト
 * @param user ロールバックを実行するユーザー
 * @returns ロールバック結果
 */
export async function rollbackToVersion(
  request: RollbackRequest,
  user: AuditUser
): Promise<RollbackResult> {
  const { entityType, entityId, targetVersion } = request;

  try {
    // 1. 対象バージョンのスナップショットを取得
    const targetEntry = await getHistoryByVersion(entityType, entityId, targetVersion);

    if (!targetEntry) {
      return {
        success: false,
        newVersion: 0,
        restoredData: {},
        error: `バージョン ${targetVersion} が見つかりません`,
      };
    }

    // 2. 現在のバージョンを取得
    const currentVersion = await getLatestVersion(entityType, entityId);

    if (currentVersion === 0) {
      return {
        success: false,
        newVersion: 0,
        restoredData: {},
        error: '履歴が存在しません',
      };
    }

    if (targetVersion === currentVersion) {
      return {
        success: false,
        newVersion: currentVersion,
        restoredData: {},
        error: '指定されたバージョンは現在のバージョンと同じです',
      };
    }

    // 3. スナップショットから復元データを準備
    const snapshot = targetEntry.snapshot;

    // idは除外（ドキュメントIDはそのまま維持）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...restoreData } = snapshot as { id?: string } & Record<string, unknown>;

    // 更新日時を現在時刻に更新
    const updatedAt = new Date().toISOString();
    const dataToRestore = {
      ...restoreData,
      updatedAt,
    };

    // 4. ドキュメントを更新
    const collectionName = getCollectionName(entityType);
    const docRef = doc(db, collectionName, entityId);

    // setDocではなくupdateDocを使用（既存ドキュメントの更新）
    try {
      await updateDoc(docRef, dataToRestore);
    } catch (error) {
      // ドキュメントが存在しない場合（削除後のロールバック）
      await setDoc(docRef, { id: entityId, ...dataToRestore });
    }

    // 5. 現在のバージョンのエントリを取得（変更差分計算用）
    const currentEntry = await getHistoryByVersion(entityType, entityId, currentVersion);
    const currentData = currentEntry?.snapshot || {};

    // 6. ロールバック履歴を記録
    const changes = calculateChanges(
      currentData as Record<string, unknown>,
      dataToRestore as Record<string, unknown>
    );

    await createHistoryEntry(
      entityType,
      entityId,
      'rollback',
      changes,
      { id: entityId, ...dataToRestore },
      user,
      currentVersion, // rollbackFromVersion
      targetVersion   // rollbackToVersion
    );

    // 7. 新しいバージョン番号を取得
    const newVersion = await getLatestVersion(entityType, entityId);

    return {
      success: true,
      newVersion,
      restoredData: dataToRestore,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      success: false,
      newVersion: 0,
      restoredData: {},
      error: `ロールバックに失敗しました: ${errorMessage}`,
    };
  }
}

/**
 * 削除されたエンティティを復元
 * 最新の非削除バージョンに復元
 */
export async function restoreDeleted(
  entityType: AuditEntityType,
  entityId: string,
  user: AuditUser
): Promise<RollbackResult> {
  try {
    // 最新バージョンを取得
    const latestVersion = await getLatestVersion(entityType, entityId);

    if (latestVersion === 0) {
      return {
        success: false,
        newVersion: 0,
        restoredData: {},
        error: '履歴が存在しません',
      };
    }

    // 最新の非削除バージョンを探す
    for (let version = latestVersion; version >= 1; version--) {
      const entry = await getHistoryByVersion(entityType, entityId, version);

      if (entry && entry.operation !== 'delete') {
        // 非削除バージョンが見つかった
        return rollbackToVersion(
          { entityType, entityId, targetVersion: version },
          user
        );
      }
    }

    return {
      success: false,
      newVersion: 0,
      restoredData: {},
      error: '復元可能なバージョンが見つかりません',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      success: false,
      newVersion: 0,
      restoredData: {},
      error: `復元に失敗しました: ${errorMessage}`,
    };
  }
}
