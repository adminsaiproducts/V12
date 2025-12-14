/**
 * オブジェクトの差分計算ユーティリティ
 * 監査証跡の変更内容記録に使用
 */

import type { FieldChange } from '../types/audit';

/**
 * 値が等しいかを深く比較
 */
function deepEqual(a: unknown, b: unknown): boolean {
  // 両方がnullまたはundefined
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  // 型が異なる
  if (typeof a !== typeof b) return false;

  // 配列の比較
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // オブジェクトの比較
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  // プリミティブ値の比較
  return a === b;
}

/**
 * 2つのオブジェクト間の変更を計算
 * @param oldDoc 変更前のドキュメント
 * @param newDoc 変更後のドキュメント
 * @param excludeFields 比較から除外するフィールド（例: id, createdAt, updatedAt）
 * @returns 変更されたフィールドのリスト
 */
export function calculateChanges(
  oldDoc: Record<string, unknown> | null,
  newDoc: Record<string, unknown>,
  excludeFields: string[] = ['id', 'createdAt', 'updatedAt']
): FieldChange[] {
  const changes: FieldChange[] = [];

  // 新規作成の場合
  if (!oldDoc) {
    for (const [key, value] of Object.entries(newDoc)) {
      if (excludeFields.includes(key)) continue;
      if (value !== undefined && value !== null && value !== '') {
        changes.push({
          field: key,
          oldValue: null,
          newValue: value,
        });
      }
    }
    return changes;
  }

  // 全フィールドを収集
  const allKeys = new Set([
    ...Object.keys(oldDoc),
    ...Object.keys(newDoc),
  ]);

  for (const key of allKeys) {
    if (excludeFields.includes(key)) continue;

    const oldValue = oldDoc[key];
    const newValue = newDoc[key];

    if (!deepEqual(oldValue, newValue)) {
      changes.push({
        field: key,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
      });
    }
  }

  return changes;
}

/**
 * ネストしたフィールドパスで変更を計算（フラット化）
 * 例: address.prefecture の変更を "address.prefecture" として記録
 */
export function calculateChangesFlat(
  oldDoc: Record<string, unknown> | null,
  newDoc: Record<string, unknown>,
  excludeFields: string[] = ['id', 'createdAt', 'updatedAt'],
  prefix = ''
): FieldChange[] {
  const changes: FieldChange[] = [];

  if (!oldDoc) {
    flattenAndCompare(null, newDoc, prefix, changes, excludeFields);
  } else {
    flattenAndCompare(oldDoc, newDoc, prefix, changes, excludeFields);
  }

  return changes;
}

function flattenAndCompare(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown>,
  prefix: string,
  changes: FieldChange[],
  excludeFields: string[]
): void {
  const allKeys = new Set([
    ...(oldObj ? Object.keys(oldObj) : []),
    ...Object.keys(newObj),
  ]);

  for (const key of allKeys) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;

    if (excludeFields.includes(key) || excludeFields.includes(fieldPath)) {
      continue;
    }

    const oldValue = oldObj ? oldObj[key] : undefined;
    const newValue = newObj[key];

    // 両方がオブジェクト（配列でない）の場合は再帰
    if (
      oldValue !== null &&
      newValue !== null &&
      typeof oldValue === 'object' &&
      typeof newValue === 'object' &&
      !Array.isArray(oldValue) &&
      !Array.isArray(newValue)
    ) {
      flattenAndCompare(
        oldValue as Record<string, unknown>,
        newValue as Record<string, unknown>,
        fieldPath,
        changes,
        excludeFields
      );
    } else if (!deepEqual(oldValue, newValue)) {
      changes.push({
        field: fieldPath,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
      });
    }
  }
}

/**
 * 変更内容を人間が読める形式にフォーマット
 */
export function formatChange(change: FieldChange): string {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(なし)';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return `${change.field}: ${formatValue(change.oldValue)} → ${formatValue(change.newValue)}`;
}

/**
 * フィールド名を日本語に変換（オプション）
 */
const FIELD_LABELS: Record<string, string> = {
  name: '名前',
  nameKana: 'フリガナ',
  phone: '電話番号',
  mobile: '携帯番号',
  email: 'メールアドレス',
  memo: '備考',
  stage: 'ステージ',
  assignedTo: '担当者',
  amount: '金額',
  title: 'タイトル',
  templeName: '寺院名',
  relationshipType: '関係性タイプ',
  confidence: '信頼度',
  description: '説明',
  'address.postalCode': '郵便番号',
  'address.prefecture': '都道府県',
  'address.city': '市区町村',
  'address.town': '町域',
  'address.streetNumber': '番地',
  'address.building': '建物名',
  'address.full': '住所全体',
};

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}
