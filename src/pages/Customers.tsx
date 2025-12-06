import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { getCustomers, searchCustomersByName } from '../api/customers';
import type { Customer } from '../types/firestore';

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const searchQuery = searchParams.get('q') || '';

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      setError(null);

      try {
        let result: Customer[];
        if (searchQuery) {
          result = await searchCustomersByName(searchQuery);
        } else {
          result = await getCustomers(100);
        }
        setCustomers(result);
      } catch (err) {
        setError('顧客データの取得に失敗しました');
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [searchQuery]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value) {
      setSearchParams({ q: value });
    } else {
      setSearchParams({});
    }
  };

  const handleRowClick = (customer: Customer) => {
    navigate(`/customers/${customer.trackingNo}`);
  };

  const formatAddress = (address?: Customer['address']): string => {
    if (!address) return '-';
    return address.full || [address.prefecture, address.city, address.town].filter(Boolean).join('');
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
          placeholder="顧客名で検索..."
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
            {customers.length} 件
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
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    hover
                    onClick={() => handleRowClick(customer)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{customer.trackingNo}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{formatAddress(customer.address)}</TableCell>
                  </TableRow>
                ))}
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      顧客が見つかりません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
