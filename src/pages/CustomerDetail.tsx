import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { getCustomerByTrackingNo, updateCustomer } from '../api/customers';
import { deleteCustomer } from '../lib/customerService';
import type { Customer } from '../types/firestore';
import {
  formatAddress,
  getCustomerName,
  getCustomerNameKana,
  getPhoneNumber,
  getEmail,
  getMemo,
  extractValue,
} from '../utils/v9DataHelpers';
import { CustomerForm, CustomerFormData } from '../components/CustomerForm';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchCustomer = async () => {
    if (!id) {
      setError('顧客IDが指定されていません');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getCustomerByTrackingNo(id);
      if (result) {
        setCustomer(result);
      } else {
        setError('顧客が見つかりません');
      }
    } catch (err) {
      setError('顧客データの取得に失敗しました');
      console.error('Error fetching customer:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  // 顧客データをフォームデータに変換
  const convertToFormData = (customer: Customer): Partial<CustomerFormData> => {
    const customerData = customer as unknown as Record<string, unknown>;
    const addressObj = customerData.address as Record<string, unknown> | undefined;

    return {
      trackingNo: customer.trackingNo || '',
      name: getCustomerName(customerData),
      nameKana: getCustomerNameKana(customerData),
      phone: getPhoneNumber(customerData.phone),
      phone2: getPhoneNumber(customerData.phone2),
      email: getEmail(customerData.email),
      postalCode: addressObj ? extractValue(addressObj.postalCode) : '',
      prefecture: addressObj ? extractValue(addressObj.prefecture) : '',
      city: addressObj ? extractValue(addressObj.city) : '',
      town: addressObj ? extractValue(addressObj.town) || extractValue(addressObj.streetNumber) : '',
      building: addressObj ? extractValue(addressObj.building) : '',
      memo: getMemo(customerData.memo),
    };
  };

  // フォーム送信ハンドラ
  const handleFormSubmit = async (data: CustomerFormData) => {
    if (!customer?.id) return;

    try {
      // 住所オブジェクトを構築
      const addressUpdate = {
        postalCode: data.postalCode || '',
        prefecture: data.prefecture || '',
        city: data.city || '',
        town: data.town || '',
        building: data.building || '',
        full: [data.prefecture, data.city, data.town, data.building].filter(Boolean).join(''),
      };

      await updateCustomer(customer.id, {
        name: data.name,
        nameKana: data.nameKana || '',
        phone: data.phone || '',
        phone2: data.phone2 || '',
        email: data.email || '',
        address: addressUpdate,
        memo: data.memo || '',
      });

      setSnackbar({
        open: true,
        message: '顧客情報を更新しました',
        severity: 'success',
      });

      // データを再読み込み
      await fetchCustomer();
    } catch (err) {
      console.error('Error updating customer:', err);
      setSnackbar({
        open: true,
        message: '顧客情報の更新に失敗しました',
        severity: 'error',
      });
      throw err;
    }
  };

  // 削除ハンドラ
  const handleDelete = async () => {
    if (!customer?.id) return;

    setIsDeleting(true);
    try {
      await deleteCustomer(customer.id);
      setSnackbar({
        open: true,
        message: '顧客を削除しました',
        severity: 'success',
      });
      // 一覧画面に戻る
      navigate('/customers');
    } catch (err) {
      console.error('Error deleting customer:', err);
      setSnackbar({
        open: true,
        message: '顧客の削除に失敗しました',
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
          onClick={() => navigate('/customers')}
          sx={{ mb: 2 }}
        >
          顧客一覧に戻る
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!customer) {
    return null;
  }

  // V9データ構造対応のため、customerをRecord型として扱う
  const customerData = customer as unknown as Record<string, unknown>;
  const name = getCustomerName(customerData);
  const nameKana = getCustomerNameKana(customerData);
  const phone = getPhoneNumber(customerData.phone);
  const phone2 = getPhoneNumber(customerData.phone2);
  const email = getEmail(customerData.email);
  const address = formatAddress(customerData.address);
  const memo = getMemo(customerData.memo);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/customers')}
        >
          顧客一覧に戻る
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => setEditDialogOpen(true)}
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

      <Typography variant="h4" component="h1" gutterBottom>
        {name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        管理番号: {customer.trackingNo || customer.id}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* 基本情報 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                基本情報
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ '& > *': { mb: 1.5 } }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    氏名
                  </Typography>
                  <Typography>{name}</Typography>
                </Box>

                {nameKana && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      フリガナ
                    </Typography>
                    <Typography>{nameKana}</Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    電話番号
                  </Typography>
                  <Typography>{phone}</Typography>
                </Box>

                {phone2 && phone2 !== '-' && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      電話番号2
                    </Typography>
                    <Typography>{phone2}</Typography>
                  </Box>
                )}

                {email && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      メール
                    </Typography>
                    <Typography>{email}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 住所情報 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                住所
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Typography>{address}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 備考 */}
        {memo && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  備考
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Typography
                  sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {memo}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* 編集ダイアログ */}
      <CustomerForm
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={convertToFormData(customer)}
        mode="edit"
      />

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>顧客を削除しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{name}」を削除します。この操作は取り消せません。
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
