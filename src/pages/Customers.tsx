import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Snackbar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Description as DescriptionIcon,
  Park as ParkIcon,
  Person as PersonIcon,
  Bolt as BoltIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useAlgoliaSearch } from '../hooks/useAlgoliaSearch';
import { CustomerForm, CustomerFormData } from '../components/CustomerForm';
import { SearchListBuilder } from '../components/SearchListBuilder';
import { createCustomer } from '../lib/customerService';
import { filterCustomers } from '../lib/filterEngine';
import { downloadCustomersCSV } from '../lib/csvExport';
import {
  getAllSearchLists,
  createSearchList,
  updateSearchList,
  deleteSearchList,
} from '../api/searchLists';
import type { CustomerSearchList } from '../types/searchList';

// 顧客オブジェクトから住所を組み立てるヘルパー関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCustomerAddress(customer: any): string {
  // 直接フィールドから住所を組み立て
  const parts = [
    customer.prefecture,
    customer.city,
    customer.town,
    // addressが文字列の場合は番地として使用
    typeof customer.address === 'string' ? customer.address : null,
    customer.building,
  ].filter((p) => p && typeof p === 'string' && p.trim() !== '');

  if (parts.length > 0) {
    return parts.join(' ');
  }

  // フォールバック: addressがオブジェクトの場合
  if (customer.address && typeof customer.address === 'object') {
    const addr = customer.address;
    const objParts = [
      addr.prefecture,
      addr.city,
      addr.town,
      addr.streetNumber,
      addr.building,
    ].filter((p) => p && typeof p === 'string');
    if (objParts.length > 0) {
      return objParts.join(' ');
    }
  }

  // フォールバック: addressがJSON文字列の場合（古いAlgoliaデータ）
  if (typeof customer.address === 'string' && customer.address.startsWith('{')) {
    try {
      const parsed = JSON.parse(customer.address);
      const jsonParts = [
        parsed.prefecture,
        parsed.city,
        parsed.town,
        parsed.streetNumber,
        parsed.building,
      ].filter((p) => p && typeof p === 'string');
      if (jsonParts.length > 0) {
        return jsonParts.join(' ');
      }
    } catch {
      // パースできない場合は無視
    }
  }

  return '-';
}

export function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const searchQuery = searchParams.get('q') || '';
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // 検索リスト関連の状態
  const [searchLists, setSearchLists] = useState<CustomerSearchList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('all');
  const [searchListsLoading, setSearchListsLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomerSearchList | null>(null);

  // メニュー関連
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuListId, setMenuListId] = useState<string | null>(null);

  // 新規作成ダイアログの状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Algolia検索を使用
  const { results, loading, error, totalHits, searchTime } = useAlgoliaSearch(searchQuery);

  // 検索リストを読み込み
  const loadSearchLists = useCallback(async () => {
    try {
      setSearchListsLoading(true);
      const lists = await getAllSearchLists();
      setSearchLists(lists);
    } catch (err) {
      console.error('Failed to load search lists:', err);
    } finally {
      setSearchListsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSearchLists();
  }, [loadSearchLists]);

  // 選択中のリストを取得
  const selectedList = useMemo(() => {
    return searchLists.find((list) => list.id === selectedListId);
  }, [searchLists, selectedListId]);

  // 拠点リストを取得
  const branches = useMemo(() => {
    const branchSet = new Set<string>();
    results.forEach((c) => {
      if (c.branch) branchSet.add(c.branch);
    });
    return Array.from(branchSet).sort();
  }, [results]);

  // フィルタリング（検索リストの条件 + 拠点フィルター）
  const filteredResults = useMemo(() => {
    console.log('[Customers] Filtering with:', {
      selectedListId,
      selectedList: selectedList ? { id: selectedList.id, name: selectedList.name, conditionGroups: selectedList.conditionGroups } : null,
      resultsCount: results.length,
    });

    let filtered = results;

    // 検索リストの条件を適用
    if (selectedList && selectedList.conditionGroups.length > 0) {
      console.log('[Customers] Applying filter conditions');
      filtered = filterCustomers(filtered, selectedList.conditionGroups);
    }

    // 拠点フィルターを適用
    if (branchFilter !== 'all') {
      filtered = filtered.filter((c) => c.branch === branchFilter);
    }

    return filtered;
  }, [results, selectedList, branchFilter, selectedListId]);

  // ページネーション
  const paginatedResults = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredResults.slice(start, start + rowsPerPage);
  }, [filteredResults, page, rowsPerPage]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value) {
      setSearchParams({ q: value });
    } else {
      setSearchParams({});
    }
  };

  const handleRowClick = (trackingNo: string) => {
    navigate(`/customers/${trackingNo}`);
  };

  // 新規顧客作成
  const handleCreateCustomer = async (data: CustomerFormData) => {
    try {
      const trackingNo = await createCustomer(data);
      setSnackbar({
        open: true,
        message: `顧客「${data.name}」を登録しました（追客No: ${trackingNo}）`,
        severity: 'success',
      });
      setCreateDialogOpen(false);
      // 新しい顧客の詳細ページに遷移
      navigate(`/customers/${trackingNo}`);
    } catch (err) {
      console.error('Failed to create customer:', err);
      setSnackbar({
        open: true,
        message: `登録に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`,
        severity: 'error',
      });
    }
  };

  // 検索リストを保存
  const handleSaveSearchList = async (list: CustomerSearchList) => {
    try {
      if (editingList && !editingList.isSystem) {
        // 更新
        await updateSearchList(list.id, {
          name: list.name,
          conditionGroups: list.conditionGroups,
        });
        setSnackbar({
          open: true,
          message: `リスト「${list.name}」を更新しました`,
          severity: 'success',
        });
      } else {
        // 新規作成
        const newId = await createSearchList(list.name, list.conditionGroups);
        setSelectedListId(newId);
        setSnackbar({
          open: true,
          message: `リスト「${list.name}」を作成しました`,
          severity: 'success',
        });
      }
      setBuilderOpen(false);
      setEditingList(null);
      loadSearchLists();
    } catch (err) {
      console.error('Failed to save search list:', err);
      setSnackbar({
        open: true,
        message: `保存に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`,
        severity: 'error',
      });
    }
  };

  // 検索リストを削除
  const handleDeleteSearchList = async (listId: string) => {
    const list = searchLists.find((l) => l.id === listId);
    if (!list || list.isSystem) return;

    if (!window.confirm(`リスト「${list.name}」を削除しますか？`)) return;

    try {
      await deleteSearchList(listId);
      if (selectedListId === listId) {
        setSelectedListId('all');
      }
      setSnackbar({
        open: true,
        message: `リスト「${list.name}」を削除しました`,
        severity: 'success',
      });
      loadSearchLists();
    } catch (err) {
      console.error('Failed to delete search list:', err);
      setSnackbar({
        open: true,
        message: `削除に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`,
        severity: 'error',
      });
    }
    setMenuAnchor(null);
  };

  // CSVダウンロード
  const handleDownloadCSV = () => {
    const listName = selectedList?.name || '全顧客';
    const filename = `${listName}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCustomersCSV(filteredResults, filename);
    setSnackbar({
      open: true,
      message: `${filteredResults.length}件のデータをダウンロードしました`,
      severity: 'success',
    });
  };

  // メニュー操作
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, listId: string) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuListId(listId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuListId(null);
  };

  const handleEditList = () => {
    const list = searchLists.find((l) => l.id === menuListId);
    if (list && !list.isSystem) {
      setEditingList(list);
      setBuilderOpen(true);
    }
    handleMenuClose();
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading && searchListsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          顧客一覧
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCSV}
            disabled={filteredResults.length === 0}
          >
            CSV
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新規登録
          </Button>
        </Box>
      </Box>

      {/* 検索リスト選択 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>リスト</InputLabel>
            <Select
              value={selectedListId}
              label="リスト"
              onChange={(e) => {
                setSelectedListId(e.target.value);
                setPage(0);
              }}
              startAdornment={<FilterListIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              {searchLists.map((list) => (
                <MenuItem key={list.id} value={list.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <span>{list.name}</span>
                    {!list.isSystem && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, list.id)}
                        sx={{ ml: 1 }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingList(null);
              setBuilderOpen(true);
            }}
          >
            リスト編集
          </Button>

          {selectedList && !selectedList.isSystem && (
            <Chip
              label={`条件: ${selectedList.conditionGroups.length}グループ`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        {/* 検索・フィルター */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="追客No・顧客名・フリガナ・電話番号・住所で検索..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 360 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>拠点</InputLabel>
            <Select
              value={branchFilter}
              label="拠点"
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">すべて</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch} value={branch}>
                  {branch}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {filteredResults.length.toLocaleString()} 件
              {totalHits > results.length && ` / ${totalHits.toLocaleString()} 件中`}
            </Typography>
            {searchQuery && searchTime !== null && (
              <Chip
                icon={<BoltIcon />}
                label={`${searchTime}ms`}
                size="small"
                color="success"
                variant="outlined"
                title="Algolia高速検索"
              />
            )}
          </Box>
        </Box>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* テーブル */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell sx={{ fontWeight: 600 }}>追客No</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>顧客名</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>拠点</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">
                商談
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>電話番号</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>住所</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedResults.map((customer) => (
              <TableRow
                key={customer.objectID}
                hover
                onClick={() => handleRowClick(customer.trackingNo || customer.objectID)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{customer.trackingNo || customer.objectID}</TableCell>
                <TableCell>
                  {customer._highlightResult?.name?.matchLevel !== 'none' ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: customer._highlightResult?.name?.value || customer.name || '-',
                      }}
                    />
                  ) : (
                    customer.name || '-'
                  )}
                </TableCell>
                <TableCell>{customer.branch || '-'}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    {customer.hasDeals && (
                      <Tooltip title="一般商談あり">
                        <DescriptionIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      </Tooltip>
                    )}
                    {customer.hasTreeBurialDeals && (
                      <Tooltip title="樹木墓商談あり">
                        <ParkIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      </Tooltip>
                    )}
                    {customer.hasBurialPersons && (
                      <Tooltip title="樹木墓オプションあり">
                        <PersonIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{customer.phoneOriginal || customer.phone || '-'}</TableCell>
                <TableCell
                  sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {formatCustomerAddress(customer)}
                </TableCell>
              </TableRow>
            ))}
            {paginatedResults.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {searchQuery ? '検索条件に一致する顧客が見つかりません' : '顧客が見つかりません'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredResults.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="表示件数:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count.toLocaleString()}`}
        />
      </TableContainer>

      {/* Algolia highlight styles */}
      <style>{`
        em {
          background-color: #fff59d;
          font-style: normal;
          font-weight: bold;
        }
      `}</style>

      {/* 新規作成ダイアログ */}
      <CustomerForm
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateCustomer}
        mode="create"
      />

      {/* 検索リストビルダー */}
      <SearchListBuilder
        open={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setEditingList(null);
        }}
        onSave={handleSaveSearchList}
        initialList={editingList}
      />

      {/* リスト操作メニュー */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEditList}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>編集</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => menuListId && handleDeleteSearchList(menuListId)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>削除</ListItemText>
        </MenuItem>
      </Menu>

      {/* 通知スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
