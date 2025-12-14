/**
 * 商談カードコンポーネント
 * 顧客詳細ページに表示する商談一覧
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  Divider,
  Button,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import {
  subscribeToDealsByCustomerId,
  getDealsByCustomerTrackingNo,
} from '../api/deals';
import type { Deal, DealStage } from '../types/firestore';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS } from '../types/firestore';
import { formatCurrency } from '../utils/format';

interface DealCardProps {
  customerId: string;
  customerTrackingNo?: string;
  onAddDeal?: () => void;
  onEditDeal?: (deal: Deal) => void;
}

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

// ステージチップ
function StageChip({ stage }: { stage: DealStage }) {
  return (
    <Chip
      label={DEAL_STAGE_LABELS[stage] || stage}
      size="small"
      color={DEAL_STAGE_COLORS[stage] || 'default'}
      sx={{ minWidth: 70 }}
    />
  );
}

// 商談リストアイテム
interface DealListItemProps {
  deal: Deal;
  onClick?: () => void;
  onNavigate?: () => void;
  isLast: boolean;
}

function DealListItem({ deal, onClick, onNavigate, isLast }: DealListItemProps) {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <>
      <ListItem disablePadding divider={!isLast && !expanded}>
        <ListItemButton
          onClick={onClick}
          sx={{ py: 1.5, alignItems: 'flex-start' }}
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body1" component="span">
                  {deal.title}
                </Typography>
                <StageChip stage={deal.stage} />
              </Box>
            }
            secondary={
              <Box sx={{ mt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {deal.templeName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <BusinessIcon fontSize="inherit" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {deal.templeName}
                      </Typography>
                    </Box>
                  )}
                  {deal.amount !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MoneyIcon fontSize="inherit" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(deal.amount)}
                      </Typography>
                    </Box>
                  )}
                  {(deal.visitDate || deal.contractDate) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarIcon fontSize="inherit" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {deal.contractDate
                          ? `契約: ${formatDate(deal.contractDate)}`
                          : `見学: ${formatDate(deal.visitDate)}`}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            }
          />
          <Tooltip title="商談詳細を開く">
            <IconButton size="small" onClick={handleNavigate} sx={{ ml: 1 }}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={handleExpand} sx={{ ml: 0.5 }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </ListItemButton>
      </ListItem>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {deal.planName && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  プラン
                </Typography>
                <Typography variant="body2">{deal.planName}</Typography>
              </Box>
            )}
            {deal.visitRoute && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  流入経路
                </Typography>
                <Typography variant="body2">{deal.visitRoute}</Typography>
              </Box>
            )}
            {deal.inquiryDate && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  問い合わせ日
                </Typography>
                <Typography variant="body2">{formatDate(deal.inquiryDate)}</Typography>
              </Box>
            )}
            {deal.visitDate && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  見学日
                </Typography>
                <Typography variant="body2">{formatDate(deal.visitDate)}</Typography>
              </Box>
            )}
            {deal.contractDate && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  契約日
                </Typography>
                <Typography variant="body2">{formatDate(deal.contractDate)}</Typography>
              </Box>
            )}
            {deal.totalPayment !== undefined && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  入金合計
                </Typography>
                <Typography variant="body2">{formatCurrency(deal.totalPayment)}</Typography>
              </Box>
            )}
            {deal.remainingBalance !== undefined && deal.remainingBalance > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  残高
                </Typography>
                <Typography variant="body2" color="warning.main">
                  {formatCurrency(deal.remainingBalance)}
                </Typography>
              </Box>
            )}
            {deal.assignedTo && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  担当
                </Typography>
                <Typography variant="body2">{deal.assignedTo}</Typography>
              </Box>
            )}
          </Box>
          {deal.notes && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                備考
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {deal.notes}
              </Typography>
            </Box>
          )}
        </Box>
        <Divider />
      </Collapse>
    </>
  );
}

export function DealCard({
  customerId,
  customerTrackingNo,
  onAddDeal,
  onEditDeal,
}: DealCardProps) {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId && !customerTrackingNo) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // trackingNoがある場合はそれで検索
    if (customerTrackingNo) {
      getDealsByCustomerTrackingNo(customerTrackingNo)
        .then((result) => {
          setDeals(result);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching deals by trackingNo:', err);
          setError('商談データの取得に失敗しました');
          setLoading(false);
        });
      return;
    }

    // リアルタイム監視
    const unsubscribe = subscribeToDealsByCustomerId(customerId, (result) => {
      setDeals(result);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [customerId, customerTrackingNo]);

  const handleDealClick = (deal: Deal) => {
    if (onEditDeal) {
      onEditDeal(deal);
    }
  };

  const handleDealNavigate = (deal: Deal) => {
    navigate(`/deals/${deal.id}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            商談
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            商談
          </Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  // ステージごとのサマリー
  const stageSummary = deals.reduce(
    (acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    },
    {} as Record<DealStage, number>
  );

  const totalAmount = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">商談</Typography>
            <Chip
              label={`${deals.length}件`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          {onAddDeal && (
            <Tooltip title="商談を追加">
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={onAddDeal}
              >
                追加
              </Button>
            </Tooltip>
          )}
        </Box>

        {/* ステージサマリー */}
        {deals.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {Object.entries(stageSummary).map(([stage, count]) => (
                <Chip
                  key={stage}
                  label={`${DEAL_STAGE_LABELS[stage as DealStage] || stage}: ${count}`}
                  size="small"
                  color={DEAL_STAGE_COLORS[stage as DealStage] || 'default'}
                  variant="outlined"
                />
              ))}
            </Box>
            {totalAmount > 0 && (
              <Typography variant="body2" color="text.secondary">
                合計金額: {formatCurrency(totalAmount)}
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {deals.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            商談が登録されていません
          </Typography>
        ) : (
          <List disablePadding>
            {deals.map((deal, index) => (
              <DealListItem
                key={deal.id}
                deal={deal}
                onClick={() => handleDealClick(deal)}
                onNavigate={() => handleDealNavigate(deal)}
                isLast={index === deals.length - 1}
              />
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
