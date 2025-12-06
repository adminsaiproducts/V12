import { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    Receipt as ReceiptIcon,
    AccountBalance as AccountBalanceIcon,
    LocationOn as LocationOnIcon,
    Category as CategoryIcon,
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
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import {
    parseSalesCSV,
    calculateDashboardSummary,
    formatCurrency,
    formatPercent,
    type SalesDashboardSummary,
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

export function Dashboard() {
    const [salesSummary, setSalesSummary] = useState<SalesDashboardSummary | null>(null);

    // 売上データを解析
    useEffect(() => {
        try {
            const records = parseSalesCSV(salesCSVData);
            const summary = calculateDashboardSummary(records);
            setSalesSummary(summary);
            console.log(`[Dashboard] Sales data loaded: ${records.length} records`);
        } catch (err) {
            console.error('[Dashboard] Failed to parse sales data:', err);
        }
    }, []);

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
            {
                label: '入金額',
                data: salesSummary.monthlyData.map(d => d.paymentAmount),
                backgroundColor: 'rgba(76, 175, 80, 0.7)',
                borderColor: 'rgba(76, 175, 80, 1)',
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

    const categoryPieData = salesSummary?.byMainCategory ? {
        labels: salesSummary.byMainCategory.map(d => d.category),
        datasets: [{
            data: salesSummary.byMainCategory.map(d => d.applicationAmount),
            backgroundColor: categoryColors.slice(0, salesSummary.byMainCategory.length),
            borderWidth: 1,
        }],
    } : null;

    // エリア別棒グラフデータ
    const areaChartData = salesSummary?.byArea ? {
        labels: salesSummary.byArea.map(d => d.area),
        datasets: [
            {
                label: '申込額',
                data: salesSummary.byArea.map(d => d.applicationAmount),
                backgroundColor: 'rgba(25, 118, 210, 0.7)',
            },
            {
                label: '入金額',
                data: salesSummary.byArea.map(d => d.paymentAmount),
                backgroundColor: 'rgba(76, 175, 80, 0.7)',
            },
        ],
    } : null;

    // 寺院別棒グラフデータ（上位10件）
    const templeChartData = salesSummary?.byTemple ? {
        labels: salesSummary.byTemple.slice(0, 10).map(d =>
            d.templeName.length > 8 ? d.templeName.substring(0, 8) + '...' : d.templeName
        ),
        datasets: [{
            label: '申込額',
            data: salesSummary.byTemple.slice(0, 10).map(d => d.applicationAmount),
            backgroundColor: 'rgba(156, 39, 176, 0.7)',
            borderColor: 'rgba(156, 39, 176, 1)',
            borderWidth: 1,
        }],
    } : null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: { font: { size: 11 } },
            },
        },
        scales: {
            y: {
                ticks: {
                    callback: (value: number | string) => {
                        const num = typeof value === 'number' ? value : parseFloat(value);
                        if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
                        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                        return num;
                    },
                },
            },
        },
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
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

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                売上管理ダッシュボード
            </Typography>

            {/* サマリーカード */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* 総申込額 */}
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <TrendingUpIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="body2" color="text.secondary">総申込額</Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                {salesSummary ? formatCurrency(salesSummary.totalApplicationAmount) : '-'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 総入金額 */}
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AccountBalanceIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="body2" color="text.secondary">総入金額</Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                {salesSummary ? formatCurrency(salesSummary.totalPaymentAmount) : '-'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 契約件数 */}
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <ReceiptIcon color="info" fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="body2" color="text.secondary">契約件数</Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                {salesSummary ? salesSummary.contractCount.toLocaleString() : '-'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 入金率 */}
                <Grid item xs={6} md={3}>
                    <Card>
                        <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">入金率</Typography>
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                                {salesSummary ? formatPercent(salesSummary.paymentRate) : '-'}
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

                {/* 大分類別円グラフ */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CategoryIcon fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="h6">大分類別構成比</Typography>
                            </Box>
                            <Box sx={{ height: 300 }}>
                                {categoryPieData ? (
                                    <Pie data={categoryPieData} options={pieOptions} />
                                ) : (
                                    <Typography color="text.secondary">データなし</Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* エリア別グラフ */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <LocationOnIcon fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="h6">エリア別売上</Typography>
                            </Box>
                            <Box sx={{ height: 280 }}>
                                {areaChartData ? (
                                    <Bar data={areaChartData} options={chartOptions} />
                                ) : (
                                    <Typography color="text.secondary">データなし</Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 寺院別グラフ */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AccountBalanceIcon fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="h6">寺院別売上 TOP10</Typography>
                            </Box>
                            <Box sx={{ height: 280 }}>
                                {templeChartData ? (
                                    <Bar
                                        data={templeChartData}
                                        options={{
                                            ...chartOptions,
                                            indexAxis: 'y' as const,
                                        }}
                                    />
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
                                            {salesSummary.monthlyData.map((row) => (
                                                <TableRow key={row.month} hover>
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
                                                <TableRow key={row.templeName} hover>
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
                                                <TableRow key={row.category} hover>
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
        </Box>
    );
}
