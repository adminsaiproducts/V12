/**
 * 寺院別樹木墓集計ページ
 * 月別・寺院別の樹木墓商談における商談件数、合計金額、彩プロ売上を集計
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
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { getTreeBurialDeals } from '../api/treeBurialDeals';
import type { TreeBurialDeal } from '../types/firestore';
import { TREE_BURIAL_DEAL_STATUS_LABELS } from '../types/firestore';
import { formatCurrency } from '../utils/format';

// 寺院別集計データの型
interface TempleSummary {
  temple: string;
  dealCount: number;
  totalAmount: number;
  saiProSales: number;
  deals: TreeBurialDeal[];
}

// 月別集計データの型
interface MonthlySummary {
  month: string; // YYYY-MM形式
  monthLabel: string; // 表示用
  temples: TempleSummary[];
  totalDealCount: number;
  totalAmount: number;
  totalSaiProSales: number;
}

// 月の表示ラベルを取得
function getMonthLabel(monthStr: string): string {
  if (monthStr === '（日付なし）') return monthStr;
  const [year, month] = monthStr.split('-');
  return `${year}年${parseInt(month, 10)}月`;
}

// 日付文字列から月を抽出（YYYY-MM形式）
function extractMonth(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  // YYYY-MM-DD形式を想定
  const match = dateStr.match(/^(\d{4})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  // YYYY/MM/DD形式も対応
  const match2 = dateStr.match(/^(\d{4})\/(\d{2})/);
  if (match2) {
    return `${match2[1]}-${match2[2]}`;
  }
  return null;
}

export function TreeBurialSummaryByTemple() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<TreeBurialDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);

  // ダイアログ用の状態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState<TreeBurialDeal[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedTemple, setSelectedTemple] = useState<string>('');

  // データ取得
  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      setError(null);
      try {
        // 全データを取得（制限を大きく設定）
        const data = await getTreeBurialDeals(10000);
        setDeals(data);
      } catch (err) {
        console.error('データ取得エラー:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  // 月別・寺院別に集計
  const monthlySummaries = useMemo(() => {
    // 月別にグループ化
    const monthMap = new Map<string, TreeBurialDeal[]>();

    deals.forEach((deal) => {
      // applicationDate または salesRecordDate から月を取得
      const month = extractMonth(deal.applicationDate) || extractMonth(deal.salesRecordDate) || '（日付なし）';
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month)!.push(deal);
    });

    // 月別のサマリーを作成
    const summaries: MonthlySummary[] = [];

    monthMap.forEach((monthDeals, month) => {
      // 寺院別にグループ化
      const templeMap = new Map<string, TreeBurialDeal[]>();

      monthDeals.forEach((deal) => {
        const temple = deal.location || '（未設定）';
        if (!templeMap.has(temple)) {
          templeMap.set(temple, []);
        }
        templeMap.get(temple)!.push(deal);
      });

      // 寺院別サマリーを作成
      const temples: TempleSummary[] = [];
      let totalDealCount = 0;
      let totalAmount = 0;
      let totalSaiProSales = 0;

      templeMap.forEach((templeDeals, temple) => {
        const dealCount = templeDeals.length;
        const amount = templeDeals.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
        const saiPro = templeDeals.reduce((sum, d) => sum + (d.saiProSales || 0), 0);

        totalDealCount += dealCount;
        totalAmount += amount;
        totalSaiProSales += saiPro;

        temples.push({
          temple,
          dealCount,
          totalAmount: amount,
          saiProSales: saiPro,
          deals: templeDeals,
        });
      });

      // 寺院名でソート
      temples.sort((a, b) => a.temple.localeCompare(b.temple));

      summaries.push({
        month,
        monthLabel: getMonthLabel(month),
        temples,
        totalDealCount,
        totalAmount,
        totalSaiProSales,
      });
    });

    // 月を降順（最新月が上）でソート
    summaries.sort((a, b) => {
      if (a.month === '（日付なし）') return 1;
      if (b.month === '（日付なし）') return -1;
      return b.month.localeCompare(a.month);
    });

    return summaries;
  }, [deals]);

  // アコーディオン展開/折りたたみ
  const handleAccordionChange = (month: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedMonths((prev) =>
      isExpanded ? [...prev, month] : prev.filter((m) => m !== month)
    );
  };

  // 寺院行クリック時のハンドラ
  const handleTempleClick = (month: string, monthLabel: string, temple: string, deals: TreeBurialDeal[]) => {
    setSelectedMonth(monthLabel);
    setSelectedTemple(temple);
    setSelectedDeals(deals);
    setDialogOpen(true);
  };

  // 商談行クリック時のハンドラ
  const handleDealClick = (dealId: string) => {
    setDialogOpen(false);
    navigate(`/tree-burial-deals/${dealId}`);
  };

  // 全体の総計
  const grandTotal = useMemo(() => {
    return monthlySummaries.reduce(
      (acc, ms) => ({
        dealCount: acc.dealCount + ms.totalDealCount,
        totalAmount: acc.totalAmount + ms.totalAmount,
        saiProSales: acc.saiProSales + ms.totalSaiProSales,
      }),
      { dealCount: 0, totalAmount: 0, saiProSales: 0 }
    );
  }, [monthlySummaries]);

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
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        寺院別樹木墓
      </Typography>

      {/* 全体の総計 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          全体総計
        </Typography>
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              商談件数
            </Typography>
            <Typography variant="h5">
              {grandTotal.dealCount}件
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              合計金額
            </Typography>
            <Typography variant="h5" color="primary.main">
              {formatCurrency(grandTotal.totalAmount)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              彩プロ売上
            </Typography>
            <Typography variant="h5" color="success.main">
              {formatCurrency(grandTotal.saiProSales)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* 月別集計 */}
      {monthlySummaries.map((ms) => (
        <Accordion
          key={ms.month}
          expanded={expandedMonths.includes(ms.month)}
          onChange={handleAccordionChange(ms.month)}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography sx={{ fontWeight: 600, minWidth: 150 }}>
                {ms.monthLabel}
              </Typography>
              <Chip label={`${ms.totalDealCount}件`} size="small" />
              <Box sx={{ ml: 'auto', display: 'flex', gap: 3, mr: 2 }}>
                <Typography variant="body2">
                  合計: <strong>{formatCurrency(ms.totalAmount)}</strong>
                </Typography>
                <Typography variant="body2" color="success.main">
                  彩プロ: <strong>{formatCurrency(ms.totalSaiProSales)}</strong>
                </Typography>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>寺院</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>商談件数</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>合計金額</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>彩プロ売上</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ms.temples.map((ts) => (
                    <TableRow
                      key={ts.temple}
                      hover
                      onClick={() => handleTempleClick(ms.month, ms.monthLabel, ts.temple, ts.deals)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{ts.temple}</TableCell>
                      <TableCell align="right">{ts.dealCount}件</TableCell>
                      <TableCell align="right">{formatCurrency(ts.totalAmount)}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {formatCurrency(ts.saiProSales)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* 月の小計行 */}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600 }}>月計</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {ms.totalDealCount}件
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(ms.totalAmount)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {formatCurrency(ms.totalSaiProSales)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}

      {monthlySummaries.length === 0 && (
        <Alert severity="info">樹木墓商談データがありません</Alert>
      )}

      {/* 商談一覧ダイアログ */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedMonth} - {selectedTemple}（{selectedDeals.length}件）
            </Typography>
            <IconButton onClick={() => setDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <List disablePadding>
            {selectedDeals.map((deal, index) => (
              <Box key={deal.id}>
                {index > 0 && <Divider />}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleDealClick(deal.id)}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {deal.dealName || deal.userName || '（名称なし）'}
                          </Typography>
                          <Chip
                            label={deal.status ? TREE_BURIAL_DEAL_STATUS_LABELS[deal.status] : '未設定'}
                            size="small"
                            color={deal.status === 'contracted' ? 'success' : deal.status === 'lost' ? 'error' : 'default'}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 3, mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            使用者: {deal.userName || '-'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            申込日: {deal.applicationDate || '-'}
                          </Typography>
                          <Typography variant="body2" color="primary.main">
                            合計: {formatCurrency(deal.totalAmount)}
                          </Typography>
                          <Typography variant="body2" color="success.main">
                            彩プロ: {formatCurrency(deal.saiProSales)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </Box>
            ))}
          </List>
          {selectedDeals.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              商談がありません
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
