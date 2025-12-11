/**
 * 関係性（中間テーブル）一覧ページ
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import relationshipTypesData from '../data/relationshipTypes.json';

interface Relationship {
  id: string;
  sourceCustomerId: string;
  targetCustomerId: string;
  relationshipType: string;
  relationshipName?: string;
  direction?: string;
  confidence?: number;
  reference?: string;
  extractionSource?: string;
  createdAt?: Date;
}

interface Customer {
  id: string;
  name: string;
  trackingNo: string;
}

// 関係性タイプのマップを作成
const relationshipTypeMap = new Map<string, string>();
relationshipTypesData.forEach((rt) => {
  relationshipTypeMap.set(rt.code, rt.name);
});

export function Relationships() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [customers, setCustomers] = useState<Map<string, Customer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 顧客データを取得
      const customersSnapshot = await getDocs(collection(db, 'Customers'));
      const customerMap = new Map<string, Customer>();
      customersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        customerMap.set(doc.id, {
          id: doc.id,
          name: data.name || '',
          trackingNo: data.trackingNo || '',
        });
      });
      setCustomers(customerMap);

      // 関係性データを取得（最新5000件まで）
      const relationshipsQuery = query(
        collection(db, 'Relationships'),
        orderBy('createdAt', 'desc'),
        limit(5000)
      );
      const relationshipsSnapshot = await getDocs(relationshipsQuery);
      const relationshipsData = relationshipsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          sourceCustomerId: data.sourceCustomerId || '',
          targetCustomerId: data.targetCustomerId || '',
          relationshipType: data.relationshipType || '',
          relationshipName: data.relationshipName || '',
          direction: data.direction || '',
          confidence: data.confidence,
          reference: data.reference || '',
          extractionSource: data.extractionSource || '',
          createdAt: data.createdAt?.toDate?.() || null,
        };
      });
      setRelationships(relationshipsData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // フィルタリングされた関係性
  const filteredRelationships = useMemo(() => {
    return relationships.filter((rel) => {
      // タイプフィルター
      if (typeFilter && rel.relationshipType !== typeFilter) {
        return false;
      }

      // 検索テキスト
      if (searchText) {
        const sourceCustomer = customers.get(rel.sourceCustomerId);
        const targetCustomer = customers.get(rel.targetCustomerId);
        const searchLower = searchText.toLowerCase();

        const matchesSource =
          sourceCustomer?.name?.toLowerCase().includes(searchLower) ||
          sourceCustomer?.trackingNo?.includes(searchText);
        const matchesTarget =
          targetCustomer?.name?.toLowerCase().includes(searchLower) ||
          targetCustomer?.trackingNo?.includes(searchText);
        const matchesType =
          rel.relationshipType?.toLowerCase().includes(searchLower) ||
          rel.relationshipName?.toLowerCase().includes(searchLower);

        if (!matchesSource && !matchesTarget && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [relationships, customers, searchText, typeFilter]);

  // ユニークな関係性タイプを取得
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    relationships.forEach((rel) => {
      if (rel.relationshipType) {
        types.add(rel.relationshipType);
      }
    });
    return Array.from(types).sort();
  }, [relationships]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 顧客詳細ページに遷移（関係性セクションにスクロール）
  const handleCustomerClick = (customerId: string) => {
    // customer_プレフィックスを除去してtrackingNoを取得
    const trackingNo = customerId.replace('customer_', '');
    navigate(`/customers/${trackingNo}#relationships`);
  };

  // 行クリックでソース顧客の関係性欄に遷移
  const handleRowClick = (sourceCustomerId: string) => {
    const trackingNo = sourceCustomerId.replace('customer_', '');
    navigate(`/customers/${trackingNo}#relationships`);
  };

  const getRelationshipTypeName = (code: string) => {
    return relationshipTypeMap.get(code) || code;
  };

  const paginatedRelationships = filteredRelationships.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">
          関係性（中間テーブル）
        </Typography>
        <Tooltip title="更新">
          <IconButton onClick={fetchData}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="検索（顧客名、追跡番号、関係性タイプ）"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>関係性タイプ</InputLabel>
            <Select
              value={typeFilter}
              label="関係性タイプ"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="">すべて</MenuItem>
              {uniqueTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {getRelationshipTypeName(type)} ({type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          全 {relationships.length.toLocaleString()} 件中{' '}
          {filteredRelationships.length.toLocaleString()} 件表示
          <Typography component="span" variant="caption" sx={{ ml: 2 }}>
            ※ 行をクリックでソース顧客の関係性欄に移動
          </Typography>
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>ソース顧客</TableCell>
              <TableCell>関係性</TableCell>
              <TableCell>ターゲット顧客</TableCell>
              <TableCell>方向</TableCell>
              <TableCell>信頼度</TableCell>
              <TableCell>抽出元</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRelationships.map((rel) => {
              const sourceCustomer = customers.get(rel.sourceCustomerId);
              const targetCustomer = customers.get(rel.targetCustomerId);

              return (
                <TableRow
                  key={rel.id}
                  hover
                  onClick={() => handleRowClick(rel.sourceCustomerId)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {rel.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box>
                        <Typography variant="body2">
                          {sourceCustomer?.name || '(不明)'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sourceCustomer?.trackingNo || rel.sourceCustomerId}
                        </Typography>
                      </Box>
                      {sourceCustomer && (
                        <Tooltip title="顧客詳細を開く">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerClick(rel.sourceCustomerId);
                            }}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getRelationshipTypeName(rel.relationshipType)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      {rel.relationshipType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box>
                        <Typography variant="body2">
                          {targetCustomer?.name || '(不明)'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {targetCustomer?.trackingNo || rel.targetCustomerId}
                        </Typography>
                      </Box>
                      {targetCustomer && (
                        <Tooltip title="顧客詳細を開く">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerClick(rel.targetCustomerId);
                            }}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {rel.direction && (
                      <Chip
                        label={rel.direction === 'forward' ? '順方向' : '逆方向'}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {rel.confidence !== undefined && (
                      <Typography variant="body2">
                        {(rel.confidence * 100).toFixed(0)}%
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {rel.extractionSource && (
                      <Chip
                        label={rel.extractionSource}
                        size="small"
                        variant="outlined"
                        color={
                          rel.extractionSource === 'gemini-ai'
                            ? 'secondary'
                            : 'default'
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredRelationships.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="表示件数"
        />
      </TableContainer>
    </Box>
  );
}

export default Relationships;
