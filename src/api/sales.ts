/**
 * Sales Dashboard API
 * 売上管理ダッシュボード用のデータ処理
 */

// 売上レコードの型定義
export interface SalesRecord {
    id: number;
    contractDate: string;
    contractor: string;
    templeName: string;
    area: string;
    applicationAmount: number;
    paymentTotal: number;
    balance: number;
    subCategory: string;
    mainCategory: string;
    salesMonth: string;
}

// ダッシュボードサマリーの型定義
export interface SalesDashboardSummary {
    totalApplicationAmount: number;
    totalPaymentAmount: number;
    contractCount: number;
    paymentRate: number;
    monthlyData: MonthlyData[];
    byMainCategory: CategoryData[];
    bySubCategory: CategoryData[];
    byArea: AreaData[];
    byTemple: TempleData[];
}

export interface MonthlyData {
    month: string;
    applicationAmount: number;
    paymentAmount: number;
}

export interface CategoryData {
    category: string;
    applicationAmount: number;
}

export interface AreaData {
    area: string;
    applicationAmount: number;
    paymentAmount: number;
}

export interface TempleData {
    templeName: string;
    applicationAmount: number;
}

// CSV行をパースする関数
function parseAmount(value: string): number {
    if (!value) return 0;
    // ¥マーク、カンマ、引用符を除去して数値に変換
    const cleaned = value.replace(/[¥,"\s]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
}

// CSVデータを解析する
export function parseSalesCSV(csvContent: string): SalesRecord[] {
    const lines = csvContent.split('\n');
    const records: SalesRecord[] = [];

    // ヘッダー行をスキップ
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSVパース（引用符内のカンマを考慮）
        const columns = parseCSVLine(line);
        if (columns.length < 16) continue;

        // 変更履歴を含む行はスキップ（入力順が数値でない場合）
        const id = parseInt(columns[0], 10);
        if (isNaN(id)) continue;

        records.push({
            id,
            contractDate: columns[1],
            contractor: columns[2],
            templeName: columns[3],
            area: columns[4],
            applicationAmount: parseAmount(columns[5]),
            paymentTotal: parseAmount(columns[12]),
            balance: parseAmount(columns[13]),
            subCategory: columns[14],
            mainCategory: columns[15],
            salesMonth: columns[19] || '',
        });
    }

    return records;
}

// CSVの1行をパース（引用符内のカンマを考慮）
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

// ダッシュボードサマリーを計算
export function calculateDashboardSummary(records: SalesRecord[]): SalesDashboardSummary {
    // 総計
    let totalApplicationAmount = 0;
    let totalPaymentAmount = 0;

    // 月別データ
    const monthlyMap = new Map<string, { app: number; pay: number }>();

    // 大分類別
    const mainCategoryMap = new Map<string, number>();

    // 小分類別
    const subCategoryMap = new Map<string, number>();

    // エリア別
    const areaMap = new Map<string, { app: number; pay: number }>();

    // 寺院別
    const templeMap = new Map<string, number>();

    for (const record of records) {
        totalApplicationAmount += record.applicationAmount;
        totalPaymentAmount += record.paymentTotal;

        // 月別集計
        if (record.salesMonth) {
            const existing = monthlyMap.get(record.salesMonth) || { app: 0, pay: 0 };
            existing.app += record.applicationAmount;
            existing.pay += record.paymentTotal;
            monthlyMap.set(record.salesMonth, existing);
        }

        // 大分類別集計
        if (record.mainCategory) {
            const existing = mainCategoryMap.get(record.mainCategory) || 0;
            mainCategoryMap.set(record.mainCategory, existing + record.applicationAmount);
        }

        // 小分類別集計
        if (record.subCategory) {
            const existing = subCategoryMap.get(record.subCategory) || 0;
            subCategoryMap.set(record.subCategory, existing + record.applicationAmount);
        }

        // エリア別集計
        if (record.area) {
            const existing = areaMap.get(record.area) || { app: 0, pay: 0 };
            existing.app += record.applicationAmount;
            existing.pay += record.paymentTotal;
            areaMap.set(record.area, existing);
        }

        // 寺院別集計
        if (record.templeName) {
            const existing = templeMap.get(record.templeName) || 0;
            templeMap.set(record.templeName, existing + record.applicationAmount);
        }
    }

    // 月別データをソートして配列に変換
    const monthlyData = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
            month,
            applicationAmount: data.app,
            paymentAmount: data.pay,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

    // 大分類別データを金額順にソート
    const byMainCategory = Array.from(mainCategoryMap.entries())
        .map(([category, amount]) => ({ category, applicationAmount: amount }))
        .sort((a, b) => b.applicationAmount - a.applicationAmount);

    // 小分類別データを金額順にソート
    const bySubCategory = Array.from(subCategoryMap.entries())
        .map(([category, amount]) => ({ category, applicationAmount: amount }))
        .sort((a, b) => b.applicationAmount - a.applicationAmount);

    // エリア別データを金額順にソート
    const byArea = Array.from(areaMap.entries())
        .map(([area, data]) => ({
            area,
            applicationAmount: data.app,
            paymentAmount: data.pay,
        }))
        .sort((a, b) => b.applicationAmount - a.applicationAmount);

    // 寺院別データを金額順にソート（上位30件）
    const byTemple = Array.from(templeMap.entries())
        .map(([templeName, amount]) => ({ templeName, applicationAmount: amount }))
        .sort((a, b) => b.applicationAmount - a.applicationAmount)
        .slice(0, 30);

    return {
        totalApplicationAmount,
        totalPaymentAmount,
        contractCount: records.length,
        paymentRate: totalApplicationAmount > 0
            ? (totalPaymentAmount / totalApplicationAmount) * 100
            : 0,
        monthlyData,
        byMainCategory,
        bySubCategory,
        byArea,
        byTemple,
    };
}

// 金額をフォーマット
export function formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString()}`;
}

// パーセントをフォーマット
export function formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
}
