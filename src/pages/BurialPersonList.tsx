/**
 * 埋葬者一覧ページ
 * geniee CRMからインポートした埋葬者データを表示
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
import { getBurialPersons } from '../api/burialPersons';
import type { BurialPerson } from '../types/firestore';

// 日付フォーマット
function formatDate(date: string | undefined): string {
    if (!date) return '-';
    return date;
}

export function BurialPersonList() {
    const navigate = useNavigate();
    const [persons, setPersons] = useState<BurialPerson[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [burialStatusFilter, setBurialStatusFilter] = useState<string>('all');
    const [locationFilter, setLocationFilter] = useState<string>('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // データ取得
    useEffect(() => {
        const fetchData = async () => {
            try {
                const personsData = await getBurialPersons(10000);
                setPersons(personsData);
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
        persons.forEach(p => {
            if (p.location) locationSet.add(p.location);
        });
        return Array.from(locationSet).sort();
    }, [persons]);

    // 埋葬ステータスリストを取得
    const burialStatuses = useMemo(() => {
        const statusSet = new Set<string>();
        persons.forEach(p => {
            if (p.burialStatus) statusSet.add(p.burialStatus);
        });
        return Array.from(statusSet).sort();
    }, [persons]);

    // フィルタリング
    const filteredPersons = useMemo(() => {
        return persons
            .filter(p => {
                // 埋葬ステータスフィルタ
                if (burialStatusFilter !== 'all' && p.burialStatus !== burialStatusFilter) return false;
                // 拠点フィルタ
                if (locationFilter !== 'all' && p.location !== locationFilter) return false;
                // 検索
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    return (
                        p.userName?.toLowerCase().includes(term) ||
                        p.userNameKana?.toLowerCase().includes(term) ||
                        p.buriedPersonName?.toLowerCase().includes(term) ||
                        p.buriedPersonNameKana?.toLowerCase().includes(term) ||
                        p.dealName?.toLowerCase().includes(term) ||
                        p.plotNumber?.toLowerCase().includes(term) ||
                        p.certificateNumber?.toLowerCase().includes(term) ||
                        p.posthumousName?.toLowerCase().includes(term)
                    );
                }
                return true;
            })
            .sort((a, b) => {
                // 埋葬日または作成日でソート（降順）
                const dateA = a.burialDate || a.genieCreatedAt || '';
                const dateB = b.burialDate || b.genieCreatedAt || '';
                return dateB.localeCompare(dateA);
            });
    }, [persons, searchTerm, burialStatusFilter, locationFilter]);

    // ページネーション
    const paginatedPersons = useMemo(() => {
        return filteredPersons.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [filteredPersons, page, rowsPerPage]);

    // 集計
    const totals = useMemo(() => {
        const buried = filteredPersons.filter(p => p.burialStatus === '有' || p.burialStatus === '有り');
        return {
            totalCount: filteredPersons.length,
            buriedCount: buried.length,
            engravingCount: filteredPersons.filter(p => p.engravingStatus === '有' || p.engravingStatus === '有り').length,
        };
    }, [filteredPersons]);

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
                    樹木墓オプション（埋葬者）
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/burial-persons/new')}
                >
                    新規作成
                </Button>
            </Box>

            {/* サマリー */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Chip label={`全件: ${totals.totalCount}件`} />
                <Chip label={`埋葬済: ${totals.buriedCount}件`} color="success" />
                <Chip label={`彫刻有: ${totals.engravingCount}件`} color="info" />
            </Box>

            {/* フィルター */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    placeholder="使用者名・埋葬者・商談名・戒名で検索"
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
                    <InputLabel>埋葬有無</InputLabel>
                    <Select
                        value={burialStatusFilter}
                        label="埋葬有無"
                        onChange={(e) => {
                            setBurialStatusFilter(e.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="all">すべて</MenuItem>
                        {burialStatuses.map(status => (
                            <MenuItem key={status} value={status}>{status}</MenuItem>
                        ))}
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
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>埋葬有無</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>埋葬日</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>使用者名</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>埋葬者</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>続柄</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>戒名</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>拠点</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>区画/種類</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>区画NO</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>彫刻有無</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>商談名</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', whiteSpace: 'nowrap' }}>契約日</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedPersons.map((person) => (
                            <TableRow
                                key={person.id}
                                hover
                                onClick={() => navigate(`/burial-persons/${person.id}`)}
                                sx={{ cursor: 'pointer' }}
                            >
                                <TableCell>
                                    <Chip
                                        label={person.burialStatus || '-'}
                                        color={person.burialStatus === '有' || person.burialStatus === '有り' ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(person.burialDate)}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{person.userName || '-'}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{person.buriedPersonName || '-'}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{person.relationshipToUser || '-'}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {person.posthumousName || '-'}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{person.location || '-'}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{person.plotType || '-'}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{person.plotNumber || '-'}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={person.engravingStatus || '-'}
                                        color={person.engravingStatus === '有' || person.engravingStatus === '有り' ? 'info' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {person.dealName || '-'}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(person.contractDate)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ページネーション */}
            <TablePagination
                component="div"
                count={filteredPersons.length}
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
