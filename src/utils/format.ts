/**
 * 共通フォーマットユーティリティ
 */

/**
 * 金額を3桁区切りでフォーマット
 * @param amount 金額
 * @param options オプション
 * @returns フォーマットされた金額文字列
 */
export function formatCurrency(
    amount: number | undefined | null,
    options?: {
        showYen?: boolean;  // ¥マークを表示するか (デフォルト: true)
        fallback?: string;  // 値がない場合の表示 (デフォルト: '-')
    }
): string {
    const { showYen = true, fallback = '-' } = options || {};

    if (amount === undefined || amount === null || isNaN(amount)) {
        return fallback;
    }

    const formatted = amount.toLocaleString('ja-JP');
    return showYen ? `¥${formatted}` : formatted;
}

/**
 * 数値を3桁区切りでフォーマット（金額以外用）
 * @param num 数値
 * @param fallback 値がない場合の表示
 * @returns フォーマットされた数値文字列
 */
export function formatNumber(
    num: number | undefined | null,
    fallback: string = '-'
): string {
    if (num === undefined || num === null || isNaN(num)) {
        return fallback;
    }
    return num.toLocaleString('ja-JP');
}

/**
 * 日付をフォーマット
 * @param date 日付（ISO文字列、Date、またはタイムスタンプ）
 * @param format フォーマット形式 (デフォルト: 'YYYY/MM/DD')
 * @returns フォーマットされた日付文字列
 */
export function formatDate(
    date: string | Date | number | undefined | null,
    format: 'YYYY/MM/DD' | 'YYYY-MM-DD' | 'YYYY年M月D日' = 'YYYY/MM/DD'
): string {
    if (!date) return '-';

    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';

        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();

        switch (format) {
            case 'YYYY-MM-DD':
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            case 'YYYY年M月D日':
                return `${year}年${month}月${day}日`;
            case 'YYYY/MM/DD':
            default:
                return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
        }
    } catch {
        return '-';
    }
}

/**
 * パーセントをフォーマット
 * @param value パーセント値（0-100）
 * @param decimals 小数点以下桁数
 * @returns フォーマットされたパーセント文字列
 */
export function formatPercent(
    value: number | undefined | null,
    decimals: number = 1
): string {
    if (value === undefined || value === null || isNaN(value)) {
        return '-';
    }
    return `${value.toFixed(decimals)}%`;
}
