/**
 * 樹木墓商談一覧ページ
 * geniee CRMからインポートした樹木墓商談データを表示
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
    TextField,
    InputAdornment,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TablePagination,
    Button,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { getTreeBurialDeals } from '../api/treeBurialDeals';
import type { TreeBurialDeal, TreeBurialDealStatus } from '../types/firestore';
import { TREE_BURIAL_DEAL_STATUS_LABELS, TREE_BURIAL_CATEGORY_LABELS } from '../types/firestore';
import { formatCurrency } from '../utils/format';

// ステータスの色
const STATUS_COLORS: Record<TreeBurialDealStatus, 'success' | 'error' | 'warning'> = {
    contracted: 'success',
    lost: 'error',
    pending: 'warning',
};

// 日付フォーマット
function formatDate(date: string | undefined): string {
    if (!date) return '-';
    return date;
}

export function TreeBurialDealList() {
    const navigate = useNavigate();
    const [deals, setDeals] = useState<TreeBurialDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [locationFilter, setLocationFilter] = useState<string>('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // データ取得
    useEffect(() => {
        const fetchData = async () => {
            try {
                const dealsData = await getTreeBurialDeals(10000);
                setDeals(dealsData);
            } catch (err) {
                console.error('データ取得エラー:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 拠点リストを取得
    const locations = useMemo(() => {
        const locationSet = new Set<string>();
        deals.forEach(d => {
            if (d.location) locationSet.add(d.location);
        });
        return Array.from(locationSet).sort();
    }, [deals]);

    // フィルタリング
    const filteredDeals = useMemo(() => {
        return deals
            .filter(d => {
                // ステータスフィルタ
                if (statusFilter !== 'all' && d.status !== statusFilter) return false;
                // 拠点フィルタ
                if (locationFilter !== 'all' && d.location !== locationFilter) return false;
                // 検索
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    return (
                        d.dealName?.toLowerCase().includes(term) ||
                        d.userName?.toLowerCase().includes(term) ||
                        d.userNameKana?.toLowerCase().includes(term) ||
                        d.plotNumber?.toLowerCase().includes(term) ||
                        d.certificateNumber?.toLowerCase().includes(term)
                    );
                }
                return true;
            })
            .sort((a, b) => {
                // 申込日でソート（降順）
                const dateA = a.applicationDate || a.genieCreatedAt || '';
                const dateB = b.applicationDate || b.genieCreatedAt || '';
                return dateB.localeCompare(dateA);
            });
    }, [deals, searchTerm, statusFilter, locationFilter]);

    // ページネーション
    const paginatedDeals = useMemo(() => {
        return filteredDeals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [filteredDeals, page, rowsPerPage]);

    // 集計
    const totals = useMemo(() => {
        const contracted = filteredDeals.filter(d => d.status === 'contracted');
        return {
            totalCount: filteredDeals.length,
            contractedCount: contracted.length,
            totalAmount: contracted.reduce((sum, d) => sum + (d.totalAmount || 0), 0),
            saiProSales: contracted.reduce((sum, d) => sum + (d.saiProSales || 0), 0),
        };
    }, [filteredDeals]);

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

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
                    樹木墓商談
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/tree-burial-deals/new')}
                >
                    新規作成
                </Button>
            </Box>

            {/* サマリー */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Chip label={`全件: ${totals.totalCount}件`} />
                <Chip label={`成約: ${totals.contractedCount}件`} color="success" />
                <Chip label={`成約金額合計: ${formatCurrency(totals.totalAmount)}`} color="primary" />
                <Chip label={`彩プロ売上合計: ${formatCurrency(totals.saiProSales)}`} color="info" />
            </Box>

            {/* フィルター */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    placeholder="商談名・使用者名・区画NOで検索"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(0);
                    }}
                    sx={{ width: 300 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>ステータス</InputLabel>
                    <Select
                        value={statusFilter}
                        label="ステータス"
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="all">すべて</MenuItem>
                        <MenuItem value="contracted">成約</MenuItem>
                        <MenuItem value="lost">失注</MenuItem>
                        <MenuItem value="pending">検討中</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>拠点</InputLabel>
                    <Select
                        value={locationFilter}
                        label="拠点"
                        onChange={(e) => {
                            setLocationFilter(e.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="all">すべて</MenuItem>
                        {locations.map(loc => (
                            <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* テーブル */}
            <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 350px)' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>ステータス</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>申込日</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>商談名</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>使用者名</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>拠点</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>区分</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>区画/種類</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>区画NO</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }} align="right">合計金額</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }} align="right">彩プロ売上</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>受付担当</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>承認証番号</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedDeals.map((deal) => (
                            <TableRow
                                key={deal.id}
                                hover
                                onClick={() => navigate(`/tree-burial-deals/${deal.id}`)}
                                sx={{ cursor: 'pointer' }}
                            >
                                <TableCell>
                                    <Chip
                                        label={TREE_BURIAL_DEAL_STATUS_LABELS[deal.status] || deal.status}
                                        color={STATUS_COLORS[deal.status] || 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(deal.applicationDate)}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {deal.dealName}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.userName || '-'}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.location}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                    {deal.category ? TREE_BURIAL_CATEGORY_LABELS[deal.category] : '-'}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.plotType || '-'}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.plotNumber || '-'}</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(deal.totalAmount)}</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(deal.saiProSales)}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.receptionist || '-'}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{deal.certificateNumber || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ページネーション */}
            <TablePagination
                component="div"
                count={filteredDeals.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[25, 50, 100, 200]}
                labelRowsPerPage="表示件数:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
            />
        </Box>
    );
}
