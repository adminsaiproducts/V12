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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { getCustomerByTrackingNo } from '../api/customers';
import type { Customer } from '../types/firestore';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    fetchCustomer();
  }, [id]);

  const formatAddress = (address?: Customer['address']): string => {
    if (!address) return '-';
    return (
      address.full ||
      [
        address.postalCode ? `〒${address.postalCode}` : '',
        address.prefecture,
        address.city,
        address.town,
        address.building,
      ]
        .filter(Boolean)
        .join(' ')
    );
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

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/customers')}
        sx={{ mb: 2 }}
      >
        顧客一覧に戻る
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        {customer.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        管理番号: {customer.trackingNo}
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
                  <Typography>{customer.name}</Typography>
                </Box>

                {customer.nameKana && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      フリガナ
                    </Typography>
                    <Typography>{customer.nameKana}</Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    電話番号
                  </Typography>
                  <Typography>{customer.phone || '-'}</Typography>
                </Box>

                {customer.phone2 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      電話番号2
                    </Typography>
                    <Typography>{customer.phone2}</Typography>
                  </Box>
                )}

                {customer.email && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      メール
                    </Typography>
                    <Typography>{customer.email}</Typography>
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

              <Typography>{formatAddress(customer.address)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 備考 */}
        {customer.memo && (
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
                  {customer.memo}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
