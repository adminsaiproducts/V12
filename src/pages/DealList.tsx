/**
 * 商談一覧ページ
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Button,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { subscribeToDeals } from '../api/deals';
import type { Deal, DealStage } from '../types/firestore';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '../types/firestore';
import { formatCurrency } from '../utils/format';

// 日付フォーマット
function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function DealList() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<DealStage | 'all'>('all');

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToDeals(
      (result) => {
        setDeals(result);
        setLoading(false);
      },
      5000 // 全商談を取得
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // フィルタリングとソート
  const filteredDeals = deals
    .filter((deal) => {
      // 検索フィルタ
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          deal.title.toLowerCase().includes(searchLower) ||
          deal.customerName?.toLowerCase().includes(searchLower) ||
          deal.templeName?.toLowerCase().includes(searchLower) ||
          deal.customerTrackingNo?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // ステージフィルタ
      if (stageFilter !== 'all' && deal.stage !== stageFilter) {
        return false;
      }

      return true;
    })
    // ソート: 変更日順（降順）→契約日順（降順）
    .sort((a, b) => {
      // まず変更日でソート（降順：新しい順）
      const updatedAtA = a.updatedAt || '';
      const updatedAtB = b.updatedAt || '';
      if (updatedAtA !== updatedAtB) {
        return updatedAtB.localeCompare(updatedAtA);
      }
      // 変更日が同じ場合は契約日でソート（降順：新しい順）
      const contractDateA = a.contractDate || '';
      const contractDateB = b.contractDate || '';
      return contractDateB.localeCompare(contractDateA);
    });

  // ステージ別集計
  const stageCounts = deals.reduce(
    (acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    },
    {} as Record<DealStage, number>
  );

  const handleRowClick = (deal: Deal) => {
    navigate(`/deals/${deal.id}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          商談管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/deals/new')}
        >
          新規登録
        </Button>
      </Box>

      {/* ステージ別サマリー */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ステージ別件数
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(DEAL_STAGE_LABELS).map(([stage, label]) => {
              const count = stageCounts[stage as DealStage] || 0;
              if (count === 0) return null;
              return (
                <Chip
                  key={stage}
                  label={`${label}: ${count}件`}
                  color={DEAL_STAGE_COLORS[stage as DealStage]}
                  onClick={() => setStageFilter(stage as DealStage)}
                  variant={stageFilter === stage ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              );
            })}
            {stageFilter !== 'all' && (
              <Chip
                label="フィルタ解除"
                onClick={() => setStageFilter('all')}
                color="default"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* フィルター */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            placeholder="商談名、顧客名、寺院名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>ステージ</InputLabel>
            <Select
              value={stageFilter}
              label="ステージ"
              onChange={(e) => setStageFilter(e.target.value as DealStage | 'all')}
            >
              <MenuItem value="all">すべて</MenuItem>
              {Object.entries(DEAL_STAGE_LABELS).map(([stage, label]) => (
                <MenuItem key={stage} value={stage}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* 商談一覧テーブル */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>商談名</TableCell>
              <TableCell>顧客</TableCell>
              <TableCell>ステージ</TableCell>
              <TableCell>寺院</TableCell>
              <TableCell align="right">金額</TableCell>
              <TableCell>見学日</TableCell>
              <TableCell>契約日</TableCell>
              <TableCell>担当</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    {searchTerm || stageFilter !== 'all'
                      ? '条件に一致する商談がありません'
                      : '商談がありません'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredDeals.map((deal) => (
                <TableRow
                  key={deal.id}
                  hover
                  onClick={() => handleRowClick(deal)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {deal.title}
                    </Typography>
                    {deal.customerTrackingNo && (
                      <Typography variant="caption" color="text.secondary">
                        No. {deal.customerTrackingNo}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{deal.customerName || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={DEAL_STAGE_LABELS[deal.stage] || deal.stage}
                      size="small"
                      color={DEAL_STAGE_COLORS[deal.stage] || 'default'}
                    />
                  </TableCell>
                  <TableCell>{deal.templeName || '-'}</TableCell>
                  <TableCell align="right">{formatCurrency(deal.amount)}</TableCell>
                  <TableCell>{formatDate(deal.visitDate)}</TableCell>
                  <TableCell>{formatDate(deal.contractDate)}</TableCell>
                  <TableCell>{deal.assignedTo || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {filteredDeals.length} 件表示 / 全 {deals.length} 件
        </Typography>
      </Box>
    </Box>
  );
}
