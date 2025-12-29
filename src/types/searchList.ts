/**
 * 検索条件リスト（カスタムフィルター）の型定義
 */

/**
 * フィルター対象フィールド
 */
export type FilterField =
  | 'trackingNo'        // 追客No
  | 'name'              // 顧客名
  | 'nameKana'          // フリガナ
  | 'phone'             // 電話番号
  | 'branch'            // 拠点
  | 'prefecture'        // 都道府県
  | 'city'              // 市区町村
  | 'customerCategory'  // 顧客区分
  | 'assignedTo'        // 担当者
  | 'hasDeals'          // 一般商談あり
  | 'hasTreeBurialDeals'// 樹木墓商談あり
  | 'hasBurialPersons'  // 樹木墓オプションあり
  | 'memo'              // 備考
  | 'createdAt'         // 登録日
  | 'updatedAt';        // 更新日

/**
 * フィールド定義（表示名・型情報）
 */
export interface FieldDefinition {
  field: FilterField;
  label: string;
  type: 'string' | 'boolean' | 'date' | 'select';
  options?: { value: string; label: string }[];
}

/**
 * 利用可能なフィールド一覧
 */
export const FILTER_FIELDS: FieldDefinition[] = [
  { field: 'trackingNo', label: '追客No', type: 'string' },
  { field: 'name', label: '顧客名', type: 'string' },
  { field: 'nameKana', label: 'フリガナ', type: 'string' },
  { field: 'phone', label: '電話番号', type: 'string' },
  { field: 'branch', label: '拠点', type: 'string' },
  { field: 'prefecture', label: '都道府県', type: 'string' },
  { field: 'city', label: '市区', type: 'string' },
  {
    field: 'customerCategory',
    label: '顧客区分',
    type: 'select',
    options: [
      { value: '個人', label: '個人' },
      { value: '寺院・宗教施設', label: '寺院・宗教施設' },
      { value: '士業・専門家', label: '士業・専門家' },
      { value: '法人', label: '法人' },
      { value: '団体・組織', label: '団体・組織' },
      { value: '不明', label: '不明' },
    ]
  },
  { field: 'assignedTo', label: '担当者', type: 'string' },
  {
    field: 'hasDeals',
    label: '一般商談',
    type: 'boolean',
  },
  {
    field: 'hasTreeBurialDeals',
    label: '樹木墓商談',
    type: 'boolean',
  },
  {
    field: 'hasBurialPersons',
    label: '樹木墓オプション',
    type: 'boolean',
  },
  { field: 'memo', label: '備考', type: 'string' },
  { field: 'createdAt', label: '登録日', type: 'date' },
  { field: 'updatedAt', label: '更新日', type: 'date' },
];

/**
 * 文字列フィールド用の演算子
 */
export type StringOperator =
  | 'contains'          // 含む
  | 'equals'            // 完全一致
  | 'startsWith'        // 先頭が一致
  | 'endsWith'          // 末尾が一致
  | 'notContains'       // 含まない
  | 'notEquals'         // 完全一致しない
  | 'notStartsWith'     // 先頭が一致しない
  | 'notEndsWith'       // 末尾が一致しない
  | 'isEmpty'           // 空白である
  | 'isNotEmpty';       // 空白でない

/**
 * 真偽値フィールド用の演算子
 */
export type BooleanOperator =
  | 'isTrue'            // あり
  | 'isFalse';          // なし

/**
 * 日付フィールド用の演算子
 */
export type DateOperator =
  | 'equals'            // 一致
  | 'before'            // より前
  | 'after'             // より後
  | 'between'           // 期間内
  | 'isEmpty'           // 空白である
  | 'isNotEmpty';       // 空白でない

export type FilterOperator = StringOperator | BooleanOperator | DateOperator;

/**
 * 演算子の表示名
 */
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: '含む',
  equals: '完全一致',
  startsWith: '先頭が一致',
  endsWith: '末尾が一致',
  notContains: '含まない',
  notEquals: '完全一致しない',
  notStartsWith: '先頭が一致しない',
  notEndsWith: '末尾が一致しない',
  isEmpty: '空白である',
  isNotEmpty: '空白でない',
  isTrue: 'あり',
  isFalse: 'なし',
  before: 'より前',
  after: 'より後',
  between: '期間内',
};

/**
 * フィールドタイプ別の利用可能な演算子
 */
export const OPERATORS_BY_TYPE: Record<string, FilterOperator[]> = {
  string: ['contains', 'equals', 'startsWith', 'endsWith', 'notContains', 'notEquals', 'notStartsWith', 'notEndsWith', 'isEmpty', 'isNotEmpty'],
  select: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  boolean: ['isTrue', 'isFalse'],
  date: ['equals', 'before', 'after', 'between', 'isEmpty', 'isNotEmpty'],
};

/**
 * 単一のフィルター条件
 */
export interface FilterCondition {
  id: string;           // ユニークID
  field: FilterField;   // フィールド
  operator: FilterOperator;  // 演算子
  value: string;        // 値
  value2?: string;      // 日付のbetween用の終了値
}

/**
 * OR条件グループ（グループ内はOR）
 */
export interface FilterConditionGroup {
  id: string;
  conditions: FilterCondition[];
}

/**
 * 検索リスト定義
 * グループ間はAND、グループ内はOR
 */
export interface CustomerSearchList {
  id: string;
  name: string;                         // リスト名
  description?: string;                  // 説明
  isSystem?: boolean;                    // システム定義リストかどうか
  conditionGroups: FilterConditionGroup[];  // 条件グループ（AND結合）
  createdAt: string;
  updatedAt: string;
  createdBy?: string;                    // 作成者
}

/**
 * システム定義リスト
 */
export const SYSTEM_LISTS: Omit<CustomerSearchList, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'all',
    name: '全顧客一覧',
    isSystem: true,
    conditionGroups: [],
  },
  {
    id: 'has-tree-burial-deals',
    name: '樹木墓商談あり',
    isSystem: true,
    conditionGroups: [
      {
        id: 'g1',
        conditions: [
          { id: 'c1', field: 'hasTreeBurialDeals', operator: 'isTrue', value: '' }
        ]
      }
    ],
  },
  {
    id: 'has-general-deals',
    name: '一般商談あり',
    isSystem: true,
    conditionGroups: [
      {
        id: 'g1',
        conditions: [
          { id: 'c1', field: 'hasDeals', operator: 'isTrue', value: '' }
        ]
      }
    ],
  },
];

/**
 * 新しいフィルター条件を生成
 */
export function createFilterCondition(field?: FilterField): FilterCondition {
  return {
    id: crypto.randomUUID(),
    field: field || 'name',
    operator: 'contains',
    value: '',
  };
}

/**
 * 新しい条件グループを生成
 */
export function createFilterConditionGroup(): FilterConditionGroup {
  return {
    id: crypto.randomUUID(),
    conditions: [createFilterCondition()],
  };
}

/**
 * 新しい検索リストを生成
 */
export function createSearchList(name: string): CustomerSearchList {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    conditionGroups: [createFilterConditionGroup()],
    createdAt: now,
    updatedAt: now,
  };
}
