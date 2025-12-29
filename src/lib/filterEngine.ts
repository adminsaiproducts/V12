/**
 * フィルターエンジン
 * 検索条件リストの条件を顧客データに適用する
 */

import type {
  FilterCondition,
  FilterConditionGroup,
  FilterOperator,
  FilterField,
} from '../types/searchList';

/**
 * 顧客データからフィールド値を取得
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFieldValue(customer: any, field: FilterField): unknown {
  let value: unknown = '';

  switch (field) {
    case 'trackingNo':
      value = customer.trackingNo || '';
      break;
    case 'name':
      value = customer.name || '';
      break;
    case 'nameKana':
      value = customer.nameKana || '';
      break;
    case 'phone':
      value = customer.phone || customer.phoneOriginal || '';
      break;
    case 'branch':
      value = customer.branch || '';
      break;
    case 'prefecture':
      // 標準: addressPrefecture（Algolia同期スクリプトで設定）
      // フォールバック: 旧データ形式への互換性のため
      if (customer.addressPrefecture) {
        value = customer.addressPrefecture;
      } else if (customer.prefecture) {
        value = customer.prefecture;
      } else if (customer.address && typeof customer.address === 'object') {
        value = customer.address.prefecture || '';
      } else if (typeof customer.address === 'string') {
        // レガシー: address文字列から都道府県を抽出
        const addressStr = customer.address;
        const prefectureMatch = addressStr.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/);
        value = prefectureMatch ? prefectureMatch[1] : '';
      }
      break;
    case 'city':
      // 標準: addressCity（Algolia同期スクリプトで設定）
      // フォールバック: 旧データ形式への互換性のため
      if (customer.addressCity) {
        value = customer.addressCity;
      } else if (customer.city) {
        value = customer.city;
      } else if (customer.address && typeof customer.address === 'object') {
        value = customer.address.city || '';
      } else if (typeof customer.address === 'string') {
        // レガシー: address文字列から市区町村を抽出
        const addressStr = customer.address;
        const withoutPref = addressStr.replace(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)\s*/, '');
        const cityMatch = withoutPref.match(/^(.+?[市区町村])/);
        value = cityMatch ? cityMatch[1] : '';
      }
      break;
    case 'customerCategory':
      value = customer.customerCategory || '';
      break;
    case 'assignedTo':
      value = customer.assignedTo || '';
      break;
    case 'hasDeals':
      value = !!customer.hasDeals;
      break;
    case 'hasTreeBurialDeals':
      value = !!customer.hasTreeBurialDeals;
      break;
    case 'hasBurialPersons':
      value = !!customer.hasBurialPersons;
      break;
    case 'memo':
      value = customer.memo || customer.notes || '';
      break;
    case 'createdAt':
      value = customer.createdAt || '';
      break;
    case 'updatedAt':
      value = customer.updatedAt || '';
      break;
    default:
      value = '';
  }

  return value;
}

/**
 * 文字列比較
 */
function matchStringCondition(
  value: string,
  operator: FilterOperator,
  conditionValue: string
): boolean {
  const normalizedValue = (value || '').toLowerCase();
  const normalizedConditionValue = (conditionValue || '').toLowerCase();

  switch (operator) {
    case 'contains':
      return normalizedValue.includes(normalizedConditionValue);
    case 'equals':
      return normalizedValue === normalizedConditionValue;
    case 'startsWith':
      return normalizedValue.startsWith(normalizedConditionValue);
    case 'endsWith':
      return normalizedValue.endsWith(normalizedConditionValue);
    case 'notContains':
      return !normalizedValue.includes(normalizedConditionValue);
    case 'notEquals':
      return normalizedValue !== normalizedConditionValue;
    case 'notStartsWith':
      return !normalizedValue.startsWith(normalizedConditionValue);
    case 'notEndsWith':
      return !normalizedValue.endsWith(normalizedConditionValue);
    case 'isEmpty':
      return !value || value.trim() === '';
    case 'isNotEmpty':
      return !!value && value.trim() !== '';
    default:
      return true;
  }
}

/**
 * 真偽値比較
 */
function matchBooleanCondition(
  value: boolean,
  operator: FilterOperator
): boolean {
  switch (operator) {
    case 'isTrue':
      return value === true;
    case 'isFalse':
      return value === false;
    default:
      return true;
  }
}

/**
 * 日付比較
 */
function matchDateCondition(
  value: string,
  operator: FilterOperator,
  conditionValue: string,
  conditionValue2?: string
): boolean {
  if (operator === 'isEmpty') {
    return !value || value.trim() === '';
  }
  if (operator === 'isNotEmpty') {
    return !!value && value.trim() !== '';
  }

  if (!value || !conditionValue) {
    return false;
  }

  const dateValue = new Date(value);
  const dateCondition = new Date(conditionValue);

  switch (operator) {
    case 'equals':
      return dateValue.toDateString() === dateCondition.toDateString();
    case 'before':
      return dateValue < dateCondition;
    case 'after':
      return dateValue > dateCondition;
    case 'between':
      if (!conditionValue2) return false;
      const dateCondition2 = new Date(conditionValue2);
      return dateValue >= dateCondition && dateValue <= dateCondition2;
    default:
      return true;
  }
}

/**
 * 単一条件の評価
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evaluateCondition(customer: any, condition: FilterCondition): boolean {
  const value = getFieldValue(customer, condition.field);

  // フィールドタイプに応じた比較
  if (typeof value === 'boolean') {
    return matchBooleanCondition(value, condition.operator);
  }

  // 日付フィールドの判定
  if (condition.field === 'createdAt' || condition.field === 'updatedAt') {
    return matchDateCondition(
      String(value),
      condition.operator,
      condition.value,
      condition.value2
    );
  }

  // 文字列として比較
  return matchStringCondition(String(value || ''), condition.operator, condition.value);
}

/**
 * 条件グループの評価（グループ内はOR）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evaluateConditionGroup(customer: any, group: FilterConditionGroup): boolean {
  if (group.conditions.length === 0) {
    return true;
  }

  // グループ内の条件はOR結合
  return group.conditions.some(condition => evaluateCondition(customer, condition));
}

/**
 * 全条件グループの評価（グループ間はAND）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function evaluateAllConditions(customer: any, groups: FilterConditionGroup[]): boolean {
  if (groups.length === 0) {
    return true;
  }

  // グループ間はAND結合
  return groups.every(group => evaluateConditionGroup(customer, group));
}

/**
 * 顧客リストをフィルタリング
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function filterCustomers(customers: any[], conditionGroups: FilterConditionGroup[]): any[] {
  console.log('[FilterEngine] Filtering customers:', {
    totalCustomers: customers.length,
    conditionGroups: conditionGroups,
  });

  if (conditionGroups.length === 0) {
    console.log('[FilterEngine] No conditions, returning all customers');
    return customers;
  }

  // デバッグ: 最初の3件の顧客データを表示
  if (customers.length > 0) {
    const sampleCustomers = customers.slice(0, 3);
    console.log('[FilterEngine] Sample customer data:', sampleCustomers.map(c => ({
      trackingNo: c.trackingNo,
      name: c.name,
      addressPrefecture: c.addressPrefecture,
      addressCity: c.addressCity,
      prefecture: c.prefecture,
      city: c.city,
      address: c.address,
      branch: c.branch,
      hasTreeBurialDeals: c.hasTreeBurialDeals,
    })));

    // 条件で使用されるフィールドの値を表示（文字列で出力）
    const firstCondition = conditionGroups[0]?.conditions[0];
    if (firstCondition) {
      const values = sampleCustomers.map(c => `${c.trackingNo}: "${getFieldValue(c, firstCondition.field)}"`);
      console.log(`[FilterEngine] Condition: ${firstCondition.field} ${firstCondition.operator} "${firstCondition.value}"`);
      console.log(`[FilterEngine] Sample values: ${values.join(', ')}`);
    }
  }

  const filtered = customers.filter(customer => evaluateAllConditions(customer, conditionGroups));
  console.log('[FilterEngine] Filtered result:', {
    before: customers.length,
    after: filtered.length,
  });

  return filtered;
}
