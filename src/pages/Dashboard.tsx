import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
    Button,
    Divider,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    Receipt as ReceiptIcon,
    AccountBalance as AccountBalanceIcon,
    LocationOn as LocationOnIcon,
    Category as CategoryIcon,
    Close as CloseIcon,
    OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    TooltipItem,
    ChartEvent,
    ActiveElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import {
    parseSalesCSV,
    calculateDashboardSummary,
    formatCurrency,
    formatPercent,
    filterByMonth,
    filterByTemple,
    filterBySubCategory,
    filterByMainCategory,
    filterByCurrentFiscalYear,
    calculateAreaTempleStacked,
    type SalesDashboardSummary,
    type SalesRecord,
    type AreaTempleStackedData,
} from '../api/sales';

// Chart.js登録
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

// 売上CSVデータ（ビルド時に埋め込み）
import salesCSVData from '../data/salesData';

// 詳細ダイアログの種類
type DetailType = 'month' | 'temple' | 'subCategory' | 'mainCategory' | null;

export function Dashboard() {
    const navigate = useNavigate();
    const [salesSummary, setSalesSummary] = useState<SalesDashboardSummary | null>(null);
    const [currentFYSummary, setCurrentFYSummary] = useState<SalesDashboardSummary | null>(null);
    const [allRecords, setAllRecords] = useState<SalesRecord[]>([]);
    const [currentFYRecords, setCurrentFYRecords] = useState<SalesRecord[]>([]);
    const [areaTempleStacked, setAreaTempleStacked] = useState<AreaTempleStackedData | null>(null);
    const [currentFYAreaTempleStacked, setCurrentFYAreaTempleStacked] = useState<AreaTempleStackedData | null>(null);

    // 詳細ダイアログの状態
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailType, setDetailType] = useState<DetailType>(null);
    const [detailKey, setDetailKey] = useState<string>('');
    const [detailRecords, setDetailRecords] = useState<SalesRecord[]>([]);

    // 個別レコード詳細ダイアログの状態
    const [recordDetailOpen, setRecordDetailOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<SalesRecord | null>(null);

    // 売上データを解析
    useEffect(() => {
        try {
            const records = parseSalesCSV(salesCSVData);
            setAllRecords(records);
            // 通算サマリー
            const summary = calculateDashboardSummary(records);
            setSalesSummary(summary);
            // 今期（2025/2-2026/1）サマリー
            const fyRecords = filterByCurrentFiscalYear(records);
            setCurrentFYRecords(fyRecords);
            const currentSummary = calculateDashboardSummary(fyRecords);
            setCurrentFYSummary(currentSummary);
            // エリア×寺院積み上げデータ（上位8寺院）
            const stackedData = calculateAreaTempleStacked(records, 8);
            setAreaTempleStacked(stackedData);
            const currentFYStackedData = calculateAreaTempleStacked(fyRecords, 8);
            setCurrentFYAreaTempleStacked(currentFYStackedData);
            console.log(`[Dashboard] Sales data loaded: ${records.length} records, Current FY: ${fyRecords.length} records`);
        } catch (err) {
            console.error('[Dashboard] Failed to parse sales data:', err);
        }
    }, []);

    // 詳細表示ハンドラ（sourceRecordsで通算/今期を切り替え可能）
    const handleShowDetail = (type: DetailType, key: string, sourceRecords?: SalesRecord[]) => {
        if (!type) return;

        const records = sourceRecords || allRecords;
        let filtered: SalesRecord[] = [];
        switch (type) {
            case 'month':
                filtered = filterByMonth(records, key);
                break;
            case 'temple':
                filtered = filterByTemple(records, key);
                break;
            case 'subCategory':
                filtered = filterBySubCategory(records, key);
                break;
            case 'mainCategory':
                filtered = filterByMainCategory(records, key);
                break;
        }
        // 契約日の新しい順にソート
        filtered.sort((a, b) => b.contractDate.localeCompare(a.contractDate));

        setDetailType(type);
        setDetailKey(key);
        setDetailRecords(filtered);
        setDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setDetailOpen(false);
        setDetailType(null);
        setDetailKey('');
        setDetailRecords([]);
    };

    // 詳細ダイアログのタイトル
    const getDetailTitle = () => {
        switch (detailType) {
            case 'month': return `${detailKey} の売上明細`;
            case 'temple': return `${detailKey} の売上明細`;
            case 'subCategory': return `${detailKey} の売上明細`;
            case 'mainCategory': return `${detailKey} の売上明細`;
            default: return '売上明細';
        }
    };

    // 個別レコード詳細表示
    const handleShowRecordDetail = (record: SalesRecord) => {
        setSelectedRecord(record);
        setRecordDetailOpen(true);
    };

    const handleCloseRecordDetail = () => {
        setRecordDetailOpen(false);
        setSelectedRecord(null);
    };

    // 顧客詳細画面に遷移（契約者名から検索）
    const handleNavigateToCustomer = () => {
        if (selectedRecord) {
            // 顧客一覧画面に遷移して契約者名で検索
            navigate(`/customers?search=${encodeURIComponent(selectedRecord.contractor)}`);
            handleCloseRecordDetail();
            handleCloseDetail();
        }
    };

    // 月次推移グラフデータ
    const monthlyChartData = salesSummary?.monthlyData ? {
        labels: salesSummary.monthlyData.map(d => d.month.replace('年', '/').replace('月', '')),
        datasets: [
            {
                label: '申込額',
                data: salesSummary.monthlyData.map(d => d.applicationAmount),
                backgroundColor: 'rgba(25, 118, 210, 0.7)',
                borderColor: 'rgba(25, 118, 210, 1)',
                borderWidth: 1,
            },
        ],
    } : null;

    // 大分類別円グラフデータ
    const categoryColors = [
        'rgba(25, 118, 210, 0.8)',
        'rgba(76, 175, 80, 0.8)',
        'rgba(255, 152, 0, 0.8)',
        'rgba(156, 39, 176, 0.8)',
        'rgba(244, 67, 54, 0.8)',
        'rgba(0, 188, 212, 0.8)',
    ];

    // 通算：大分類別円グラフデータ
    const categoryPieData = salesSummary?.byMainCategory ? {
        labels: salesSummary.byMainCategory.map(d => d.category),
        datasets: [{
            data: salesSummary.byMainCategory.map(d => d.applicationAmount),
            backgroundColor: categoryColors.slice(0, salesSummary.byMainCategory.length),
            borderWidth: 1,
        }],
    } : null;

    // 今期：大分類別円グラフデータ
    const currentFYCategoryPieData = currentFYSummary?.byMainCategory ? {
        labels: currentFYSummary.byMainCategory.map(d => d.category),
        datasets: [{
            data: currentFYSummary.byMainCategory.map(d => d.applicationAmount),
            backgroundColor: categoryColors.slice(0, currentFYSummary.byMainCategory.length),
            borderWidth: 1,
        }],
    } : null;

    // 積み上げ棒グラフ用の色（寺院ごとに異なる色）
    const stackedColors = [
        'rgba(25, 118, 210, 0.8)',   // 青
        'rgba(76, 175, 80, 0.8)',    // 緑
        'rgba(255, 152, 0, 0.8)',    // オレンジ
        'rgba(156, 39, 176, 0.8)',   // 紫
        'rgba(244, 67, 54, 0.8)',    // 赤
        'rgba(0, 188, 212, 0.8)',    // シアン
        'rgba(255, 193, 7, 0.8)',    // 黄
        'rgba(121, 85, 72, 0.8)',    // 茶
        'rgba(158, 158, 158, 0.6)',  // グレー（その他）
    ];

    // 通算：エリア別×寺院別積み上げ棒グラフデータ
    const areaStackedChartData = areaTempleStacked ? {
        labels: areaTempleStacked.areas,
        datasets: areaTempleStacked.datasets.map((ds, idx) => ({
            label: ds.temple,
            data: ds.data,
            backgroundColor: stackedColors[idx % stackedColors.length],
            borderWidth: 1,
        })),
    } : null;

    // 今期：エリア別×寺院別積み上げ棒グラフデータ
    const currentFYAreaStackedChartData = currentFYAreaTempleStacked ? {
        labels: currentFYAreaTempleStacked.areas,
        datasets: currentFYAreaTempleStacked.datasets.map((ds, idx) => ({
            label: ds.temple,
            data: ds.data,
            backgroundColor: stackedColors[idx % stackedColors.length],
            borderWidth: 1,
        })),
    } : null;

    // 通算：寺院別棒グラフデータ（上位10件）
    const templeChartData = salesSummary?.byTemple ? {
        labels: salesSummary.byTemple.slice(0, 10).map(d => d.templeName),
        datasets: [{
            label: '申込額',
            data: salesSummary.byTemple.slice(0, 10).map(d => d.applicationAmount),
            backgroundColor: 'rgba(156, 39, 176, 0.7)',
            borderColor: 'rgba(156, 39, 176, 1)',
            borderWidth: 1,
        }],
    } : null;

    // 今期：寺院別棒グラフデータ（上位10件）
    const currentFYTempleChartData = currentFYSummary?.byTemple ? {
        labels: currentFYSummary.byTemple.slice(0, 10).map(d => d.templeName),
        datasets: [{
            label: '申込額',
            data: currentFYSummary.byTemple.slice(0, 10).map(d => d.applicationAmount),
            backgroundColor: 'rgba(255, 152, 0, 0.7)',
            borderColor: 'rgba(255, 152, 0, 1)',
            borderWidth: 1,
        }],
    } : null;

    // 月次棒グラフクリックハンドラ
    const handleMonthlyChartClick = (_event: ChartEvent, elements: ActiveElement[]) => {
        if (elements.length > 0 && salesSummary?.monthlyData) {
            const index = elements[0].index;
            const monthData = salesSummary.monthlyData[index];
            if (monthData) {
                handleShowDetail('month', monthData.month);
            }
        }
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: handleMonthlyChartClick,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<'bar'>) => {
                        const value = context.raw as number;
                        return `申込額: ¥${value.toLocaleString()}`;
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    font: { size: 11 },
                },
            },
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value: number | string) => {
                        const num = typeof value === 'number' ? value : parseFloat(value);
                        if (num >= 1000000) return `¥${(num / 1000000).toFixed(1)}M`;
                        if (num >= 1000) return `¥${(num / 1000).toFixed(0)}K`;
                        return `¥${num}`;
                    },
                },
            },
        },
    };

    // 円グラフクリックハンドラ（大分類・通算）
    const handleCategoryPieClick = (_event: ChartEvent, elements: ActiveElement[]) => {
        if (elements.length > 0 && salesSummary?.byMainCategory) {
            const index = elements[0].index;
            const categoryData = salesSummary.byMainCategory[index];
            if (categoryData) {
                handleShowDetail('mainCategory', categoryData.category);
            }
        }
    };

    // 円グラフクリックハンドラ（大分類・今期）
    const handleCategoryPieClickCurrentFY = (_event: ChartEvent, elements: ActiveElement[]) => {
        if (elements.length > 0 && currentFYSummary?.byMainCategory) {
            const index = elements[0].index;
            const categoryData = currentFYSummary.byMainCategory[index];
            if (categoryData) {
                handleShowDetail('mainCategory', categoryData.category, currentFYRecords);
            }
        }
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: handleCategoryPieClick,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: { font: { size: 11 } },
            },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<'pie'>) => {
                        const value = context.raw as number;
                        return `${context.label}: ¥${value.toLocaleString()}`;
                    },
                },
            },
        },
    };

    // 円グラフ用オプション（今期）
    const currentFYPieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: handleCategoryPieClickCurrentFY,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: { font: { size: 11 } },
            },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<'pie'>) => {
                        const value = context.raw as number;
                        return `${context.label}: ¥${value.toLocaleString()}`;
                    },
                },
            },
        },
    };

    // 寺院別横棒グラフクリックハンドラ（通算）
    const handleTempleChartClick = (_event: ChartEvent, elements: ActiveElement[]) => {
        if (elements.length > 0 && salesSummary?.byTemple) {
            const index = elements[0].index;
            const templeData = salesSummary.byTemple[index];
            if (templeData) {
                handleShowDetail('temple', templeData.templeName);
            }
        }
    };

    // 寺院別横棒グラフクリックハンドラ（今期）
    const handleTempleChartClickCurrentFY = (_event: ChartEvent, elements: ActiveElement[]) => {
        if (elements.length > 0 && currentFYSummary?.byTemple) {
            const index = elements[0].index;
            const templeData = currentFYSummary.byTemple[index];
            if (templeData) {
                handleShowDetail('temple', templeData.templeName, currentFYRecords);
            }
        }
    };

    // 横棒グラフ用オプション（寺院別売上TOP10・通算）
    const horizontalBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        onClick: handleTempleChartClick,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<'bar'>) => {
                        const value = context.raw as number;
                        return `申込額: ¥${value.toLocaleString()}`;
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    callback: (value: number | string) => {
                        const num = typeof value === 'number' ? value : parseFloat(value);
                        if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
                        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                        return num;
                    },
                },
            },
            y: {
                ticks: {
                    font: { size: 11 },
                    autoSkip: false,
                },
            },
        },
    };

    // 横棒グラフ用オプション（寺院別売上TOP10・今期）
    const currentFYHorizontalBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        onClick: handleTempleChartClickCurrentFY,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<'bar'>) => {
                        const value = context.raw as number;
                        return `申込額: ¥${value.toLocaleString()}`;
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    callback: (value: number | string) => {
                        const num = typeof value === 'number' ? value : parseFloat(value);
                        if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
                        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                        return num;
                    },
                },
            },
            y: {
                ticks: {
                    font: { size: 11 },
                    autoSkip: false,
                },
            },
        },
    };

    // 積み上げ棒グラフクリックハンドラ（エリア別×寺院別・通算）
    const handleStackedBarClick = (_event: ChartEvent, elements: ActiveElement[]) => {
        if (elements.length > 0 && areaTempleStacked) {
            const datasetIndex = elements[0].datasetIndex;
            const temple = areaTempleStacked.datasets[datasetIndex]?.temple;
            if (temple && temple !== 'その他') {
                handleShowDetail('temple', temple);
            }
        }
    };

    // 積み上げ棒グラフクリックハンドラ（エリア別×寺院別・今期）
    const handleStackedBarClickCurrentFY = (_event: ChartEvent, elements: ActiveElement[]) => {
        if (elements.length > 0 && currentFYAreaTempleStacked) {
            const datasetIndex = elements[0].datasetIndex;
            const temple = currentFYAreaTempleStacked.datasets[datasetIndex]?.temple;
            if (temple && temple !== 'その他') {
                handleShowDetail('temple', temple, currentFYRecords);
            }
        }
    };

    // 積み上げ棒グラフ用オプション（エリア別×寺院別・通算）
    const stackedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: handleStackedBarClick,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    font: { size: 10 },
                    boxWidth: 12,
                },
            },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<'bar'>) => {
                        const value = context.raw as number;
                        return `${context.dataset.label}: ¥${value.toLocaleString()}`;
                    },
                },
            },
        },
        scales: {
            x: {
                stacked: true,
                ticks: {
                    font: { size: 11 },
                },
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: {
                    callback: (value: number | string) => {
                        const num = typeof value === 'number' ? value : parseFloat(value);
                        if (num >= 1000000) return `¥${(num / 1000000).toFixed(1)}M`;
                        if (num >= 1000) return `¥${(num / 1000).toFixed(0)}K`;
                        return `¥${num}`;
                    },
                },
            },
        },
    };

    // 積み上げ棒グラフ用オプション（エリア別×寺院別・今期）
    const currentFYStackedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: handleStackedBarClickCurrentFY,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    font: { size: 10 },
                    boxWidth: 12,
                },
            },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<'bar'>) => {
                        const value = context.raw as number;
                        return `${context.dataset.label}: ¥${value.toLocaleString()}`;
                    },
                },
            },
        },
        scales: {
            x: {
                stacked: true,
                ticks: {
                    font: { size: 11 },
                },
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: {
                    callback: (value: number | string) => {
                        const num = typeof value === 'number' ? value : parseFloat(value);
                        if (num >= 1000000) return `¥${(num / 1000000).toFixed(1)}M`;
                        if (num >= 1000) return `¥${(num / 1000).toFixed(0)}K`;
                        return `¥${num}`;
                    },
                },
            },
        },
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                売上管理ダッシュボード
            </Typography>

            {/* サマリーカード（今期 2025/2〜2026/1） */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* 今期申込額 */}
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <TrendingUpIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="body2" color="text.secondary">今期申込額</Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                {currentFYSummary ? formatCurrency(currentFYSummary.totalApplicationAmount) : '-'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 今期入金額 */}
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AccountBalanceIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="body2" color="text.secondary">今期入金額</Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                {currentFYSummary ? formatCurrency(currentFYSummary.totalPaymentAmount) : '-'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 今期契約件数 */}
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <ReceiptIcon color="info" fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="body2" color="text.secondary">今期契約件数</Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                {currentFYSummary ? currentFYSummary.contractCount.toLocaleString() : '-'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 今期入金率 */}
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">今期入金率</Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                                {currentFYSummary ? formatPercent(currentFYSummary.paymentRate) : '-'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* グラフセクション */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* 月次推移グラフ */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>月次推移</Typography>
                            <Box sx={{ height: 300 }}>
                                {monthlyChartData ? (
                                    <Bar data={monthlyChartData} options={chartOptions} />
                                ) : (
                                    <Typography color="text.secondary">データなし</Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

            </Grid>

            {/* 大分類別構成比セクション */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* 大分類別円グラフ（通算） */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CategoryIcon fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="h6">大分類別構成比（通算）</Typography>
                            </Box>
                            <Box sx={{ height: 280 }}>
                                {categoryPieData ? (
                                    <Pie data={categoryPieData} options={pieOptions} />
                                ) : (
                                    <Typography color="text.secondary">データなし</Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                {/* 大分類別円グラフ（今期） */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CategoryIcon fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="h6">大分類別構成比（今期 2025/2〜）</Typography>
                            </Box>
                            <Box sx={{ height: 280 }}>
                                {currentFYCategoryPieData ? (
                                    <Pie data={currentFYCategoryPieData} options={currentFYPieOptions} />
                                ) : (
                                    <Typography color="text.secondary">データなし</Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* エリア別×寺院別売上セクション（積み上げ棒グラフ） */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* エリア別×寺院別グラフ（通算） */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <LocationOnIcon fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="h6">エリア別×寺院別売上（通算）</Typography>
                            </Box>
                            <Box sx={{ height: 350 }}>
                                {areaStackedChartData ? (
                                    <Bar data={areaStackedChartData} options={stackedBarOptions} />
                                ) : (
                                    <Typography color="text.secondary">データなし</Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* エリア別×寺院別グラフ（今期） */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <LocationOnIcon fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="h6">エリア別×寺院別売上（今期 2025/2〜）</Typography>
                            </Box>
                            <Box sx={{ height: 350 }}>
                                {currentFYAreaStackedChartData ? (
                                    <Bar data={currentFYAreaStackedChartData} options={currentFYStackedBarOptions} />
                                ) : (
                                    <Typography color="text.secondary">データなし</Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 寺院別売上セクション */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* 寺院別グラフ（通算） */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AccountBalanceIcon fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="h6">寺院別売上 TOP10（通算）</Typography>
                            </Box>
                            <Box sx={{ height: 320 }}>
                                {templeChartData ? (
                                    <Bar data={templeChartData} options={horizontalBarOptions} />
                                ) : (
                                    <Typography color="text.secondary">データなし</Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 寺院別グラフ（今期） */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AccountBalanceIcon fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="h6">寺院別売上 TOP10（今期 2025/2〜）</Typography>
                            </Box>
                            <Box sx={{ height: 320 }}>
                                {currentFYTempleChartData ? (
                                    <Bar data={currentFYTempleChartData} options={currentFYHorizontalBarOptions} />
                                ) : (
                                    <Typography color="text.secondary">データなし</Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* テーブルセクション */}
            <Grid container spacing={2}>
                {/* 月次推移テーブル */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>月次推移（詳細）</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                ※ 行をクリックで明細表示
                            </Typography>
                            {salesSummary?.monthlyData ? (
                                <TableContainer sx={{ maxHeight: 300 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>月</TableCell>
                                                <TableCell align="right">申込額</TableCell>
                                                <TableCell align="right">入金額</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {[...salesSummary.monthlyData].reverse().map((row) => (
                                                <TableRow
                                                    key={row.month}
                                                    hover
                                                    onClick={() => handleShowDetail('month', row.month)}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    <TableCell>{row.month}</TableCell>
                                                    <TableCell align="right">{formatCurrency(row.applicationAmount)}</TableCell>
                                                    <TableCell align="right">{formatCurrency(row.paymentAmount)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Typography color="text.secondary">データなし</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* 寺院別年間売上テーブル */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>寺院別年間売上</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                ※ 行をクリックで明細表示
                            </Typography>
                            {salesSummary?.byTemple ? (
                                <TableContainer sx={{ maxHeight: 300 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>寺院名</TableCell>
                                                <TableCell align="right">申込額</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {salesSummary.byTemple.slice(0, 15).map((row) => (
                                                <TableRow
                                                    key={row.templeName}
                                                    hover
                                                    onClick={() => handleShowDetail('temple', row.templeName)}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {row.templeName}
                                                    </TableCell>
                                                    <TableCell align="right">{formatCurrency(row.applicationAmount)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Typography color="text.secondary">データなし</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* 分類別（小分類）テーブル */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>分類別(小分類)</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                ※ 行をクリックで明細表示
                            </Typography>
                            {salesSummary?.bySubCategory ? (
                                <TableContainer sx={{ maxHeight: 300 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>分類</TableCell>
                                                <TableCell align="right">申込額</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {salesSummary.bySubCategory.slice(0, 10).map((row) => (
                                                <TableRow
                                                    key={row.category}
                                                    hover
                                                    onClick={() => handleShowDetail('subCategory', row.category)}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    <TableCell sx={{ fontSize: '0.8rem' }}>{row.category}</TableCell>
                                                    <TableCell align="right" sx={{ fontSize: '0.8rem' }}>
                                                        {formatCurrency(row.applicationAmount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Typography color="text.secondary">データなし</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 詳細ダイアログ */}
            <Dialog
                open={detailOpen}
                onClose={handleCloseDetail}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getDetailTitle()}
                        <Chip
                            label={`${detailRecords.length}件`}
                            size="small"
                            color="primary"
                        />
                    </Box>
                    <IconButton onClick={handleCloseDetail} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        ※ 行をクリックで詳細表示
                    </Typography>
                    <TableContainer sx={{ maxHeight: 500 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>契約日</TableCell>
                                    <TableCell>契約者</TableCell>
                                    <TableCell>寺院</TableCell>
                                    <TableCell>エリア</TableCell>
                                    <TableCell>分類</TableCell>
                                    <TableCell align="right">申込額</TableCell>
                                    <TableCell align="right">入金済</TableCell>
                                    <TableCell align="right">残高</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {detailRecords.map((record) => (
                                    <TableRow
                                        key={record.id}
                                        hover
                                        onClick={() => handleShowRecordDetail(record)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{record.contractDate}</TableCell>
                                        <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {record.contractor}
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {record.templeName}
                                        </TableCell>
                                        <TableCell>{record.area}</TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {record.subCategory}
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(record.applicationAmount)}</TableCell>
                                        <TableCell align="right">{formatCurrency(record.paymentTotal)}</TableCell>
                                        <TableCell align="right" sx={{ color: record.balance > 0 ? 'error.main' : 'success.main' }}>
                                            {formatCurrency(record.balance)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {detailRecords.length > 0 && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <Typography variant="body2" color="text.secondary">合計申込額</Typography>
                                    <Typography variant="h6">
                                        {formatCurrency(detailRecords.reduce((sum, r) => sum + r.applicationAmount, 0))}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" color="text.secondary">合計入金額</Typography>
                                    <Typography variant="h6">
                                        {formatCurrency(detailRecords.reduce((sum, r) => sum + r.paymentTotal, 0))}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="body2" color="text.secondary">合計残高</Typography>
                                    <Typography variant="h6" color="error.main">
                                        {formatCurrency(detailRecords.reduce((sum, r) => sum + r.balance, 0))}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* 個別レコード詳細ダイアログ */}
            <Dialog
                open={recordDetailOpen}
                onClose={handleCloseRecordDetail}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    売上レコード詳細
                    <IconButton onClick={handleCloseRecordDetail} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {selectedRecord && (
                        <Box>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">契約者</Typography>
                                <Typography variant="h6">{selectedRecord.contractor}</Typography>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">契約日</Typography>
                                    <Typography>{selectedRecord.contractDate}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">計上月</Typography>
                                    <Typography>{selectedRecord.salesMonth || '-'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">寺院</Typography>
                                    <Typography>{selectedRecord.templeName}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">エリア</Typography>
                                    <Typography>{selectedRecord.area}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">大分類</Typography>
                                    <Typography>{selectedRecord.mainCategory}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">小分類</Typography>
                                    <Typography>{selectedRecord.subCategory}</Typography>
                                </Grid>
                            </Grid>
                            <Divider sx={{ my: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <Typography variant="subtitle2" color="text.secondary">申込額</Typography>
                                    <Typography variant="h6" color="primary.main">
                                        {formatCurrency(selectedRecord.applicationAmount)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="subtitle2" color="text.secondary">入金済</Typography>
                                    <Typography variant="h6" color="success.main">
                                        {formatCurrency(selectedRecord.paymentTotal)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={4}>
                                    <Typography variant="subtitle2" color="text.secondary">残高</Typography>
                                    <Typography
                                        variant="h6"
                                        color={selectedRecord.balance > 0 ? 'error.main' : 'success.main'}
                                    >
                                        {formatCurrency(selectedRecord.balance)}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseRecordDetail}>
                        閉じる
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<OpenInNewIcon />}
                        onClick={handleNavigateToCustomer}
                    >
                        顧客を検索
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
