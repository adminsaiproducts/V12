/**
 * 新規商談入力ページ
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createDeal } from '../api/deals';
import { getCustomerByTrackingNo } from '../api/customers';
import { getCustomers } from '../api/customers';
import type { DealStage, Customer } from '../types/firestore';
import { DEAL_STAGE_LABELS } from '../types/firestore';
import { getCustomerName } from '../utils/v9DataHelpers';

// 商談スキーマ（顧客情報は必須）
const dealSchema = z.object({
  customerId: z.string().min(1, '顧客を選択してください'),
  customerTrackingNo: z.string().min(1, '顧客を選択してください'),
  customerName: z.string().min(1, '顧客を選択してください'),
  title: z.string().min(1, '商談名は必須です'),
  stage: z.string().min(1, 'ステージは必須です'),
  probability: z.number().min(0).max(100).optional(),
  amount: z.number().min(0).optional(),
  templeName: z.string().optional(),
  productCategory: z.string().optional(),
  productSubcategory: z.string().optional(),
  planName: z.string().optional(),
  visitRoute: z.string().optional(),
  competitor: z.string().optional(),
  inquiryDate: z.string().optional(),
  documentSentDate: z.string().optional(),
  followUpEmailDate: z.string().optional(),
  followUpCallDate: z.string().optional(),
  visitDate: z.string().optional(),
  visitFollowUpDate: z.string().optional(),
  tentativeReservationDate: z.string().optional(),
  applicationDate: z.string().optional(),
  contractDate: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  paymentDate1: z.string().optional(),
  paymentAmount1: z.number().min(0).optional(),
  paymentDate2: z.string().optional(),
  paymentAmount2: z.number().min(0).optional(),
  paymentDate3: z.string().optional(),
  paymentAmount3: z.number().min(0).optional(),
  totalPayment: z.number().min(0).optional(),
  remainingBalance: z.number().min(0).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  salesMonth: z.string().optional(),
  deliveryDate: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

// ステージオプション
const stageOptions: { value: DealStage; label: string }[] = [
  { value: 'inquiry', label: DEAL_STAGE_LABELS.inquiry },
  { value: 'document_sent', label: DEAL_STAGE_LABELS.document_sent },
  { value: 'follow_up', label: DEAL_STAGE_LABELS.follow_up },
  { value: 'visit_scheduled', label: DEAL_STAGE_LABELS.visit_scheduled },
  { value: 'visited', label: DEAL_STAGE_LABELS.visited },
  { value: 'tentative', label: DEAL_STAGE_LABELS.tentative },
  { value: 'application', label: DEAL_STAGE_LABELS.application },
  { value: 'contracted', label: DEAL_STAGE_LABELS.contracted },
  { value: 'a_yomi', label: DEAL_STAGE_LABELS.a_yomi },
  { value: 'b_yomi', label: DEAL_STAGE_LABELS.b_yomi },
  { value: 'c_yomi', label: DEAL_STAGE_LABELS.c_yomi },
  { value: 'lost', label: DEAL_STAGE_LABELS.lost },
];

// 商品カテゴリオプション
const productCategoryOptions = ['樹木墓', 'その他'];

// 商品サブカテゴリオプション
const productSubcategoryOptions = ['樹木墓プラン', '樹木墓オプション', '埋葬彫刻', '広報'];

// プランオプション
const planOptions = ['2名用', '家族用', '1名用', 'ペアセット', '樹木墓オプション'];

// 流入経路オプション
const visitRouteOptions = ['WEB', '鎌倉新書', '看板広告', '雑誌', 'チラシ', '紹介', 'リピーター', 'その他'];

export function DealNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerTrackingNoParam = searchParams.get('customer');

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic', 'customer']);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      stage: 'inquiry',
    },
  });

  // 顧客一覧を取得
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const result = await getCustomers(500);
        setCustomers(result);

        // URLパラメータで顧客が指定されている場合
        if (customerTrackingNoParam) {
          const customer = await getCustomerByTrackingNo(customerTrackingNoParam);
          if (customer) {
            setSelectedCustomer(customer);
            setValue('customerId', customer.id);
            setValue('customerTrackingNo', customer.trackingNo);
            setValue('customerName', getCustomerName(customer as unknown as Record<string, unknown>));
          }
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setCustomersLoading(false);
      }
    };

    fetchCustomers();
  }, [customerTrackingNoParam, setValue]);

  // 入金合計と残高の自動計算
  const amount = watch('amount');
  const paymentAmount1 = watch('paymentAmount1');
  const paymentAmount2 = watch('paymentAmount2');
  const paymentAmount3 = watch('paymentAmount3');

  useEffect(() => {
    const total = (paymentAmount1 || 0) + (paymentAmount2 || 0) + (paymentAmount3 || 0);
    setValue('totalPayment', total);
    if (amount !== undefined) {
      setValue('remainingBalance', Math.max(0, amount - total));
    }
  }, [amount, paymentAmount1, paymentAmount2, paymentAmount3, setValue]);

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSections(prev =>
      isExpanded ? [...prev, panel] : prev.filter(p => p !== panel)
    );
  };

  const handleCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setValue('customerId', customer.id);
      setValue('customerTrackingNo', customer.trackingNo);
      setValue('customerName', getCustomerName(customer as unknown as Record<string, unknown>));
    } else {
      setValue('customerId', '');
      setValue('customerTrackingNo', '');
      setValue('customerName', '');
    }
  };

  const onSubmit = async (data: DealFormData) => {
    setLoading(true);
    try {
      const dealId = await createDeal({
        customerId: data.customerId,
        customerTrackingNo: data.customerTrackingNo,
        customerName: data.customerName,
        title: data.title,
        stage: data.stage as DealStage,
        probability: data.probability,
        amount: data.amount,
        templeName: data.templeName,
        productCategory: data.productCategory,
        productSubcategory: data.productSubcategory,
        planName: data.planName,
        visitRoute: data.visitRoute,
        competitor: data.competitor,
        inquiryDate: data.inquiryDate,
        documentSentDate: data.documentSentDate,
        followUpEmailDate: data.followUpEmailDate,
        followUpCallDate: data.followUpCallDate,
        visitDate: data.visitDate,
        visitFollowUpDate: data.visitFollowUpDate,
        tentativeReservationDate: data.tentativeReservationDate,
        applicationDate: data.applicationDate,
        contractDate: data.contractDate,
        expectedCloseDate: data.expectedCloseDate,
        paymentDate1: data.paymentDate1,
        paymentAmount1: data.paymentAmount1,
        paymentDate2: data.paymentDate2,
        paymentAmount2: data.paymentAmount2,
        paymentDate3: data.paymentDate3,
        paymentAmount3: data.paymentAmount3,
        totalPayment: data.totalPayment,
        remainingBalance: data.remainingBalance,
        assignedTo: data.assignedTo,
        notes: data.notes,
        salesMonth: data.salesMonth,
        deliveryDate: data.deliveryDate,
      });

      setSnackbar({
        open: true,
        message: '商談を登録しました',
        severity: 'success',
      });

      // 詳細ページに遷移
      setTimeout(() => {
        navigate(`/deals/${dealId}`);
      }, 1000);
    } catch (err) {
      console.error('Error creating deal:', err);
      setSnackbar({
        open: true,
        message: '商談の登録に失敗しました',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/deals')}
        >
          商談一覧に戻る
        </Button>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        新規商談登録
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {/* 顧客選択 */}
        <Accordion
          expanded={expandedSections.includes('customer')}
          onChange={handleAccordionChange('customer')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">顧客選択</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Autocomplete
                  options={customers}
                  loading={customersLoading}
                  value={selectedCustomer}
                  onChange={(_, value) => handleCustomerChange(value)}
                  getOptionLabel={(option) =>
                    `${option.trackingNo} - ${getCustomerName(option as unknown as Record<string, unknown>)}`
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="顧客"
                      required
                      error={!!errors.customerId}
                      helperText={errors.customerId?.message}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {customersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* 基本情報 */}
        <Accordion
          expanded={expandedSections.includes('basic')}
          onChange={handleAccordionChange('basic')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">基本情報</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="商談名"
                      fullWidth
                      required
                      error={!!errors.title}
                      helperText={errors.title?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="stage"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="ステージ"
                      fullWidth
                      required
                      error={!!errors.stage}
                      helperText={errors.stage?.message}
                    >
                      {stageOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="probability"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <TextField
                      {...field}
                      label="確度"
                      fullWidth
                      type="number"
                      value={value ?? ''}
                      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      inputProps={{ min: 0, max: 100 }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="amount"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <TextField
                      {...field}
                      label="金額"
                      fullWidth
                      type="number"
                      value={value ?? ''}
                      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="assignedTo"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="担当者" fullWidth />
                  )}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* 寺院・プラン */}
        <Accordion
          expanded={expandedSections.includes('temple')}
          onChange={handleAccordionChange('temple')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">寺院・プラン</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="templeName"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="寺院名" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="productCategory"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select label="商品カテゴリ" fullWidth>
                      <MenuItem value="">選択してください</MenuItem>
                      {productCategoryOptions.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="productSubcategory"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select label="商品サブカテゴリ" fullWidth>
                      <MenuItem value="">選択してください</MenuItem>
                      {productSubcategoryOptions.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="planName"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select label="プラン" fullWidth>
                      <MenuItem value="">選択してください</MenuItem>
                      {planOptions.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="visitRoute"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select label="流入経路" fullWidth>
                      <MenuItem value="">選択してください</MenuItem>
                      {visitRouteOptions.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="competitor"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="競合他社・他拠点" fullWidth />
                  )}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* 進捗日付 */}
        <Accordion
          expanded={expandedSections.includes('dates')}
          onChange={handleAccordionChange('dates')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">進捗日付</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="inquiryDate"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="問い合わせ日" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="documentSentDate"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="資料送付日" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="visitDate"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="見学日" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="tentativeReservationDate"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="仮予約日" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="applicationDate"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="申込日" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="contractDate"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="契約日" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="salesMonth"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="売上計上月" fullWidth type="month" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* 入金情報 */}
        <Accordion
          expanded={expandedSections.includes('payment')}
          onChange={handleAccordionChange('payment')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">入金情報</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="paymentDate1"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="入金日1" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="paymentAmount1"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <TextField
                      {...field}
                      label="入金額1"
                      fullWidth
                      type="number"
                      value={value ?? ''}
                      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4} />
              <Grid item xs={6} sm={4}>
                <Controller
                  name="paymentDate2"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="入金日2" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="paymentAmount2"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <TextField
                      {...field}
                      label="入金額2"
                      fullWidth
                      type="number"
                      value={value ?? ''}
                      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4} />
              <Grid item xs={6} sm={4}>
                <Controller
                  name="paymentDate3"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="入金日3" fullWidth type="date" InputLabelProps={{ shrink: true }} />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="paymentAmount3"
                  control={control}
                  render={({ field: { onChange, value, ...field } }) => (
                    <TextField
                      {...field}
                      label="入金額3"
                      fullWidth
                      type="number"
                      value={value ?? ''}
                      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* 備考 */}
        <Accordion
          expanded={expandedSections.includes('notes')}
          onChange={handleAccordionChange('notes')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">備考</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="備考" fullWidth multiline rows={4} />
                  )}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* 送信ボタン */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/deals')}
            disabled={isSubmitting || loading}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={isSubmitting || loading}
          >
            登録
          </Button>
        </Box>
      </Box>

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
