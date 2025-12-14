/**
 * 商談詳細ページ
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { getDealById, deleteDeal } from '../api/deals';
import type { Deal } from '../types/firestore';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '../types/firestore';
import { HistoryDialog } from '../components/HistoryDialog';
import { useAuth } from '../auth/AuthProvider';
import type { AuditUser } from '../types/audit';
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

// 情報表示用のヘルパーコンポーネント（常に表示）
interface InfoItemProps {
  label: string;
  value: string | number | undefined | null;
}

function InfoItem({ label, value }: InfoItemProps) {
  const displayValue = value === null || value === undefined || value === '' ? '-' : String(value);

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {displayValue}
      </Typography>
    </Box>
  );
}

export function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 現在のユーザーをAuditUser形式に変換
  const currentAuditUser: AuditUser | undefined = user ? {
    uid: user.uid,
    displayName: user.displayName || user.email || 'Unknown',
    email: user.email || '',
  } : undefined;

  const fetchDeal = async () => {
    if (!id) {
      setError('商談IDが指定されていません');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getDealById(id);
      if (result) {
        setDeal(result);
      } else {
        setError('商談が見つかりません');
      }
    } catch (err) {
      setError('商談データの取得に失敗しました');
      console.error('Error fetching deal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeal();
  }, [id]);

  // 削除ハンドラ
  const handleDelete = async () => {
    if (!deal?.id) return;

    setIsDeleting(true);
    try {
      await deleteDeal(deal.id);
      setSnackbar({
        open: true,
        message: '商談を削除しました',
        severity: 'success',
      });
      // 一覧画面に戻る
      navigate('/deals');
    } catch (err) {
      console.error('Error deleting deal:', err);
      setSnackbar({
        open: true,
        message: '商談の削除に失敗しました',
        severity: 'error',
      });
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/deals')}
          sx={{ mb: 2 }}
        >
          商談一覧に戻る
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!deal) {
    return null;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/deals')}
        >
          商談一覧に戻る
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setHistoryDialogOpen(true)}
          >
            履歴
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/deals/${id}/edit`)}
          >
            編集
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            削除
          </Button>
        </Box>
      </Box>

      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" component="h1">
            {deal.title}
          </Typography>
          <Chip
            label={DEAL_STAGE_LABELS[deal.stage] || deal.stage}
            color={DEAL_STAGE_COLORS[deal.stage] || 'default'}
          />
        </Box>
        {deal.customerName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="action" fontSize="small" />
            <Typography
              variant="body1"
              color="primary"
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => deal.customerTrackingNo && navigate(`/customers/${deal.customerTrackingNo}`)}
            >
              {deal.customerName}
            </Typography>
            {deal.customerTrackingNo && (
              <Typography variant="body2" color="text.secondary">
                (No. {deal.customerTrackingNo})
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* 基本情報 */}
      <Accordion expanded sx={{ mb: 2 }}>
        <AccordionSummary>
          <Typography variant="subtitle1" fontWeight="bold">基本情報</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <InfoItem label="商談名" value={deal.title} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  ステージ
                </Typography>
                <Box>
                  <Chip
                    label={DEAL_STAGE_LABELS[deal.stage] || deal.stage}
                    size="small"
                    color={DEAL_STAGE_COLORS[deal.stage] || 'default'}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <InfoItem label="確度" value={deal.probability !== undefined ? `${deal.probability}%` : undefined} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <InfoItem label="金額" value={formatCurrency(deal.amount)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoItem label="担当者" value={deal.assignedTo} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 寺院・プラン */}
      <Accordion expanded sx={{ mb: 2 }}>
        <AccordionSummary>
          <Typography variant="subtitle1" fontWeight="bold">寺院・プラン</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <InfoItem label="寺院名" value={deal.templeName} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoItem label="商品カテゴリ" value={deal.productCategory} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoItem label="商品サブカテゴリ" value={deal.productSubcategory} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoItem label="プラン" value={deal.planName} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoItem label="流入経路" value={deal.visitRoute} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoItem label="競合他社・他拠点" value={deal.competitor} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 進捗日付 */}
      <Accordion expanded sx={{ mb: 2 }}>
        <AccordionSummary>
          <Typography variant="subtitle1" fontWeight="bold">進捗日付</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4}>
              <InfoItem label="問い合わせ日" value={formatDate(deal.inquiryDate)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="資料送付日" value={formatDate(deal.documentSentDate)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="追客メール日" value={formatDate(deal.followUpEmailDate)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="追客TEL日" value={formatDate(deal.followUpCallDate)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="見学日" value={formatDate(deal.visitDate)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="見学フォロー日" value={formatDate(deal.visitFollowUpDate)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="仮予約日" value={formatDate(deal.tentativeReservationDate)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="契約日" value={formatDate(deal.contractDate)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="見込み完了日" value={formatDate(deal.expectedCloseDate)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="工事完了引渡日" value={formatDate(deal.deliveryDate)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="売上計上月" value={deal.salesMonth || '-'} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 入金情報 */}
      <Accordion expanded sx={{ mb: 2 }}>
        <AccordionSummary>
          <Typography variant="subtitle1" fontWeight="bold">入金情報</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4}>
              <InfoItem label="入金日1" value={formatDate(deal.paymentDate1)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="入金額1" value={formatCurrency(deal.paymentAmount1)} />
            </Grid>
            <Grid item xs={12} sm={4} />
            <Grid item xs={6} sm={4}>
              <InfoItem label="入金日2" value={formatDate(deal.paymentDate2)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="入金額2" value={formatCurrency(deal.paymentAmount2)} />
            </Grid>
            <Grid item xs={12} sm={4} />
            <Grid item xs={6} sm={4}>
              <InfoItem label="入金日3" value={formatDate(deal.paymentDate3)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <InfoItem label="入金額3" value={formatCurrency(deal.paymentAmount3)} />
            </Grid>
            <Grid item xs={12} sm={4} />
            <Grid item xs={6} sm={4}>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  入金合計
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {formatCurrency(deal.totalPayment)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  残高
                </Typography>
                <Typography
                  variant="h6"
                  color={deal.remainingBalance && deal.remainingBalance > 0 ? 'warning.main' : 'text.primary'}
                >
                  {formatCurrency(deal.remainingBalance)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 備考 */}
      <Accordion expanded sx={{ mb: 2 }}>
        <AccordionSummary>
          <Typography variant="subtitle1" fontWeight="bold">備考</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography sx={{ whiteSpace: 'pre-wrap', minHeight: 60 }}>
                {deal.notes || '-'}
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* メタ情報 */}
      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              作成日時
            </Typography>
            <Typography variant="body2">
              {deal.createdAt ? formatDate(deal.createdAt) : '-'}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              更新日時
            </Typography>
            <Typography variant="body2">
              {deal.updatedAt ? formatDate(deal.updatedAt) : '-'}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              商談ID
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {deal.id}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>商談を削除しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{deal.title}」を削除します。この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            キャンセル
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? '削除中...' : '削除する'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 履歴ダイアログ */}
      {id && (
        <HistoryDialog
          open={historyDialogOpen}
          onClose={() => setHistoryDialogOpen(false)}
          entityType="Deal"
          entityId={id}
          entityName={deal?.title || '商談'}
          currentUser={currentAuditUser}
        />
      )}

      {/* Snackbar通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
}
