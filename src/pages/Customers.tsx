import { useState } from 'react';
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
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Snackbar,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { useAlgoliaSearch } from '../hooks/useAlgoliaSearch';
import { CustomerForm, CustomerFormData } from '../components/CustomerForm';
import { createCustomer } from '../lib/customerService';

// 住所を文字列に変換するヘルパー関数
// AlgoliaにJSON文字列として保存されている古いデータにも対応
function formatAddressForDisplay(address: unknown): string {
  if (!address) return '-';

  // 文字列の場合
  if (typeof address === 'string') {
    // JSON文字列かどうかチェック（古いAlgoliaデータ対応）
    if (address.startsWith('{') && address.includes('"postalCode"')) {
      try {
        const parsed = JSON.parse(address);
        return formatAddressObject(parsed);
      } catch {
        // パースできない場合はそのまま返す
        return address || '-';
      }
    }
    return address || '-';
  }

  // オブジェクトの場合
  if (typeof address === 'object' && address !== null) {
    return formatAddressObject(address as Record<string, unknown>);
  }

  return '-';
}

// 住所オブジェクトを文字列に変換
function formatAddressObject(addr: Record<string, unknown>): string {
  // fullまたはfullAddressがあればそれを使用
  if (addr.full && typeof addr.full === 'string') return addr.full;
  if (addr.fullAddress && typeof addr.fullAddress === 'string') return addr.fullAddress;
  // 各パーツを結合
  const parts = [
    addr.prefecture,
    addr.city,
    addr.town,
    addr.streetNumber,
    addr.building,
  ].filter((p) => p && typeof p === 'string');
  return parts.length > 0 ? parts.join('') : '-';
}

export function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const searchQuery = searchParams.get('q') || '';

  // 新規作成ダイアログの状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Algolia検索を使用
  const { results, loading, error, totalHits, searchTime } = useAlgoliaSearch(searchQuery);

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
        message: `顧客「${data.name}」を登録しました（管理番号: ${trackingNo}）`,
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ヘッダーと検索バー（スクロール時も固定） */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.paper',
          pb: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            顧客一覧
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新規登録
          </Button>
        </Box>

        {/* Search box */}
        <Box>
          <TextField
            fullWidth
            placeholder="管理番号・顧客名・フリガナ・電話番号・住所で検索..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          {searchQuery && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`"${searchQuery}" で検索中`}
                size="small"
                onDelete={() => setSearchParams({})}
              />
              <Typography variant="caption" color="text.secondary">
                Algolia検索 ({searchTime}ms)
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* スクロール可能なコンテンツ領域 */}
      <Box sx={{ flex: 1, overflow: 'auto', pt: 2 }}>
        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Count */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {searchQuery ? (
                <>
                  {results.length} 件ヒット（全 {totalHits} 件中）
                </>
              ) : (
                <>
                  {results.length} 件表示（全 {totalHits} 件）
                </>
              )}
            </Typography>

            {/* Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>管理番号</TableCell>
                    <TableCell>顧客名</TableCell>
                    <TableCell>電話番号</TableCell>
                    <TableCell>住所</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((customer) => (
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
                      <TableCell>{customer.phoneOriginal || customer.phone || '-'}</TableCell>
                      <TableCell>
                        {customer._highlightResult?.address?.matchLevel !== 'none' ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: customer._highlightResult?.address?.value || formatAddressForDisplay(customer.address),
                            }}
                          />
                        ) : (
                          formatAddressForDisplay(customer.address)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {results.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        {searchQuery ? '検索条件に一致する顧客が見つかりません' : '顧客が見つかりません'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>

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
