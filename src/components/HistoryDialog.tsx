/**
 * 変更履歴ダイアログ
 * エンティティの変更履歴を表示し、ロールバック機能を提供
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
} from '@mui/material';
import {
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Restore as RestoreIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import type { AuditEntityType, HistoryEntry, AuditUser, FieldChange } from '../types/audit';
import { getHistory } from '../api/audit';
import { rollbackToVersion } from '../api/rollback';
import { getFieldLabel } from '../utils/diff';

interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  currentUser?: AuditUser | null;
  onRollbackComplete?: () => void;
}

/**
 * 操作タイプのラベルと色を取得
 */
function getOperationInfo(operation: string): { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info' } {
  switch (operation) {
    case 'create':
      return { label: '作成', color: 'success' };
    case 'update':
      return { label: '更新', color: 'info' };
    case 'delete':
      return { label: '削除', color: 'error' };
    case 'restore':
      return { label: '復元', color: 'success' };
    case 'rollback':
      return { label: 'ロールバック', color: 'warning' };
    default:
      return { label: operation, color: 'default' };
  }
}

/**
 * 値を表示用にフォーマット
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(なし)';
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * 日時をフォーマット
 */
function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * 変更詳細コンポーネント
 */
function ChangeDetails({ changes }: { changes: FieldChange[] }) {
  if (changes.length === 0) {
    return <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>変更なし</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>フィールド</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>変更前</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>変更後</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {changes.map((change, index) => (
            <TableRow key={index}>
              <TableCell>{getFieldLabel(change.field)}</TableCell>
              <TableCell sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: change.oldValue ? 'rgba(244, 67, 54, 0.08)' : undefined,
              }}>
                {formatValue(change.oldValue)}
              </TableCell>
              <TableCell sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: change.newValue ? 'rgba(76, 175, 80, 0.08)' : undefined,
              }}>
                {formatValue(change.newValue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 履歴エントリコンポーネント
 */
function HistoryEntryItem({
  entry,
  isLatest,
  canRollback,
  onRollback,
}: {
  entry: HistoryEntry;
  isLatest: boolean;
  canRollback: boolean;
  onRollback: (version: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const operationInfo = getOperationInfo(entry.operation);

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2,
        p: 2,
        borderLeft: 4,
        borderLeftColor: `${operationInfo.color}.main`,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={operationInfo.label}
              color={operationInfo.color}
              size="small"
            />
            <Typography variant="body2" color="text.secondary">
              バージョン {entry.version}
            </Typography>
            {isLatest && (
              <Chip label="現在" size="small" variant="outlined" />
            )}
          </Box>

          <Typography variant="body2">
            <strong>日時:</strong> {formatDateTime(entry.changedAt)}
          </Typography>
          <Typography variant="body2">
            <strong>変更者:</strong> {entry.changedBy.displayName} ({entry.changedBy.email})
          </Typography>

          {entry.rollbackFromVersion && (
            <Typography variant="body2" color="warning.main">
              バージョン {entry.rollbackFromVersion} から バージョン {entry.rollbackToVersion} へロールバック
            </Typography>
          )}

          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>変更項目数:</strong> {entry.changes.length}件
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {canRollback && !isLatest && (
            <Tooltip title="このバージョンに戻す">
              <IconButton
                size="small"
                color="primary"
                onClick={() => onRollback(entry.version)}
              >
                <RestoreIcon />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            変更詳細
          </Typography>
          <ChangeDetails changes={entry.changes} />
        </Box>
      </Collapse>
    </Paper>
  );
}

/**
 * 履歴ダイアログ本体
 */
export function HistoryDialog({
  open,
  onClose,
  entityType,
  entityId,
  entityName,
  currentUser,
  onRollbackComplete,
}: HistoryDialogProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  const entityTypeLabel = {
    Customer: '顧客',
    Deal: '商談',
    Relationship: '関係性',
    TreeBurialDeal: '樹木墓商談',
    BurialPerson: '埋葬者',
  }[entityType];

  const loadHistory = useCallback(async () => {
    if (!open || !entityId) return;

    setLoading(true);
    setError(null);

    try {
      const entries = await getHistory(entityType, entityId, { limit: 50 });
      setHistory(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : '履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [open, entityType, entityId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRollback = async (targetVersion: number) => {
    if (!currentUser) {
      setError('ロールバックにはログインが必要です');
      return;
    }

    const confirmed = window.confirm(
      `バージョン ${targetVersion} の状態に戻しますか？\n\nこの操作は記録され、後で確認できます。`
    );

    if (!confirmed) return;

    setRollbackLoading(true);
    setError(null);

    try {
      const result = await rollbackToVersion(
        { entityType, entityId, targetVersion },
        currentUser
      );

      if (result.success) {
        // 履歴を再読み込み
        await loadHistory();
        // 親コンポーネントに通知
        onRollbackComplete?.();
      } else {
        setError(result.error || 'ロールバックに失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ロールバックに失敗しました');
    } finally {
      setRollbackLoading(false);
    }
  };

  const latestVersion = history.length > 0 ? Math.max(...history.map(h => h.version)) : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon />
        {entityTypeLabel}の変更履歴
        {entityName && (
          <Typography variant="body1" color="text.secondary" sx={{ ml: 1 }}>
            - {entityName}
          </Typography>
        )}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {rollbackLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            ロールバック中...
          </Alert>
        )}

        {!loading && history.length === 0 && (
          <Alert severity="info">
            変更履歴がありません。
            <br />
            今後の変更は自動的に記録されます。
          </Alert>
        )}

        {!loading && history.length > 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {history.length}件の変更履歴（新しい順）
            </Typography>

            {history.map((entry) => (
              <HistoryEntryItem
                key={entry.id}
                entry={entry}
                isLatest={entry.version === latestVersion}
                canRollback={!!currentUser && !rollbackLoading}
                onRollback={handleRollback}
              />
            ))}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}

export default HistoryDialog;
