/**
 * 関係性カードコンポーネント（CRUD機能付き）
 */

import { useState, useEffect, useCallback } from 'react';
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
  Tooltip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Person as PersonIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import {
  getCustomerRelationships,
  getConfidenceColor,
  createRelationship,
  updateRelationship,
  deleteRelationship,
  RelatedCustomer,
} from '../api/relationships';
import { RelationshipForm, RelationshipFormData } from './RelationshipForm';
import { HistoryDialog } from './HistoryDialog';
import { useAuth } from '../auth/AuthProvider';
import type { AuditUser } from '../types/audit';

interface RelationshipCardProps {
  customerId: string;
  customerName?: string;
  onRelationshipChange?: () => void;
}

export function RelationshipCard({
  customerId,
  customerName = '',
  onRelationshipChange,
}: RelationshipCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<RelatedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 履歴ダイアログ用の状態
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyTargetRelationship, setHistoryTargetRelationship] = useState<RelatedCustomer | null>(null);

  // 現在のユーザーをAuditUser形式に変換
  const currentAuditUser: AuditUser | undefined = user ? {
    uid: user.uid,
    displayName: user.displayName || user.email || 'Unknown',
    email: user.email || '',
  } : undefined;

  // ダイアログ状態
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingRelationship, setEditingRelationship] = useState<RelatedCustomer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRelationship, setDeletingRelationship] = useState<RelatedCustomer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 通知
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchRelationships = useCallback(async () => {
    console.log('[RelationshipCard] fetchRelationships called, customerId:', customerId);
    if (!customerId) {
      console.log('[RelationshipCard] customerId is empty, skipping');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[RelationshipCard] Calling getCustomerRelationships...');
      const result = await getCustomerRelationships(customerId);
      console.log('[RelationshipCard] Got result:', result.length, 'relationships');
      setRelationships(result);
    } catch (err) {
      console.error('Error fetching relationships:', err);
      setError('関係性データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  const handleCustomerClick = (trackingNo: string) => {
    navigate(`/customers/${trackingNo}`);
  };

  // 追加
  const handleAdd = () => {
    setFormMode('create');
    setEditingRelationship(null);
    setFormOpen(true);
  };

  // 編集
  const handleEdit = (item: RelatedCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormMode('edit');
    setEditingRelationship(item);
    setFormOpen(true);
  };

  // 削除確認
  const handleDeleteClick = (item: RelatedCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingRelationship(item);
    setDeleteDialogOpen(true);
  };

  // 履歴表示
  const handleHistoryClick = (item: RelatedCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryTargetRelationship(item);
    setHistoryDialogOpen(true);
  };

  // 削除実行
  const handleDelete = async () => {
    if (!deletingRelationship) return;

    setIsDeleting(true);
    try {
      await deleteRelationship(deletingRelationship.relationship.id);
      setSnackbar({
        open: true,
        message: '関係性を削除しました',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      fetchRelationships();
      onRelationshipChange?.();
    } catch (err) {
      console.error('Error deleting relationship:', err);
      setSnackbar({
        open: true,
        message: '関係性の削除に失敗しました',
        severity: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // フォーム送信
  const handleFormSubmit = async (data: RelationshipFormData) => {
    if (formMode === 'create') {
      await createRelationship({
        sourceCustomerId: customerId,
        targetCustomerId: data.targetCustomerId,
        relationshipType: data.relationshipType,
        description: data.description,
      });
      setSnackbar({
        open: true,
        message: '関係性を追加しました',
        severity: 'success',
      });
    } else if (editingRelationship) {
      await updateRelationship(editingRelationship.relationship.id, {
        relationshipType: data.relationshipType,
        description: data.description,
      });
      setSnackbar({
        open: true,
        message: '関係性を更新しました',
        severity: 'success',
      });
    }
    fetchRelationships();
    onRelationshipChange?.();
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            関係性
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
            関係性
          </Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">関係性</Typography>
              <Chip
                label={`${relationships.length}件`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAdd}
            >
              追加
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {relationships.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              関係性が登録されていません
            </Typography>
          ) : (
            <List disablePadding>
              {relationships.map((item, index) => (
                <ListItem
                  key={item.relationship.id}
                  disablePadding
                  divider={index < relationships.length - 1}
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip
                        label={`${Math.round(item.relationship.confidence * 100)}%`}
                        size="small"
                        color={getConfidenceColor(item.relationship.confidence)}
                        sx={{ minWidth: 50 }}
                      />
                      <Tooltip title="履歴">
                        <IconButton
                          size="small"
                          onClick={(e) => handleHistoryClick(item, e)}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="編集">
                        <IconButton
                          size="small"
                          onClick={(e) => handleEdit(item, e)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteClick(item, e)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton
                    onClick={() => handleCustomerClick(item.customer.trackingNo)}
                    sx={{ py: 1.5, pr: 20 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                      <PersonIcon color="action" fontSize="small" />
                    </Box>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {item.customer.name}
                          </Typography>
                          <Chip
                            label={item.relationship.relationshipName}
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                          {item.relationship.needsManualResolution && (
                            <Tooltip title="確認が必要です">
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            管理番号: {item.customer.trackingNo}
                          </Typography>
                          {item.customer.phone && (
                            <Typography variant="caption" color="text.secondary">
                              TEL: {item.customer.phone}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* 追加/編集フォーム */}
      <RelationshipForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingRelationship(null);
        }}
        onSubmit={handleFormSubmit}
        mode={formMode}
        sourceCustomerName={customerName || `顧客 ${customerId}`}
        initialData={
          editingRelationship
            ? {
                targetCustomerId: editingRelationship.customer.trackingNo,
                targetCustomerName: editingRelationship.customer.name,
                relationshipType: editingRelationship.relationship.relationshipType,
                description: editingRelationship.relationship.description,
              }
            : undefined
        }
      />

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>関係性を削除しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deletingRelationship && (
              <>
                「{deletingRelationship.customer.name}」との関係性
                「{deletingRelationship.relationship.relationshipName}」を削除します。
                <br />
                逆方向の関係性も同時に削除されます。この操作は取り消せません。
              </>
            )}
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

      {/* 通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.message}
      />

      {/* 履歴ダイアログ */}
      {historyTargetRelationship && (
        <HistoryDialog
          open={historyDialogOpen}
          onClose={() => {
            setHistoryDialogOpen(false);
            setHistoryTargetRelationship(null);
          }}
          entityType="Relationship"
          entityId={historyTargetRelationship.relationship.id}
          entityName={`${customerName || '顧客'}と${historyTargetRelationship.customer.name}の関係性`}
          currentUser={currentAuditUser}
        />
      )}
    </>
  );
}
