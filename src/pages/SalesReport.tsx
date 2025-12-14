/**
 * 売上管理表ページ
 * 契約済み商談から2025/2〜2026/1の売上データを表形式で表示
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Button,
    Chip,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    Download as DownloadIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { getDeals } from '../api/deals';
import { getTemples } from '../api/temples';
import type { Deal, Temple } from '../types/firestore';
import { formatCurrency as formatCurrencyBase } from '../utils/format';

// 今期（2025/2〜2026/1）の契約日かどうかを判定
// 日付形式: YYYY-MM-DD または YYYY/MM/DD に対応
function isCurrentFiscalYear(contractDate: string | undefined): boolean {
    if (!contractDate) return false;

    // 両方の形式に対応
    let parts: string[];
    if (contractDate.includes('-')) {
        parts = contractDate.split('-');
    } else if (contractDate.includes('/')) {
        parts = contractDate.split('/');
    } else {
        return false;
    }

    if (parts.length !== 3) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (year === 2025 && month >= 2) return true;
    if (year === 2026 && month === 1) return true;
    return false;
}

// 金額フォーマット（空文字をデフォルトに）
function formatCurrency(amount: number | undefined): string {
    return formatCurrencyBase(amount, { fallback: '' });
}

// 日付フォーマット（YYYY-MM-DD → YYYY/M/D）
function formatDate(date: string | undefined): string {
    if (!date) return '';
    // YYYY-MM-DD形式の場合、YYYY/M/D形式に変換
    if (date.includes('-')) {
        const parts = date.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            return `${year}/${month}/${day}`;
        }
    }
    return date;
}

export function SalesReport() {
    const navigate = useNavigate();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [temples, setTemples] = useState<Temple[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // データ取得
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dealsData, templesData] = await Promise.all([
                    getDeals(10000),
                    getTemples(),
                ]);
                setDeals(dealsData);
                setTemples(templesData);
            } catch (err) {
                console.error('データ取得エラー:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 寺院名からエリアを取得するマップ
    const templeAreaMap = useMemo(() => {
        const map = new Map<string, string>();
        temples.forEach(t => {
            if (t.name && t.area) {
                map.set(t.name, t.area);
            }
        });
        return map;
    }, [temples]);

    // フィルタリング: 契約済み + 今期（2025/2〜2026/1）
    const filteredDeals = useMemo(() => {
        return deals
            .filter(d => d.stage === 'contracted')
            .filter(d => isCurrentFiscalYear(d.contractDate))
            .filter(d => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                    d.customerName?.toLowerCase().includes(term) ||
                    d.templeName?.toLowerCase().includes(term) ||
                    d.customerTrackingNo?.toLowerCase().includes(term)
                );
            })
            .sort((a, b) => {
                // 契約日でソート
                const dateA = a.contractDate || '';
                const dateB = b.contractDate || '';
                return dateA.localeCompare(dateB);
            });
    }, [deals, searchTerm]);

    // CSVエクスポート
    const handleExportCSV = () => {
        const headers = [
            '追客NO',
            '契約日',
            '契約者',
            '寺院名',
            'エリア',
            '申込実績',
            '入金日１',
            '入金額１',
            '入金日２',
            '入金額２',
            '入金日３',
            '入金額３',
            '入金合計',
            '残金',
            '小分類',
            '大分類',
            '備考',
            '工事完了引渡日',
            '修正有無',
            '売上計上月',
        ];

        const rows = filteredDeals.map((deal) => {
            const area = templeAreaMap.get(deal.templeName || '') || '';
            return [
                deal.customerTrackingNo || '',
                formatDate(deal.contractDate),
                deal.customerName || '',
                deal.templeName || '',
                area,
                deal.amount ? `"¥${deal.amount.toLocaleString()}"` : '',
                formatDate(deal.paymentDate1),
                deal.paymentAmount1 ? `"¥${deal.paymentAmount1.toLocaleString()}"` : '',
                formatDate(deal.paymentDate2),
                deal.paymentAmount2 ? `"¥${deal.paymentAmount2.toLocaleString()}"` : '',
                formatDate(deal.paymentDate3),
                deal.paymentAmount3 ? `"¥${deal.paymentAmount3.toLocaleString()}"` : '',
                deal.totalPayment ? `"¥${deal.totalPayment.toLocaleString()}"` : '',
                deal.remainingBalance !== undefined ? `"¥${deal.remainingBalance.toLocaleString()}"` : '',
                deal.productSubcategory || '',
                deal.productCategory || '',
                `"${(deal.notes || '').replace(/"/g, '""')}"`,
                formatDate(deal.deliveryDate),
                '',
                deal.salesMonth || '',
            ];
        });

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `売上管理表_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // 合計計算
    const totals = useMemo(() => {
        return filteredDeals.reduce(
            (acc, deal) => ({
                amount: acc.amount + (deal.amount || 0),
                totalPayment: acc.totalPayment + (deal.totalPayment || 0),
                remainingBalance: acc.remainingBalance + (deal.remainingBalance || 0),
            }),
            { amount: 0, totalPayment: 0, remainingBalance: 0 }
        );
    }, [filteredDeals]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    売上管理表（今期 2025/2〜2026/1）
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportCSV}
                >
                    CSVエクスポート
                </Button>
            </Box>

            {/* サマリー */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Chip label={`契約件数: ${filteredDeals.length}件`} color="primary" />
                <Chip label={`申込実績合計: ${formatCurrency(totals.amount)}`} color="success" />
                <Chip label={`入金合計: ${formatCurrency(totals.totalPayment)}`} color="info" />
                <Chip label={`残金合計: ${formatCurrency(totals.remainingBalance)}`} color="warning" />
            </Box>

            {/* 検索 */}
            <TextField
                size="small"
                placeholder="契約者・寺院名・追客NOで検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 2, width: 300 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
            />

            {/* テーブル */}
            <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>追客NO</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>契約日</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>契約者</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>寺院名</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>エリア</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }} align="right">申込実績</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>入金日１</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }} align="right">入金額１</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>入金日２</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }} align="right">入金額２</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>入金日３</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }} align="right">入金額３</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }} align="right">入金合計</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }} align="right">残金</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>小分類</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>大分類</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>備考</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>工事完了引渡日</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>修正有無</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>売上計上月</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredDeals.map((deal) => {
                            const area = templeAreaMap.get(deal.templeName || '') || '-';
                            return (
                                <TableRow
                                    key={deal.id}
                                    hover
                                    onClick={() => navigate(`/deals/${deal.id}`)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.customerTrackingNo || '-'}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(deal.contractDate) || '-'}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.customerName || '-'}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.templeName || '-'}</TableCell>
                                    <TableCell>{area}</TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(deal.amount)}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(deal.paymentDate1)}</TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(deal.paymentAmount1)}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(deal.paymentDate2)}</TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(deal.paymentAmount2)}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(deal.paymentDate3)}</TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(deal.paymentAmount3)}</TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(deal.totalPayment)}</TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(deal.remainingBalance)}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.productSubcategory || '-'}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.productCategory || '-'}</TableCell>
                                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={deal.notes}>
                                        {deal.notes || ''}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(deal.deliveryDate)}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.salesMonth || ''}</TableCell>
                                </TableRow>
                            );
                        })}
                        {/* 合計行 */}
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell colSpan={5} sx={{ fontWeight: 600 }}>合計</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(totals.amount)}</TableCell>
                            <TableCell colSpan={6}></TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(totals.totalPayment)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(totals.remainingBalance)}</TableCell>
                            <TableCell colSpan={6}></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
