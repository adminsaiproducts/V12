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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useAlgoliaSearch } from '../hooks/useAlgoliaSearch';

export function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const searchQuery = searchParams.get('q') || '';

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

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        顧客一覧
      </Typography>

      {/* Search box */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="顧客名・フリガナ・電話番号・住所で検索（Algolia）..."
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
                            __html: customer._highlightResult?.address?.value || customer.address || '-',
                          }}
                        />
                      ) : (
                        customer.address || '-'
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

      {/* Algolia highlight styles */}
      <style>{`
        em {
          background-color: #fff59d;
          font-style: normal;
          font-weight: bold;
        }
      `}</style>
    </Box>
  );
}
