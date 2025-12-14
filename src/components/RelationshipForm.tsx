/**
 * 関係性追加/編集フォームダイアログ
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Autocomplete,
  CircularProgress,
  Alert,
  Chip,
  ListItemText,
} from '@mui/material';
import {
  RELATIONSHIP_TYPES,
  searchCustomers,
} from '../api/relationships';

// カテゴリごとに関係性タイプをグループ化
const groupedRelationshipTypes = RELATIONSHIP_TYPES.reduce((acc, type) => {
  if (!acc[type.category]) {
    acc[type.category] = [];
  }
  acc[type.category].push(type);
  return acc;
}, {} as Record<string, typeof RELATIONSHIP_TYPES>);

export interface RelationshipFormData {
  targetCustomerId: string;
  targetCustomerName: string;
  relationshipType: string;
  description: string;
}

interface CustomerOption {
  id: string;
  trackingNo: string;
  name: string;
  nameKana?: string;
}

interface RelationshipFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RelationshipFormData) => Promise<void>;
  mode: 'create' | 'edit';
  sourceCustomerName: string;
  initialData?: {
    targetCustomerId?: string;
    targetCustomerName?: string;
    relationshipType?: string;
    description?: string;
  };
}

export function RelationshipForm({
  open,
  onClose,
  onSubmit,
  mode,
  sourceCustomerName,
  initialData,
}: RelationshipFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [searchInputValue, setSearchInputValue] = useState('');

  // フォーム状態
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [relationshipType, setRelationshipType] = useState('');
  const [description, setDescription] = useState('');

  // 初期値設定
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        setRelationshipType(initialData.relationshipType || '');
        setDescription(initialData.description || '');
        if (initialData.targetCustomerId && initialData.targetCustomerName) {
          setSelectedCustomer({
            id: initialData.targetCustomerId,
            trackingNo: initialData.targetCustomerId.replace('customer_', ''),
            name: initialData.targetCustomerName,
          });
        }
      } else {
        // 新規作成モード
        setSelectedCustomer(null);
        setRelationshipType('');
        setDescription('');
        setSearchInputValue('');
      }
      setError(null);
    }
  }, [open, mode, initialData]);

  // 顧客検索
  const handleSearchCustomer = useCallback(async (searchText: string) => {
    if (!searchText || searchText.length < 1) {
      setCustomerOptions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchCustomers(searchText);
      setCustomerOptions(results);
    } catch (err) {
      console.error('Error searching customers:', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // デバウンス付き検索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInputValue) {
        handleSearchCustomer(searchInputValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInputValue, handleSearchCustomer]);

  // 送信
  const handleSubmit = async () => {
    if (!selectedCustomer) {
      setError('関係先の顧客を選択してください');
      return;
    }
    if (!relationshipType) {
      setError('関係性タイプを選択してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        targetCustomerId: selectedCustomer.trackingNo,
        targetCustomerName: selectedCustomer.name,
        relationshipType,
        description,
      });
      onClose();
    } catch (err) {
      console.error('Error saving relationship:', err);
      setError('関係性の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 関係性タイプ名を取得
  const getRelationshipTypeName = (code: string) => {
    const type = RELATIONSHIP_TYPES.find(t => t.code === code);
    return type ? type.name : code;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? '関係性を追加' : '関係性を編集'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {sourceCustomerName} の関係先を{mode === 'create' ? '追加' : '編集'}します
          </Typography>

          {/* 関係先顧客の選択 */}
          <Autocomplete
            value={selectedCustomer}
            onChange={(_, newValue) => setSelectedCustomer(newValue)}
            inputValue={searchInputValue}
            onInputChange={(_, newInputValue) => setSearchInputValue(newInputValue)}
            options={customerOptions}
            loading={searchLoading}
            getOptionLabel={(option) =>
              `${option.name} (${option.trackingNo})`
            }
            isOptionEqualToValue={(option, value) => option.trackingNo === value.trackingNo}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <ListItemText
                  primary={option.name}
                  secondary={`管理番号: ${option.trackingNo}${option.nameKana ? ` / ${option.nameKana}` : ''}`}
                />
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="関係先顧客"
                placeholder="顧客名または管理番号で検索"
                required
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchLoading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ mb: 2 }}
            disabled={mode === 'edit'}
          />

          {/* 関係性タイプの選択 */}
          <FormControl fullWidth sx={{ mb: 2 }} required>
            <InputLabel>関係性タイプ</InputLabel>
            <Select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              label="関係性タイプ"
            >
              {Object.entries(groupedRelationshipTypes).map(([category, types]) => [
                <MenuItem key={`header-${category}`} disabled sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>
                  {category}
                </MenuItem>,
                ...types.map((type) => (
                  <MenuItem key={type.code} value={type.code}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={type.code} size="small" variant="outlined" />
                      <Typography>{type.name}</Typography>
                    </Box>
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>

          {/* 選択された関係性タイプの情報 */}
          {relationshipType && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>{sourceCustomerName}</strong> → <strong>{selectedCustomer?.name || '(未選択)'}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                関係性: {getRelationshipTypeName(relationshipType)}
              </Typography>
              {RELATIONSHIP_TYPES.find(t => t.code === relationshipType)?.reverseName && (
                <Typography variant="body2" color="text.secondary">
                  逆方向: {RELATIONSHIP_TYPES.find(t => t.code === relationshipType)?.reverseName}
                </Typography>
              )}
            </Box>
          )}

          {/* 説明 */}
          <TextField
            fullWidth
            label="説明・備考"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            placeholder="関係性に関する補足情報があれば入力"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !selectedCustomer || !relationshipType}
        >
          {loading ? <CircularProgress size={24} /> : mode === 'create' ? '追加' : '更新'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RelationshipForm;
