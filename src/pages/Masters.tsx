/**
 * マスター管理ページ
 * 各種マスターデータのCRUD操作を提供
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useMaster, MasterType, MasterItem, MASTER_TYPE_LABELS } from '../hooks/useMasters';

// マスタータイプの一覧
const MASTER_TYPES: MasterType[] = [
  'branches',
  'visitRoutes',
  'receptionists',
  'plans',
  'religiousSects',
  'transportations',
  'relationships',
  'relationshipTypes',
  'temples',
  'employees',
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`master-tabpanel-${index}`}
      aria-labelledby={`master-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface MasterItemEditorProps {
  type: MasterType;
}

// 拡張されたMasterItem（説明文とカテゴリ付き）
interface ExtendedMasterItem extends MasterItem {
  description?: string;
  category?: string;
  reverseCode?: string;
  // 寺院用フィールド
  sanGo?: string;
  area?: string;
  furigana?: string;
  sect?: string;
  priestName?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  town?: string;
  address?: string;
  building?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  // 従業員用フィールド
  lastName?: string;
  firstName?: string;
  lastNameKana?: string;
  firstNameKana?: string;
  genderCode?: string;
  birthDate?: string;
  hireDate?: string;
  resignDate?: string;
}

// 関係性タイプのカテゴリ選択肢
const RELATIONSHIP_CATEGORIES = ['契約関係', '家族関係', '親族関係', 'ビジネス関係', 'その他'];

// 寺院エリアの選択肢
const TEMPLE_AREAS = ['東京', '神奈川', '埼玉', '千葉', 'その他'];

function MasterItemEditor({ type }: MasterItemEditorProps) {
  const { master, loading, error, addItem, updateItem, reorderItems, refresh } = useMaster(type);
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<ExtendedMasterItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editReverseCode, setEditReverseCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // 新規追加ダイアログ用のステート（関係性タイプ用）
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('その他');
  const [newReverseCode, setNewReverseCode] = useState('');

  // 寺院用のステート
  const [newSanGo, setNewSanGo] = useState('');
  const [newArea, setNewArea] = useState('東京');
  const [newFurigana, setNewFurigana] = useState('');
  const [newSect, setNewSect] = useState('');
  const [newPriestName, setNewPriestName] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newPrefecture, setNewPrefecture] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newTown, setNewTown] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newBuilding, setNewBuilding] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  // 編集用寺院ステート
  const [editSanGo, setEditSanGo] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editFurigana, setEditFurigana] = useState('');
  const [editSect, setEditSect] = useState('');
  const [editPriestName, setEditPriestName] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editPrefecture, setEditPrefecture] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editTown, setEditTown] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // 従業員用ステート（新規）
  const [newLastName, setNewLastName] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastNameKana, setNewLastNameKana] = useState('');
  const [newFirstNameKana, setNewFirstNameKana] = useState('');
  const [newGenderCode, setNewGenderCode] = useState('2');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newHireDate, setNewHireDate] = useState('');
  const [newResignDate, setNewResignDate] = useState('');
  // 編集用従業員ステート
  const [editLastName, setEditLastName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastNameKana, setEditLastNameKana] = useState('');
  const [editFirstNameKana, setEditFirstNameKana] = useState('');
  const [editGenderCode, setEditGenderCode] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editHireDate, setEditHireDate] = useState('');
  const [editResignDate, setEditResignDate] = useState('');

  // 新規アイテム追加
  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await addItem(newItemName.trim());
      setNewItemName('');
    } catch (err) {
      console.error('Error adding item:', err);
      setActionError('アイテムの追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }, [newItemName, addItem]);

  // アイテム編集ダイアログを開く
  const handleEditClick = useCallback((item: ExtendedMasterItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description || '');
    setEditCategory(item.category || 'その他');
    setEditReverseCode(item.reverseCode || '');
    // 寺院用フィールドの設定
    setEditSanGo(item.sanGo || '');
    setEditArea(item.area || '東京');
    setEditFurigana(item.furigana || '');
    setEditSect(item.sect || '');
    setEditPriestName(item.priestName || '');
    setEditPostalCode(item.postalCode || '');
    setEditPrefecture(item.prefecture || '');
    setEditCity(item.city || '');
    setEditTown(item.town || '');
    setEditAddress(item.address || '');
    setEditBuilding(item.building || '');
    setEditPhone(item.phone || '');
    setEditMobile(item.mobile || '');
    setEditEmail(item.email || '');
    // 従業員用フィールドの設定
    setEditLastName(item.lastName || '');
    setEditFirstName(item.firstName || '');
    setEditLastNameKana(item.lastNameKana || '');
    setEditFirstNameKana(item.firstNameKana || '');
    setEditGenderCode(item.genderCode || '');
    setEditBirthDate(item.birthDate || '');
    setEditHireDate(item.hireDate || '');
    setEditResignDate(item.resignDate || '');
  }, []);

  // アイテム更新
  const handleUpdateItem = useCallback(async () => {
    if (!editingItem || !editName.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const updates: Partial<ExtendedMasterItem> = { name: editName.trim() };
      if (type === 'relationshipTypes') {
        updates.description = editDescription;
        updates.category = editCategory;
        updates.reverseCode = editReverseCode;
      } else if (type === 'temples') {
        updates.sanGo = editSanGo;
        updates.area = editArea;
        updates.furigana = editFurigana;
        updates.sect = editSect;
        updates.priestName = editPriestName;
        updates.postalCode = editPostalCode;
        updates.prefecture = editPrefecture;
        updates.city = editCity;
        updates.town = editTown;
        updates.address = editAddress;
        updates.building = editBuilding;
        updates.phone = editPhone;
        updates.mobile = editMobile;
        updates.email = editEmail;
      } else if (type === 'employees') {
        updates.lastName = editLastName;
        updates.firstName = editFirstName;
        updates.lastNameKana = editLastNameKana;
        updates.firstNameKana = editFirstNameKana;
        updates.furigana = editLastNameKana + (editFirstNameKana ? ' ' + editFirstNameKana : '');
        updates.genderCode = editGenderCode;
        updates.birthDate = editBirthDate;
        updates.hireDate = editHireDate;
        updates.resignDate = editResignDate;
        updates.email = editEmail;
      }
      await updateItem(editingItem.id, updates);
      setEditingItem(null);
      setEditName('');
      setEditDescription('');
      setEditCategory('');
      setEditReverseCode('');
      // 寺院用フィールドのリセット
      setEditSanGo('');
      setEditArea('東京');
      setEditFurigana('');
      setEditSect('');
      setEditPriestName('');
      setEditPostalCode('');
      setEditPrefecture('');
      setEditCity('');
      setEditTown('');
      setEditAddress('');
      setEditBuilding('');
      setEditPhone('');
      setEditMobile('');
      setEditEmail('');
      // 従業員用フィールドのリセット
      setEditLastName('');
      setEditFirstName('');
      setEditLastNameKana('');
      setEditFirstNameKana('');
      setEditGenderCode('');
      setEditBirthDate('');
      setEditHireDate('');
      setEditResignDate('');
    } catch (err) {
      console.error('Error updating item:', err);
      setActionError('アイテムの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingItem, editName, editDescription, editCategory, editReverseCode, editSanGo, editArea, editFurigana, editSect, editPriestName, editPostalCode, editPrefecture, editCity, editTown, editAddress, editBuilding, editPhone, editMobile, editEmail, editLastName, editFirstName, editLastNameKana, editFirstNameKana, editGenderCode, editBirthDate, editHireDate, editResignDate, updateItem, type]);

  // 関係性タイプの新規追加（拡張版）
  const handleAddRelationshipType = useCallback(async () => {
    if (!newCode.trim() || !newName.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      // addItemを使用して新規追加（内部でFirestoreに保存される）
      // カスタムフィールドを含む項目を直接追加するため、updateMasterを使用
      const { addMasterItemWithDetails } = await import('../api/masters');
      await addMasterItemWithDetails('relationshipTypes', {
        id: newCode.trim(),
        code: newCode.trim(),
        name: newName.trim(),
        description: newDescription,
        category: newCategory,
        reverseCode: newReverseCode,
        isActive: true,
      });
      // ダイアログを閉じてリフレッシュ
      setAddDialogOpen(false);
      setNewCode('');
      setNewName('');
      setNewDescription('');
      setNewCategory('その他');
      setNewReverseCode('');
      await refresh();
    } catch (err) {
      console.error('Error adding relationship type:', err);
      setActionError('関係性タイプの追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }, [newCode, newName, newDescription, newCategory, newReverseCode, refresh]);

  // 寺院の新規追加
  const handleAddTemple = useCallback(async () => {
    if (!newCode.trim() || !newName.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const { addMasterItemWithDetails } = await import('../api/masters');
      await addMasterItemWithDetails('temples', {
        id: newCode.trim(),
        code: newCode.trim(),
        name: newName.trim(),
        sanGo: newSanGo,
        area: newArea,
        furigana: newFurigana,
        sect: newSect,
        priestName: newPriestName,
        postalCode: newPostalCode,
        prefecture: newPrefecture,
        city: newCity,
        town: newTown,
        address: newAddress,
        building: newBuilding,
        phone: newPhone,
        mobile: newMobile,
        email: newEmail,
        isActive: true,
      });
      // ダイアログを閉じてリフレッシュ
      setAddDialogOpen(false);
      setNewCode('');
      setNewName('');
      setNewSanGo('');
      setNewArea('東京');
      setNewFurigana('');
      setNewSect('');
      setNewPriestName('');
      setNewPostalCode('');
      setNewPrefecture('');
      setNewCity('');
      setNewTown('');
      setNewAddress('');
      setNewBuilding('');
      setNewPhone('');
      setNewMobile('');
      setNewEmail('');
      await refresh();
    } catch (err) {
      console.error('Error adding temple:', err);
      setActionError('寺院の追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }, [newCode, newName, newSanGo, newArea, newFurigana, newSect, newPriestName, newPostalCode, newPrefecture, newCity, newTown, newAddress, newBuilding, newPhone, newMobile, newEmail, refresh]);

  // 従業員の新規追加
  const handleAddEmployee = useCallback(async () => {
    if (!newCode.trim() || !newLastName.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const { addMasterItemWithDetails } = await import('../api/masters');
      const name = newFirstName ? `${newLastName} ${newFirstName}` : newLastName;
      const furigana = newFirstNameKana ? `${newLastNameKana} ${newFirstNameKana}` : newLastNameKana;
      await addMasterItemWithDetails('employees', {
        id: newCode.trim(),
        code: newCode.trim(),
        name: name,
        lastName: newLastName,
        firstName: newFirstName,
        lastNameKana: newLastNameKana,
        firstNameKana: newFirstNameKana,
        furigana: furigana,
        genderCode: newGenderCode,
        birthDate: newBirthDate,
        hireDate: newHireDate,
        resignDate: newResignDate,
        email: newEmail,
        isActive: !newResignDate,
      });
      // ダイアログを閉じてリフレッシュ
      setAddDialogOpen(false);
      setNewCode('');
      setNewName('');
      setNewLastName('');
      setNewFirstName('');
      setNewLastNameKana('');
      setNewFirstNameKana('');
      setNewGenderCode('2');
      setNewBirthDate('');
      setNewHireDate('');
      setNewResignDate('');
      setNewEmail('');
      await refresh();
    } catch (err) {
      console.error('Error adding employee:', err);
      setActionError('従業員の追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }, [newCode, newLastName, newFirstName, newLastNameKana, newFirstNameKana, newGenderCode, newBirthDate, newHireDate, newResignDate, newEmail, refresh]);

  // アイテム有効/無効切り替え
  const handleToggleActive = useCallback(async (item: MasterItem) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      await updateItem(item.id, { isActive: !item.isActive });
    } catch (err) {
      console.error('Error toggling item:', err);
      setActionError('状態の変更に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }, [updateItem]);

  // 並び順変更
  const handleMoveItem = useCallback(async (index: number, direction: 'up' | 'down') => {
    if (!master) return;
    const items = [...master.items].sort((a, b) => a.sortOrder - b.sortOrder);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    // 入れ替え
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    const newOrder = items.map(item => item.id);

    setIsSubmitting(true);
    setActionError(null);
    try {
      await reorderItems(newOrder);
    } catch (err) {
      console.error('Error reordering items:', err);
      setActionError('並び順の変更に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  }, [master, reorderItems]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const sortedItems = master?.items
    ? [...master.items].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // 関係性タイプの場合はカテゴリ別にグループ化
  if (type === 'relationshipTypes') {
    const extendedItems = sortedItems as ExtendedMasterItem[];

    // 検索フィルタリング
    const filteredItems = searchText
      ? extendedItems.filter(item =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.code?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchText.toLowerCase())
        )
      : extendedItems;

    // カテゴリ別にグループ化
    const groupedItems = filteredItems.reduce((acc, item) => {
      const category = item.category || 'その他';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, ExtendedMasterItem[]>);

    // カテゴリの順序
    const categoryOrder = ['契約関係', '家族関係', '親族関係', 'ビジネス関係', 'その他'];
    const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return (
      <Box>
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          関係性タイプは顧客間の関係を定義するマスターです。各項目のコードと説明を参照して、適切な関係性を選択してください。
        </Alert>

        {/* 新規追加ボタンと検索フィールド */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            disabled={isSubmitting}
          >
            新規追加
          </Button>
          <TextField
            size="small"
            placeholder="検索（名前、コード、説明、カテゴリ）"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: '100%', maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          全 {extendedItems.length} 件中 {filteredItems.length} 件表示
          （有効: {filteredItems.filter(i => i.isActive).length} 件）
        </Typography>

        {/* カテゴリ別アコーディオン */}
        {sortedCategories.map((category) => (
          <Accordion
            key={category}
            expanded={expandedCategory === category || !!searchText}
            onChange={() => setExpandedCategory(expandedCategory === category ? null : category)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {category}
                </Typography>
                <Chip
                  label={`${groupedItems[category].length}件`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <List dense>
                {groupedItems[category].map((item) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      bgcolor: item.isActive ? 'background.paper' : 'action.disabledBackground',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={item.code || item.id}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ minWidth: 80 }}
                          />
                          <Typography
                            sx={{
                              textDecoration: item.isActive ? 'none' : 'line-through',
                              color: item.isActive ? 'text.primary' : 'text.disabled',
                              fontWeight: 500,
                            }}
                          >
                            {item.name}
                          </Typography>
                          {!item.isActive && (
                            <Chip label="無効" size="small" color="default" />
                          )}
                          {item.reverseCode && (
                            <Chip
                              label={`逆: ${item.reverseCode}`}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        item.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {item.description}
                          </Typography>
                        )
                      }
                    />
                    <ListItemSecondaryAction>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={item.isActive}
                            onChange={() => handleToggleActive(item)}
                            disabled={isSubmitting}
                          />
                        }
                        label=""
                        sx={{ mr: 1 }}
                      />
                      <IconButton
                        edge="end"
                        onClick={() => handleEditClick(item)}
                        disabled={isSubmitting}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* 編集ダイアログ（関係性タイプ用） */}
        <Dialog open={!!editingItem} onClose={() => setEditingItem(null)} maxWidth="sm" fullWidth>
          <DialogTitle>関係性タイプの編集</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              {editingItem?.code && (
                <TextField
                  margin="dense"
                  label="コード"
                  fullWidth
                  value={editingItem.code}
                  disabled
                  sx={{ mb: 2 }}
                />
              )}
              <TextField
                autoFocus
                margin="dense"
                label="名前"
                fullWidth
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isSubmitting}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="説明"
                fullWidth
                multiline
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="この関係性タイプの説明を入力"
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>カテゴリ</InputLabel>
                <Select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  label="カテゴリ"
                  disabled={isSubmitting}
                >
                  {RELATIONSHIP_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                label="逆関係コード"
                fullWidth
                value={editReverseCode}
                onChange={(e) => setEditReverseCode(e.target.value)}
                disabled={isSubmitting}
                placeholder="例: KAN1002"
                helperText="逆方向の関係性を示すコード（例：父→子）"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingItem(null)} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button
              onClick={handleUpdateItem}
              variant="contained"
              disabled={!editName.trim() || isSubmitting}
            >
              更新
            </Button>
          </DialogActions>
        </Dialog>

        {/* 新規追加ダイアログ（関係性タイプ用） */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>関係性タイプの新規追加</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <TextField
                autoFocus
                margin="dense"
                label="コード"
                fullWidth
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                disabled={isSubmitting}
                placeholder="例: KAN9001"
                helperText="ユニークなコードを入力（例：KAN9001）"
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="名前"
                fullWidth
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isSubmitting}
                placeholder="例: 知人"
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="説明"
                fullWidth
                multiline
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="この関係性タイプの説明を入力"
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>カテゴリ</InputLabel>
                <Select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  label="カテゴリ"
                  disabled={isSubmitting}
                >
                  {RELATIONSHIP_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                label="逆関係コード"
                fullWidth
                value={newReverseCode}
                onChange={(e) => setNewReverseCode(e.target.value)}
                disabled={isSubmitting}
                placeholder="例: KAN9001（同じコードで双方向）"
                helperText="逆方向の関係性を示すコード（同じ関係なら同じコード）"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button
              onClick={handleAddRelationshipType}
              variant="contained"
              disabled={!newCode.trim() || !newName.trim() || isSubmitting}
            >
              追加
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // 寺院マスターの場合はエリア別にグループ化して表示
  if (type === 'temples') {
    const extendedItems = sortedItems as ExtendedMasterItem[];

    // 検索フィルタリング
    const filteredItems = searchText
      ? extendedItems.filter(item =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.code?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.furigana?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.sanGo?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.area?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.sect?.toLowerCase().includes(searchText.toLowerCase())
        )
      : extendedItems;

    // エリア別にグループ化
    const groupedItems = filteredItems.reduce((acc, item) => {
      const area = item.area || 'その他';
      if (!acc[area]) {
        acc[area] = [];
      }
      acc[area].push(item);
      return acc;
    }, {} as Record<string, ExtendedMasterItem[]>);

    // エリアの順序
    const sortedAreas = Object.keys(groupedItems).sort((a, b) => {
      const aIndex = TEMPLE_AREAS.indexOf(a);
      const bIndex = TEMPLE_AREAS.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return (
      <Box>
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          商談管理に使用する寺院マスターです。寺院名、山号、エリア、宗派などを管理します。
        </Alert>

        {/* 新規追加ボタンと検索フィールド */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            disabled={isSubmitting}
          >
            新規追加
          </Button>
          <TextField
            size="small"
            placeholder="検索（名前、コード、フリガナ、山号、エリア、宗派）"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: '100%', maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          全 {extendedItems.length} 件中 {filteredItems.length} 件表示
          （有効: {filteredItems.filter(i => i.isActive).length} 件）
        </Typography>

        {/* エリア別アコーディオン */}
        {sortedAreas.map((area) => (
          <Accordion
            key={area}
            expanded={expandedCategory === area || !!searchText}
            onChange={() => setExpandedCategory(expandedCategory === area ? null : area)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {area}
                </Typography>
                <Chip
                  label={`${groupedItems[area].length}件`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <List dense>
                {groupedItems[area].map((item) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      bgcolor: item.isActive ? 'background.paper' : 'action.disabledBackground',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={item.code || item.id}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ minWidth: 70 }}
                          />
                          <Typography
                            sx={{
                              textDecoration: item.isActive ? 'none' : 'line-through',
                              color: item.isActive ? 'text.primary' : 'text.disabled',
                              fontWeight: 500,
                            }}
                          >
                            {item.name}
                          </Typography>
                          {item.sanGo && (
                            <Chip label={item.sanGo} size="small" variant="outlined" color="secondary" />
                          )}
                          {item.sect && (
                            <Chip label={item.sect} size="small" variant="outlined" />
                          )}
                          {!item.isActive && (
                            <Chip label="無効" size="small" color="default" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                          {item.furigana && (
                            <Typography variant="body2" color="text.secondary">
                              フリガナ: {item.furigana}
                            </Typography>
                          )}
                          {(item.prefecture || item.city || item.town) && (
                            <Typography variant="body2" color="text.secondary">
                              〒{item.postalCode || ''} {item.prefecture}{item.city}{item.town}{item.address}{item.building ? ` ${item.building}` : ''}
                            </Typography>
                          )}
                          {item.phone && (
                            <Typography variant="body2" color="text.secondary">
                              TEL: {item.phone}
                            </Typography>
                          )}
                          {item.priestName && (
                            <Typography variant="body2" color="text.secondary">
                              住職: {item.priestName}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={item.isActive}
                            onChange={() => handleToggleActive(item)}
                            disabled={isSubmitting}
                          />
                        }
                        label=""
                        sx={{ mr: 1 }}
                      />
                      <IconButton
                        edge="end"
                        onClick={() => handleEditClick(item)}
                        disabled={isSubmitting}
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* 編集ダイアログ（寺院用） */}
        <Dialog open={!!editingItem} onClose={() => setEditingItem(null)} maxWidth="md" fullWidth>
          <DialogTitle>寺院の編集</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <TextField
                margin="dense"
                label="コード"
                fullWidth
                value={editingItem?.code || ''}
                disabled
              />
              <TextField
                margin="dense"
                label="寺院名"
                fullWidth
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="山号"
                fullWidth
                value={editSanGo}
                onChange={(e) => setEditSanGo(e.target.value)}
                disabled={isSubmitting}
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>エリア</InputLabel>
                <Select
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  label="エリア"
                  disabled={isSubmitting}
                >
                  {TEMPLE_AREAS.map((a) => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                label="フリガナ"
                fullWidth
                value={editFurigana}
                onChange={(e) => setEditFurigana(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="宗派"
                fullWidth
                value={editSect}
                onChange={(e) => setEditSect(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="住職氏名"
                fullWidth
                value={editPriestName}
                onChange={(e) => setEditPriestName(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="郵便番号"
                fullWidth
                value={editPostalCode}
                onChange={(e) => setEditPostalCode(e.target.value)}
                disabled={isSubmitting}
                placeholder="000-0000"
              />
              <TextField
                margin="dense"
                label="都道府県"
                fullWidth
                value={editPrefecture}
                onChange={(e) => setEditPrefecture(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="市区"
                fullWidth
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="町村"
                fullWidth
                value={editTown}
                onChange={(e) => setEditTown(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="番地"
                fullWidth
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="建物名"
                fullWidth
                value={editBuilding}
                onChange={(e) => setEditBuilding(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="電話番号"
                fullWidth
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="携帯番号"
                fullWidth
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="メールアドレス"
                fullWidth
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingItem(null)} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button
              onClick={handleUpdateItem}
              variant="contained"
              disabled={!editName.trim() || isSubmitting}
            >
              更新
            </Button>
          </DialogActions>
        </Dialog>

        {/* 新規追加ダイアログ（寺院用） */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>寺院の新規追加</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <TextField
                autoFocus
                margin="dense"
                label="コード"
                fullWidth
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                disabled={isSubmitting}
                placeholder="例: T9001"
                helperText="ユニークなコードを入力（例：T9001）"
                required
              />
              <TextField
                margin="dense"
                label="寺院名"
                fullWidth
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <TextField
                margin="dense"
                label="山号"
                fullWidth
                value={newSanGo}
                onChange={(e) => setNewSanGo(e.target.value)}
                disabled={isSubmitting}
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>エリア</InputLabel>
                <Select
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  label="エリア"
                  disabled={isSubmitting}
                >
                  {TEMPLE_AREAS.map((a) => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                label="フリガナ"
                fullWidth
                value={newFurigana}
                onChange={(e) => setNewFurigana(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="宗派"
                fullWidth
                value={newSect}
                onChange={(e) => setNewSect(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="住職氏名"
                fullWidth
                value={newPriestName}
                onChange={(e) => setNewPriestName(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="郵便番号"
                fullWidth
                value={newPostalCode}
                onChange={(e) => setNewPostalCode(e.target.value)}
                disabled={isSubmitting}
                placeholder="000-0000"
              />
              <TextField
                margin="dense"
                label="都道府県"
                fullWidth
                value={newPrefecture}
                onChange={(e) => setNewPrefecture(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="市区"
                fullWidth
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="町村"
                fullWidth
                value={newTown}
                onChange={(e) => setNewTown(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="番地"
                fullWidth
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="建物名"
                fullWidth
                value={newBuilding}
                onChange={(e) => setNewBuilding(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="電話番号"
                fullWidth
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="携帯番号"
                fullWidth
                value={newMobile}
                onChange={(e) => setNewMobile(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="メールアドレス"
                fullWidth
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button
              onClick={handleAddTemple}
              variant="contained"
              disabled={!newCode.trim() || !newName.trim() || isSubmitting}
            >
              追加
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // 従業員マスターの場合は在籍状況別にグループ化して表示
  if (type === 'employees') {
    const extendedItems = sortedItems as ExtendedMasterItem[];

    // 検索フィルタリング
    const filteredItems = searchText
      ? extendedItems.filter(item =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.code?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.furigana?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.email?.toLowerCase().includes(searchText.toLowerCase())
        )
      : extendedItems;

    // 在籍状況別にグループ化
    const activeEmployees = filteredItems.filter(item => item.isActive);
    const inactiveEmployees = filteredItems.filter(item => !item.isActive);

    return (
      <Box>
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          顧客一覧の「受付担当」フィールドで使用する従業員マスターです。在籍中の従業員と退職済み従業員を管理します。
        </Alert>

        {/* 新規追加ボタンと検索フィールド */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            disabled={isSubmitting}
          >
            新規追加
          </Button>
          <TextField
            size="small"
            placeholder="検索（名前、コード、フリガナ、メール）"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: '100%', maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          全 {extendedItems.length} 件中 {filteredItems.length} 件表示
          （在籍中: {activeEmployees.length} 件、退職済み: {inactiveEmployees.length} 件）
        </Typography>

        {/* 在籍中アコーディオン */}
        <Accordion
          expanded={expandedCategory === '在籍中' || !!searchText}
          onChange={() => setExpandedCategory(expandedCategory === '在籍中' ? null : '在籍中')}
          sx={{ mb: 1 }}
          defaultExpanded
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                在籍中
              </Typography>
              <Chip
                label={`${activeEmployees.length}件`}
                size="small"
                color="success"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List dense>
              {activeEmployees.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={item.code || item.id}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ minWidth: 70 }}
                        />
                        <Typography fontWeight={500}>
                          {item.name}
                        </Typography>
                        {item.genderCode === '1' && (
                          <Chip label="男性" size="small" variant="outlined" color="info" />
                        )}
                        {item.genderCode === '2' && (
                          <Chip label="女性" size="small" variant="outlined" color="secondary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
                        {item.furigana && (
                          <Typography variant="body2" color="text.secondary">
                            フリガナ: {item.furigana}
                          </Typography>
                        )}
                        {item.hireDate && (
                          <Typography variant="body2" color="text.secondary">
                            入社日: {item.hireDate}
                          </Typography>
                        )}
                        {item.email && (
                          <Typography variant="body2" color="text.secondary">
                            Email: {item.email}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={item.isActive}
                          onChange={() => handleToggleActive(item)}
                          disabled={isSubmitting}
                        />
                      }
                      label=""
                      sx={{ mr: 1 }}
                    />
                    <IconButton
                      edge="end"
                      onClick={() => handleEditClick(item)}
                      disabled={isSubmitting}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* 退職済みアコーディオン */}
        <Accordion
          expanded={expandedCategory === '退職済み' || !!searchText}
          onChange={() => setExpandedCategory(expandedCategory === '退職済み' ? null : '退職済み')}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
                退職済み
              </Typography>
              <Chip
                label={`${inactiveEmployees.length}件`}
                size="small"
                color="default"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List dense>
              {inactiveEmployees.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    bgcolor: 'action.disabledBackground',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={item.code || item.id}
                          size="small"
                          variant="outlined"
                          sx={{ minWidth: 70 }}
                        />
                        <Typography
                          sx={{
                            textDecoration: 'line-through',
                            color: 'text.disabled',
                            fontWeight: 500,
                          }}
                        >
                          {item.name}
                        </Typography>
                        <Chip label="退職済" size="small" color="default" />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
                        {item.hireDate && (
                          <Typography variant="body2" color="text.secondary">
                            入社日: {item.hireDate}
                          </Typography>
                        )}
                        {item.resignDate && (
                          <Typography variant="body2" color="text.secondary">
                            退職日: {item.resignDate}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={item.isActive}
                          onChange={() => handleToggleActive(item)}
                          disabled={isSubmitting}
                        />
                      }
                      label=""
                      sx={{ mr: 1 }}
                    />
                    <IconButton
                      edge="end"
                      onClick={() => handleEditClick(item)}
                      disabled={isSubmitting}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* 編集ダイアログ（従業員用） */}
        <Dialog open={!!editingItem} onClose={() => setEditingItem(null)} maxWidth="sm" fullWidth>
          <DialogTitle>従業員の編集</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <TextField
                margin="dense"
                label="従業員コード"
                fullWidth
                value={editingItem?.code || ''}
                disabled
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>性別</InputLabel>
                <Select
                  value={editGenderCode}
                  onChange={(e) => setEditGenderCode(e.target.value)}
                  label="性別"
                  disabled={isSubmitting}
                >
                  <MenuItem value="1">男性</MenuItem>
                  <MenuItem value="2">女性</MenuItem>
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                label="姓"
                fullWidth
                value={editLastName}
                onChange={(e) => {
                  setEditLastName(e.target.value);
                  setEditName(e.target.value + (editFirstName ? ' ' + editFirstName : ''));
                }}
                disabled={isSubmitting}
                required
              />
              <TextField
                margin="dense"
                label="名"
                fullWidth
                value={editFirstName}
                onChange={(e) => {
                  setEditFirstName(e.target.value);
                  setEditName(editLastName + (e.target.value ? ' ' + e.target.value : ''));
                }}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="姓カナ"
                fullWidth
                value={editLastNameKana}
                onChange={(e) => setEditLastNameKana(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="名カナ"
                fullWidth
                value={editFirstNameKana}
                onChange={(e) => setEditFirstNameKana(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="生年月日"
                fullWidth
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                disabled={isSubmitting}
                placeholder="例: 1970/1/15"
              />
              <TextField
                margin="dense"
                label="入社日"
                fullWidth
                value={editHireDate}
                onChange={(e) => setEditHireDate(e.target.value)}
                disabled={isSubmitting}
                placeholder="例: 2020/4/1"
              />
              <TextField
                margin="dense"
                label="退職日"
                fullWidth
                value={editResignDate}
                onChange={(e) => setEditResignDate(e.target.value)}
                disabled={isSubmitting}
                placeholder="空欄で在籍中"
                helperText="退職日を入力すると無効になります"
              />
              <TextField
                margin="dense"
                label="メールアドレス"
                fullWidth
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingItem(null)} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button
              onClick={handleUpdateItem}
              variant="contained"
              disabled={!editLastName.trim() || isSubmitting}
            >
              更新
            </Button>
          </DialogActions>
        </Dialog>

        {/* 新規追加ダイアログ（従業員用） */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>従業員の新規追加</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <TextField
                autoFocus
                margin="dense"
                label="従業員コード"
                fullWidth
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                disabled={isSubmitting}
                placeholder="例: E9100"
                helperText="ユニークなコードを入力"
                required
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>性別</InputLabel>
                <Select
                  value={newGenderCode}
                  onChange={(e) => setNewGenderCode(e.target.value)}
                  label="性別"
                  disabled={isSubmitting}
                >
                  <MenuItem value="1">男性</MenuItem>
                  <MenuItem value="2">女性</MenuItem>
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                label="姓"
                fullWidth
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <TextField
                margin="dense"
                label="名"
                fullWidth
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="姓カナ"
                fullWidth
                value={newLastNameKana}
                onChange={(e) => setNewLastNameKana(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="名カナ"
                fullWidth
                value={newFirstNameKana}
                onChange={(e) => setNewFirstNameKana(e.target.value)}
                disabled={isSubmitting}
              />
              <TextField
                margin="dense"
                label="生年月日"
                fullWidth
                value={newBirthDate}
                onChange={(e) => setNewBirthDate(e.target.value)}
                disabled={isSubmitting}
                placeholder="例: 1970/1/15"
              />
              <TextField
                margin="dense"
                label="入社日"
                fullWidth
                value={newHireDate}
                onChange={(e) => setNewHireDate(e.target.value)}
                disabled={isSubmitting}
                placeholder="例: 2020/4/1"
              />
              <TextField
                margin="dense"
                label="退職日"
                fullWidth
                value={newResignDate}
                onChange={(e) => setNewResignDate(e.target.value)}
                disabled={isSubmitting}
                placeholder="空欄で在籍中"
              />
              <TextField
                margin="dense"
                label="メールアドレス"
                fullWidth
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button
              onClick={handleAddEmployee}
              variant="contained"
              disabled={!newCode.trim() || !newLastName.trim() || isSubmitting}
            >
              追加
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // 通常のマスター項目エディタ
  return (
    <Box>
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* 新規追加ボタン */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
          disabled={isSubmitting}
        >
          新規追加
        </Button>
        <Typography variant="body2" color="text.secondary">
          全 {sortedItems.length} 件（有効: {sortedItems.filter(i => i.isActive).length} 件）
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* アイテムリスト */}
      <List>
        {sortedItems.map((item, index) => (
          <ListItem
            key={item.id}
            sx={{
              bgcolor: item.isActive ? 'background.paper' : 'action.disabledBackground',
              mb: 0.5,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              <IconButton
                size="small"
                onClick={() => handleMoveItem(index, 'up')}
                disabled={index === 0 || isSubmitting}
              >
                <ArrowUpIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleMoveItem(index, 'down')}
                disabled={index === sortedItems.length - 1 || isSubmitting}
              >
                <ArrowDownIcon fontSize="small" />
              </IconButton>
            </Box>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    sx={{
                      textDecoration: item.isActive ? 'none' : 'line-through',
                      color: item.isActive ? 'text.primary' : 'text.disabled',
                    }}
                  >
                    {item.name}
                  </Typography>
                  {!item.isActive && (
                    <Chip label="無効" size="small" color="default" />
                  )}
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={item.isActive}
                    onChange={() => handleToggleActive(item)}
                    disabled={isSubmitting}
                  />
                }
                label=""
                sx={{ mr: 1 }}
              />
              <IconButton
                edge="end"
                onClick={() => handleEditClick(item as ExtendedMasterItem)}
                disabled={isSubmitting}
              >
                <EditIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {sortedItems.length === 0 && (
          <ListItem>
            <ListItemText
              primary="項目がありません"
              sx={{ color: 'text.secondary', textAlign: 'center' }}
            />
          </ListItem>
        )}
      </List>

      {/* 編集ダイアログ（通常用） */}
      <Dialog open={!!editingItem} onClose={() => setEditingItem(null)}>
        <DialogTitle>項目の編集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="項目名"
            fullWidth
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={isSubmitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingItem(null)} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button
            onClick={handleUpdateItem}
            variant="contained"
            disabled={!editName.trim() || isSubmitting}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新規追加ダイアログ（通常マスター用） */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{MASTER_TYPE_LABELS[type]}の新規追加</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="項目名"
              fullWidth
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              disabled={isSubmitting}
              placeholder="新しい項目名を入力"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newItemName.trim()) {
                  handleAddItem();
                  setAddDialogOpen(false);
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button
            onClick={async () => {
              await handleAddItem();
              setAddDialogOpen(false);
            }}
            variant="contained"
            disabled={!newItemName.trim() || isSubmitting}
          >
            追加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function Masters() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        マスター管理
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        各種選択肢のマスターデータを管理します。追加・編集・並び順の変更が可能です。
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="master tabs"
          >
            {MASTER_TYPES.map((type, index) => (
              <Tab
                key={type}
                label={MASTER_TYPE_LABELS[type]}
                id={`master-tab-${index}`}
                aria-controls={`master-tabpanel-${index}`}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          {MASTER_TYPES.map((type, index) => (
            <TabPanel key={type} value={currentTab} index={index}>
              <MasterItemEditor type={type} />
            </TabPanel>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
