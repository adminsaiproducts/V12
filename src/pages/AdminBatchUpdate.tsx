/**
 * 管理者用バッチ更新ページ
 * 商談のステージを一括で更新
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { DEAL_STAGE_LABELS, DealStage } from '../types/firestore';

const DEALS_COLLECTION = 'Deals';

interface DealInfo {
  id: string;
  title: string;
  customerName: string;
  stage: string;
  stageLabel: string;
}

export function AdminBatchUpdate() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [targetStage, setTargetStage] = useState<DealStage>('inquiry');
  const [deals, setDeals] = useState<DealInfo[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);

  // 現在の商談一覧を取得
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const dealsRef = collection(db, DEALS_COLLECTION);
        const snapshot = await getDocs(dealsRef);
        const dealList: DealInfo[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || '(タイトルなし)',
            customerName: data.customerName || '(顧客名なし)',
            stage: data.stage || '',
            stageLabel: DEAL_STAGE_LABELS[data.stage as DealStage] || data.stage || '(ステージなし)',
          };
        });
        setDeals(dealList);
      } catch (err) {
        console.error('商談一覧の取得に失敗:', err);
      } finally {
        setLoadingDeals(false);
      }
    };
    fetchDeals();
  }, [completed]);

  const handleUpdateAllDeals = async (stage: DealStage) => {
    const stageLabel = DEAL_STAGE_LABELS[stage];
    if (!confirm(`全ての商談のステージを「${stageLabel}」に更新します。よろしいですか？`)) {
      return;
    }

    setLoading(true);
    setResults([]);
    setError(null);
    setCompleted(false);

    try {
      const dealsRef = collection(db, DEALS_COLLECTION);
      const snapshot = await getDocs(dealsRef);

      setResults((prev) => [...prev, `${snapshot.size}件の商談が見つかりました`]);

      const updatedAt = new Date().toISOString();
      let successCount = 0;
      let errorCount = 0;

      for (const dealDoc of snapshot.docs) {
        const dealId = dealDoc.id;
        const dealData = dealDoc.data();
        const currentStage = dealData.stage;

        try {
          const dealRef = doc(db, DEALS_COLLECTION, dealId);
          await updateDoc(dealRef, {
            stage: stage,
            updatedAt: updatedAt,
          });

          setResults((prev) => [...prev, `✓ ${dealId}: ${currentStage} → ${stage}`]);
          successCount++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setResults((prev) => [...prev, `✗ ${dealId}: エラー - ${message}`]);
          errorCount++;
        }
      }

      setResults((prev) => [
        ...prev,
        '',
        '=== 完了 ===',
        `成功: ${successCount}件`,
        `失敗: ${errorCount}件`,
      ]);
      setCompleted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`エラー: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        管理者バッチ更新
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          商談ステージ一括更新
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          全ての商談のステージを指定したステージに更新します。
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>更新先ステージ</InputLabel>
            <Select
              value={targetStage}
              label="更新先ステージ"
              onChange={(e) => setTargetStage(e.target.value as DealStage)}
              disabled={loading}
            >
              {Object.entries(DEAL_STAGE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="warning"
            onClick={() => handleUpdateAllDeals(targetStage)}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? '更新中...' : `全商談を「${DEAL_STAGE_LABELS[targetStage]}」に更新`}
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {completed && (
        <Alert severity="success" sx={{ mb: 2 }}>
          バッチ更新が完了しました
        </Alert>
      )}

      {results.length > 0 && (
        <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto', mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            実行ログ:
          </Typography>
          <List dense>
            {results.map((result, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemText
                  primary={result}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontFamily: 'monospace',
                    color: result.startsWith('✓')
                      ? 'success.main'
                      : result.startsWith('✗')
                      ? 'error.main'
                      : 'text.primary',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* 現在の商談一覧 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          現在の商談一覧
        </Typography>
        {loadingDeals ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : deals.length === 0 ? (
          <Typography color="text.secondary">商談がありません</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>タイトル</TableCell>
                  <TableCell>顧客名</TableCell>
                  <TableCell>ステージ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {deal.id}
                    </TableCell>
                    <TableCell>{deal.title}</TableCell>
                    <TableCell>{deal.customerName}</TableCell>
                    <TableCell>{deal.stageLabel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          合計: {deals.length}件
        </Typography>
      </Paper>
    </Box>
  );
}
