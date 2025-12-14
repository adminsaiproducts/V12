import { useState, useEffect, useCallback } from 'react';
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
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  TablePagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Link as LinkIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import {
  getUnlinkedTreeBurialDeals,
  linkTreeBurialDealToCustomer,
} from '../api/treeBurialDeals';
import { getCustomers } from '../api/customers';
import { searchCustomersAlgolia, isAlgoliaConfigured } from '../api/algolia';
import type { TreeBurialDeal, Customer } from '../types/firestore';
import { TREE_BURIAL_DEAL_STATUS_LABELS } from '../types/firestore';

export function TreeBurialDealLinkPage() {
  const [deals, setDeals] = useState<TreeBurialDeal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<TreeBurialDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ページネーション
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // 紐づけダイアログ
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<TreeBurialDeal | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  // データ読み込み
  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const unlinkedDeals = await getUnlinkedTreeBurialDeals();
      setDeals(unlinkedDeals);
      setFilteredDeals(unlinkedDeals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // 商談リストのフィルタリング
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDeals(deals);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = deals.filter(deal =>
        deal.userName?.toLowerCase().includes(term) ||
        deal.userNameKana?.toLowerCase().includes(term) ||
        deal.dealName?.toLowerCase().includes(term) ||
        deal.location?.toLowerCase().includes(term)
      );
      setFilteredDeals(filtered);
    }
    setPage(0);
  }, [searchTerm, deals]);

  // Algolia検索結果をCustomer型に変換
  const convertAlgoliaHitToCustomer = (hit: Record<string, unknown>): Customer => ({
    id: String(hit.objectID || ''),
    trackingNo: String(hit.trackingNo || ''),
    name: String(hit.name || ''),
    nameKana: String(hit.nameKana || ''),
    phone: String(hit.phone || ''),
    address: String(hit.address || ''),
    email: String(hit.email || ''),
  } as Customer);

  // 紐づけダイアログを開く（自動で候補を検索）
  const handleOpenLinkDialog = async (deal: TreeBurialDeal) => {
    setSelectedDeal(deal);
    const searchTerm = deal.userNameKana || deal.userName || '';
    setCustomerSearchTerm(searchTerm);
    setCustomerSearchResults([]);
    setLinkDialogOpen(true);

    setCustomerSearching(true);
    try {
      let results: Customer[] = [];

      // Algolia検索を使用
      if (searchTerm && isAlgoliaConfigured) {
        console.log('[TreeBurialDealLinkPage] Algolia searching for:', searchTerm);
        const algoliaResult = await searchCustomersAlgolia(searchTerm, { hitsPerPage: 20 });
        if (algoliaResult && algoliaResult.hits.length > 0) {
          results = algoliaResult.hits.map(hit => convertAlgoliaHitToCustomer(hit as Record<string, unknown>));
          console.log('[TreeBurialDealLinkPage] Algolia results:', results.length);
        }
      }

      // 結果が少ない場合はデフォルト顧客リストを追加
      if (results.length < 5) {
        console.log('[TreeBurialDealLinkPage] Fetching default customers as fallback');
        const defaultCustomers = await getCustomers(50);
        // 重複を除いて追加
        const existingIds = new Set(results.map(c => c.id));
        const additionalCustomers = defaultCustomers.filter(c => !existingIds.has(c.id));
        results = [...results, ...additionalCustomers.slice(0, 20 - results.length)];
      }

      setCustomerSearchResults(results);
    } catch (err) {
      console.error('Auto search error:', err);
      // エラー時もデフォルト顧客を表示
      try {
        const defaultCustomers = await getCustomers(20);
        setCustomerSearchResults(defaultCustomers);
      } catch (fallbackErr) {
        console.error('Fallback search error:', fallbackErr);
      }
    } finally {
      setCustomerSearching(false);
    }
  };

  // 顧客検索（Algolia検索）
  const handleCustomerSearch = async (searchTermOverride?: string) => {
    const term = searchTermOverride ?? customerSearchTerm;

    setCustomerSearching(true);
    try {
      let results: Customer[] = [];

      if (term.trim() && isAlgoliaConfigured) {
        console.log('[TreeBurialDealLinkPage] Manual Algolia search for:', term);
        const algoliaResult = await searchCustomersAlgolia(term, { hitsPerPage: 20 });
        if (algoliaResult && algoliaResult.hits.length > 0) {
          results = algoliaResult.hits.map(hit => convertAlgoliaHitToCustomer(hit as Record<string, unknown>));
          console.log('[TreeBurialDealLinkPage] Manual search results:', results.length);
        }
      }

      // 結果が少ない場合はデフォルト顧客リストを追加
      if (results.length < 5) {
        const defaultCustomers = await getCustomers(50);
        const existingIds = new Set(results.map(c => c.id));
        const additionalCustomers = defaultCustomers.filter(c => !existingIds.has(c.id));
        results = [...results, ...additionalCustomers.slice(0, 20 - results.length)];
      }

      setCustomerSearchResults(results);
    } catch (err) {
      console.error('Customer search error:', err);
    } finally {
      setCustomerSearching(false);
    }
  };

  // 紐づけ実行
  const handleLink = async (customer: Customer) => {
    if (!selectedDeal) return;

    setLinking(true);
    try {
      await linkTreeBurialDealToCustomer(
        selectedDeal.id,
        customer.id,
        customer.trackingNo || ''
      );

      // 成功メッセージ
      setLinkSuccess(`${selectedDeal.dealName || selectedDeal.userName} を ${customer.name} (${customer.trackingNo}) に紐づけました`);

      // リストから削除
      setDeals(prev => prev.filter(d => d.id !== selectedDeal.id));

      // ダイアログを閉じる
      setLinkDialogOpen(false);
      setSelectedDeal(null);

      // 3秒後にメッセージをクリア
      setTimeout(() => setLinkSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '紐づけに失敗しました');
    } finally {
      setLinking(false);
    }
  };

  // ページ変更
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const paginatedDeals = filteredDeals.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        樹木墓商談 - 顧客紐づけ管理
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {linkSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
          {linkSuccess}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TextField
            size="small"
            placeholder="商談を検索（使用者名、フリガナ、商談名、拠点）"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Chip
            label={`未紐づけ: ${filteredDeals.length}件`}
            color="warning"
            variant="outlined"
          />
          <Button variant="outlined" onClick={loadDeals}>
            再読み込み
          </Button>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>商談名</TableCell>
                <TableCell>使用者名</TableCell>
                <TableCell>フリガナ</TableCell>
                <TableCell>拠点</TableCell>
                <TableCell>状況</TableCell>
                <TableCell>申込日</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDeals.map((deal) => (
                <TableRow key={deal.id} hover>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {deal.dealName || '(名称なし)'}
                    </Typography>
                  </TableCell>
                  <TableCell>{deal.userName || '-'}</TableCell>
                  <TableCell>{deal.userNameKana || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                      {deal.location || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={deal.status ? TREE_BURIAL_DEAL_STATUS_LABELS[deal.status] : '未設定'}
                      size="small"
                      color={deal.status === 'contracted' ? 'success' : deal.status === 'lost' ? 'error' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{deal.applicationDate || '-'}</TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<LinkIcon />}
                      onClick={() => handleOpenLinkDialog(deal)}
                    >
                      紐づけ
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedDeals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {searchTerm ? '該当する商談がありません' : '未紐づけの商談はありません'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredDeals.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="表示件数:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
        />
      </Paper>

      {/* 紐づけダイアログ */}
      <Dialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">顧客を紐づけ</Typography>
            <IconButton onClick={() => setLinkDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDeal && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                紐づけ対象の商談
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body1" fontWeight="bold">
                  {selectedDeal.dealName || '(名称なし)'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  使用者: {selectedDeal.userName || '-'} ({selectedDeal.userNameKana || '-'})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  拠点: {selectedDeal.location || '-'} / 申込日: {selectedDeal.applicationDate || '-'}
                </Typography>
              </Paper>
            </Box>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              顧客を検索
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="顧客名またはフリガナで検索"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomerSearch()}
              />
              <Button
                variant="contained"
                onClick={() => handleCustomerSearch()}
                disabled={customerSearching}
              >
                {customerSearching ? <CircularProgress size={20} /> : '検索'}
              </Button>
            </Box>
          </Box>

          {customerSearchResults.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                検索結果 ({customerSearchResults.length}件)
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                <List disablePadding>
                  {customerSearchResults.map((customer, index) => (
                    <Box key={customer.id}>
                      {index > 0 && <Divider />}
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => handleLink(customer)}
                          disabled={linking}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1">{customer.name}</Typography>
                                <Chip label={customer.trackingNo} size="small" />
                              </Box>
                            }
                            secondary={
                              <>
                                {customer.nameKana && <span>{customer.nameKana}</span>}
                                {customer.phone && <span> / TEL: {customer.phone}</span>}
                              </>
                            }
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<LinkIcon />}
                            disabled={linking}
                          >
                            選択
                          </Button>
                        </ListItemButton>
                      </ListItem>
                    </Box>
                  ))}
                </List>
              </Paper>
            </Box>
          )}

          {customerSearchResults.length === 0 && customerSearchTerm && !customerSearching && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              該当する顧客が見つかりませんでした
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>
            キャンセル
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
