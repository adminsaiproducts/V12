/**
 * 検索条件リストビルダーコンポーネント
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import type {
  CustomerSearchList,
  FilterConditionGroup,
  FilterCondition,
  FilterField,
  FilterOperator,
  FieldDefinition,
} from '../types/searchList';
import {
  FILTER_FIELDS,
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  createFilterCondition,
  createFilterConditionGroup,
} from '../types/searchList';

interface SearchListBuilderProps {
  open: boolean;
  onClose: () => void;
  onSave: (list: CustomerSearchList) => void;
  initialList?: CustomerSearchList | null;
}

export function SearchListBuilder({
  open,
  onClose,
  onSave,
  initialList,
}: SearchListBuilderProps) {
  const [name, setName] = useState('');
  const [conditionGroups, setConditionGroups] = useState<FilterConditionGroup[]>([]);

  // 初期値のセット
  useEffect(() => {
    if (initialList) {
      setName(initialList.name);
      setConditionGroups(initialList.conditionGroups.length > 0
        ? initialList.conditionGroups
        : [createFilterConditionGroup()]);
    } else {
      setName('');
      setConditionGroups([createFilterConditionGroup()]);
    }
  }, [initialList, open]);

  // フィールド定義を取得
  const getFieldDefinition = (field: FilterField): FieldDefinition | undefined => {
    return FILTER_FIELDS.find(f => f.field === field);
  };

  // フィールドに応じた演算子リストを取得
  const getOperatorsForField = (field: FilterField): FilterOperator[] => {
    const fieldDef = getFieldDefinition(field);
    if (!fieldDef) return OPERATORS_BY_TYPE.string;
    return OPERATORS_BY_TYPE[fieldDef.type] || OPERATORS_BY_TYPE.string;
  };

  // 条件を更新
  const updateCondition = (
    groupIndex: number,
    conditionIndex: number,
    updates: Partial<FilterCondition>
  ) => {
    setConditionGroups(groups => {
      const newGroups = [...groups];
      const newConditions = [...newGroups[groupIndex].conditions];
      newConditions[conditionIndex] = { ...newConditions[conditionIndex], ...updates };

      // フィールド変更時、演算子をリセット
      if (updates.field) {
        const operators = getOperatorsForField(updates.field);
        if (!operators.includes(newConditions[conditionIndex].operator)) {
          newConditions[conditionIndex].operator = operators[0];
        }
      }

      newGroups[groupIndex] = { ...newGroups[groupIndex], conditions: newConditions };
      return newGroups;
    });
  };

  // 条件を追加（OR）
  const addConditionToGroup = (groupIndex: number) => {
    setConditionGroups(groups => {
      const newGroups = [...groups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        conditions: [...newGroups[groupIndex].conditions, createFilterCondition()],
      };
      return newGroups;
    });
  };

  // 条件を削除
  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    setConditionGroups(groups => {
      const newGroups = [...groups];
      const newConditions = newGroups[groupIndex].conditions.filter(
        (_, i) => i !== conditionIndex
      );

      if (newConditions.length === 0) {
        // グループが空になったら削除
        return newGroups.filter((_, i) => i !== groupIndex);
      }

      newGroups[groupIndex] = { ...newGroups[groupIndex], conditions: newConditions };
      return newGroups;
    });
  };

  // グループを追加（AND）
  const addConditionGroup = () => {
    setConditionGroups(groups => [...groups, createFilterConditionGroup()]);
  };

  // 保存
  const handleSave = () => {
    if (!name.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const list: CustomerSearchList = {
      id: initialList?.id || crypto.randomUUID(),
      name: name.trim(),
      conditionGroups: conditionGroups.filter(g => g.conditions.length > 0),
      createdAt: initialList?.createdAt || now,
      updatedAt: now,
    };

    onSave(list);
  };

  // 値入力が必要かどうか
  const needsValueInput = (operator: FilterOperator): boolean => {
    return !['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(operator);
  };

  // 2つ目の値入力が必要かどうか（between用）
  const needsSecondValue = (operator: FilterOperator): boolean => {
    return operator === 'between';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {initialList ? 'リスト編集' : '新規リスト作成'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* リスト名 */}
        <TextField
          label="リスト名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          required
          sx={{ mb: 3 }}
        />

        {/* 条件グループ */}
        {conditionGroups.map((group, groupIndex) => (
          <Paper key={group.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
            {groupIndex > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, mt: -4 }}>
                <Chip label="AND" color="primary" size="small" />
              </Box>
            )}

            {group.conditions.map((condition, conditionIndex) => (
              <Box key={condition.id}>
                {conditionIndex > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                    <Divider sx={{ flex: 1 }} />
                    <Chip label="OR" size="small" sx={{ mx: 1 }} />
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
                  {/* フィールド選択 */}
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>フィールド</InputLabel>
                    <Select
                      value={condition.field}
                      label="フィールド"
                      onChange={(e) =>
                        updateCondition(groupIndex, conditionIndex, {
                          field: e.target.value as FilterField,
                        })
                      }
                    >
                      {FILTER_FIELDS.map((f) => (
                        <MenuItem key={f.field} value={f.field}>
                          {f.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* 演算子選択 */}
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>条件</InputLabel>
                    <Select
                      value={condition.operator}
                      label="条件"
                      onChange={(e) =>
                        updateCondition(groupIndex, conditionIndex, {
                          operator: e.target.value as FilterOperator,
                        })
                      }
                    >
                      {getOperatorsForField(condition.field).map((op) => (
                        <MenuItem key={op} value={op}>
                          {OPERATOR_LABELS[op]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* 値入力 */}
                  {needsValueInput(condition.operator) && (
                    <>
                      {getFieldDefinition(condition.field)?.type === 'select' ? (
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <InputLabel>値</InputLabel>
                          <Select
                            value={condition.value}
                            label="値"
                            onChange={(e) =>
                              updateCondition(groupIndex, conditionIndex, {
                                value: e.target.value,
                              })
                            }
                          >
                            {getFieldDefinition(condition.field)?.options?.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : getFieldDefinition(condition.field)?.type === 'date' ? (
                        <TextField
                          type="date"
                          size="small"
                          value={condition.value}
                          onChange={(e) =>
                            updateCondition(groupIndex, conditionIndex, {
                              value: e.target.value,
                            })
                          }
                          sx={{ minWidth: 140 }}
                          InputLabelProps={{ shrink: true }}
                        />
                      ) : (
                        <TextField
                          size="small"
                          placeholder="値"
                          value={condition.value}
                          onChange={(e) =>
                            updateCondition(groupIndex, conditionIndex, {
                              value: e.target.value,
                            })
                          }
                          sx={{ flex: 1, minWidth: 140 }}
                        />
                      )}

                      {/* 2つ目の値（between用） */}
                      {needsSecondValue(condition.operator) && (
                        <>
                          <Typography sx={{ alignSelf: 'center' }}>〜</Typography>
                          <TextField
                            type="date"
                            size="small"
                            value={condition.value2 || ''}
                            onChange={(e) =>
                              updateCondition(groupIndex, conditionIndex, {
                                value2: e.target.value,
                              })
                            }
                            sx={{ minWidth: 140 }}
                            InputLabelProps={{ shrink: true }}
                          />
                        </>
                      )}
                    </>
                  )}

                  {/* 削除ボタン */}
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeCondition(groupIndex, conditionIndex)}
                    disabled={conditionGroups.length === 1 && group.conditions.length === 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}

            {/* OR条件追加 */}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => addConditionToGroup(groupIndex)}
              sx={{ mt: 1 }}
            >
              OR
            </Button>
          </Paper>
        ))}

        {/* AND条件グループ追加 */}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addConditionGroup}
          fullWidth
        >
          AND
        </Button>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
