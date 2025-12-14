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

// 金額をフォーマット（共通ユーティリティを再エクスポート）
export { formatCurrency, formatPercent } from '../utils/format';

// 月でレコードをフィルタリング
export function filterByMonth(records: SalesRecord[], month: string): SalesRecord[] {
    return records.filter(r => r.salesMonth === month);
}

// 寺院でレコードをフィルタリング
export function filterByTemple(records: SalesRecord[], templeName: string): SalesRecord[] {
    return records.filter(r => r.templeName === templeName);
}

// 分類でレコードをフィルタリング
export function filterBySubCategory(records: SalesRecord[], category: string): SalesRecord[] {
    return records.filter(r => r.subCategory === category);
}

// 大分類でレコードをフィルタリング
export function filterByMainCategory(records: SalesRecord[], category: string): SalesRecord[] {
    return records.filter(r => r.mainCategory === category);
}

// 今期（2025/2-2026/1）でレコードをフィルタリング
export function filterByCurrentFiscalYear(records: SalesRecord[]): SalesRecord[] {
    return records.filter(r => {
        if (!r.contractDate) return false;
        // 契約日をYYYY/MM/DD形式からパース
        const parts = r.contractDate.split('/');
        if (parts.length !== 3) return false;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        // 2025年2月〜2025年12月 または 2026年1月
        if (year === 2025 && month >= 2) return true;
        if (year === 2026 && month === 1) return true;
        return false;
    });
}

// エリア×寺院の積み上げグラフ用データ
export interface AreaTempleStackedData {
    areas: string[];                    // X軸のエリア名
    temples: string[];                  // 凡例の寺院名（上位N件 + その他）
    datasets: {
        temple: string;
        data: number[];                 // 各エリアでの申込額
    }[];
}

// エリア別・寺院別の積み上げデータを計算（各エリアで上位5寺院 + その他）
export function calculateAreaTempleStacked(records: SalesRecord[], topN: number = 5): AreaTempleStackedData {
    // エリア別に寺院ごとの売上を集計
    const areaTempleMap = new Map<string, Map<string, number>>();
    const areaTotalMap = new Map<string, number>();

    for (const record of records) {
        if (!record.area || !record.templeName) continue;

        // エリア別寺院マップ
        if (!areaTempleMap.has(record.area)) {
            areaTempleMap.set(record.area, new Map());
        }
        const templeMap = areaTempleMap.get(record.area)!;
        const existing = templeMap.get(record.templeName) || 0;
        templeMap.set(record.templeName, existing + record.applicationAmount);

        // エリア合計
        const areaTotal = areaTotalMap.get(record.area) || 0;
        areaTotalMap.set(record.area, areaTotal + record.applicationAmount);
    }

    // エリアを売上順にソート
    const sortedAreas = Array.from(areaTotalMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([area]) => area);

    // 全エリアで登場する寺院の総売上を計算
    const globalTempleTotal = new Map<string, number>();
    for (const [, templeMap] of areaTempleMap) {
        for (const [temple, amount] of templeMap) {
            const existing = globalTempleTotal.get(temple) || 0;
            globalTempleTotal.set(temple, existing + amount);
        }
    }

    // 上位N寺院を選択
    const topTemples = Array.from(globalTempleTotal.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([temple]) => temple);

    // データセットを作成
    const datasets: { temple: string; data: number[] }[] = [];

    // 上位寺院のデータセット
    for (const temple of topTemples) {
        const data = sortedAreas.map(area => {
            const templeMap = areaTempleMap.get(area);
            return templeMap?.get(temple) || 0;
        });
        datasets.push({ temple, data });
    }

    // その他（上位以外の合計）
    const othersData = sortedAreas.map(area => {
        const templeMap = areaTempleMap.get(area);
        if (!templeMap) return 0;
        let others = 0;
        for (const [temple, amount] of templeMap) {
            if (!topTemples.includes(temple)) {
                others += amount;
            }
        }
        return others;
    });

    // その他が0でない場合のみ追加
    if (othersData.some(v => v > 0)) {
        datasets.push({ temple: 'その他', data: othersData });
    }

    return {
        areas: sortedAreas,
        temples: [...topTemples, ...(othersData.some(v => v > 0) ? ['その他'] : [])],
        datasets,
    };
}
