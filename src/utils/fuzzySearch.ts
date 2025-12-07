/**
 * あいまい検索ユーティリティ
 * - ひらがな⇔カタカナ変換
 * - 全角⇔半角変換
 * - 部分一致検索
 */

/**
 * ひらがなをカタカナに変換
 */
export function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) + 0x60)
  );
}

/**
 * カタカナをひらがなに変換
 */
export function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
}

/**
 * 全角英数を半角に変換
 */
export function fullWidthToHalfWidth(str: string): string {
  return str
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    )
    .replace(/[−ー]/g, '-')
    .replace(/　/g, ' ');
}

/**
 * 検索用に文字列を正規化
 */
export function normalizeForSearch(str: string): string {
  if (!str) return '';
  // 小文字化、全角→半角、カタカナ→ひらがな、空白削除
  return katakanaToHiragana(fullWidthToHalfWidth(str.toLowerCase())).replace(/\s+/g, '');
}

/**
 * あいまい一致判定
 * クエリの文字が対象文字列内に順番に出現するかチェック
 */
export function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  if (!text) return false;

  const normalizedText = normalizeForSearch(text);
  const normalizedQuery = normalizeForSearch(query);

  // 部分一致（通常の検索）
  if (normalizedText.includes(normalizedQuery)) {
    return true;
  }

  // あいまい一致（文字が順番に出現するか）
  let queryIndex = 0;
  for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === normalizedQuery.length;
}

/**
 * 検索スコアを計算（マッチ度合い）
 * 高いほど良い一致
 */
export function calculateSearchScore(text: string, query: string): number {
  if (!query) return 0;
  if (!text) return -1;

  const normalizedText = normalizeForSearch(text);
  const normalizedQuery = normalizeForSearch(query);

  // 完全一致: 最高スコア
  if (normalizedText === normalizedQuery) {
    return 100;
  }

  // 前方一致: 高スコア
  if (normalizedText.startsWith(normalizedQuery)) {
    return 80;
  }

  // 部分一致: 中スコア
  if (normalizedText.includes(normalizedQuery)) {
    return 60;
  }

  // あいまい一致: 低スコア
  let queryIndex = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;

  for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      queryIndex++;
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
    } else {
      consecutiveMatches = 0;
    }
  }

  if (queryIndex === normalizedQuery.length) {
    // 連続マッチ数に応じてスコア調整
    return 20 + (maxConsecutive / normalizedQuery.length) * 20;
  }

  return -1; // マッチしない
}

/**
 * 複数フィールドでの検索スコアを計算
 */
export function calculateMultiFieldScore(
  fields: Record<string, unknown>,
  query: string,
  fieldWeights: Record<string, number> = {}
): number {
  const defaultWeights: Record<string, number> = {
    name: 10,
    nameKana: 8,
    trackingNo: 7,
    phone: 6,
    address: 4,
    email: 3,
    memo: 2,
  };

  const weights = { ...defaultWeights, ...fieldWeights };
  let totalScore = 0;
  let matchedFields = 0;

  for (const [fieldName, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;

    const strValue = typeof value === 'string' ? value : JSON.stringify(value);
    const score = calculateSearchScore(strValue, query);

    if (score > 0) {
      const weight = weights[fieldName] || 1;
      totalScore += score * weight;
      matchedFields++;
    }
  }

  // 複数フィールドでマッチした場合はボーナス
  if (matchedFields > 1) {
    totalScore += matchedFields * 5;
  }

  return totalScore;
}

/**
 * 顧客データをあいまい検索
 */
export function fuzzySearchCustomers<T extends Record<string, unknown>>(
  customers: T[],
  query: string,
  options?: {
    maxResults?: number;
    minScore?: number;
  }
): T[] {
  if (!query.trim()) {
    return customers;
  }

  const { maxResults = 100, minScore = 0 } = options || {};

  // 各顧客のスコアを計算
  const scoredCustomers = customers
    .map((customer) => {
      const searchFields: Record<string, unknown> = {
        name: customer.name,
        nameKana: customer.nameKana,
        trackingNo: customer.trackingNo,
        phone: typeof customer.phone === 'object'
          ? (customer.phone as Record<string, unknown>)?.cleaned || (customer.phone as Record<string, unknown>)?.original
          : customer.phone,
        email: customer.email,
        memo: customer.memo,
      };

      // 住所フィールドを展開
      if (customer.address && typeof customer.address === 'object') {
        const addr = customer.address as Record<string, unknown>;
        searchFields.address = [
          addr.fullAddress,
          addr.prefecture,
          addr.city,
          addr.town,
          addr.building,
        ].filter(Boolean).join(' ');
      } else if (typeof customer.address === 'string') {
        searchFields.address = customer.address;
      }

      const score = calculateMultiFieldScore(searchFields, query);
      return { customer, score };
    })
    .filter(({ score }) => score > minScore)
    .sort((a, b) => b.score - a.score);

  return scoredCustomers.slice(0, maxResults).map(({ customer }) => customer);
}
