/**
 * 商談編集ページ
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getDealById, updateDeal } from '../api/deals';
import type { DealStage, Deal } from '../types/firestore';
import { DEAL_STAGE_LABELS } from '../types/firestore';
import { useMaster } from '../hooks/useMasters';

// 商談スキーマ
const dealSchema = z.object({
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

export function DealEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 従業員マスターを取得
  const { master: employeesMaster, loading: employeesLoading } = useMaster('employees');

  // アクティブな従業員のみ取得し、ソート順に並べる
  const activeEmployees = employeesMaster?.items
    ? employeesMaster.items
        .filter(item => item.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic']);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
  });

  // 商談データを取得
  useEffect(() => {
    const fetchDeal = async () => {
      if (!id) {
        setError('商談IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        const result = await getDealById(id);
        if (result) {
          setDeal(result);
          // フォームに値を設定
          reset({
            title: result.title,
            stage: result.stage,
            probability: result.probability,
            amount: result.amount,
            templeName: result.templeName || '',
            productCategory: result.productCategory || '',
            productSubcategory: result.productSubcategory || '',
            planName: result.planName || '',
            visitRoute: result.visitRoute || '',
            competitor: result.competitor || '',
            inquiryDate: result.inquiryDate || '',
            documentSentDate: result.documentSentDate || '',
            followUpEmailDate: result.followUpEmailDate || '',
            followUpCallDate: result.followUpCallDate || '',
            visitDate: result.visitDate || '',
            visitFollowUpDate: result.visitFollowUpDate || '',
            tentativeReservationDate: result.tentativeReservationDate || '',
            applicationDate: result.applicationDate || '',
            contractDate: result.contractDate || '',
            expectedCloseDate: result.expectedCloseDate || '',
            paymentDate1: result.paymentDate1 || '',
            paymentAmount1: result.paymentAmount1,
            paymentDate2: result.paymentDate2 || '',
            paymentAmount2: result.paymentAmount2,
            paymentDate3: result.paymentDate3 || '',
            paymentAmount3: result.paymentAmount3,
            totalPayment: result.totalPayment,
            remainingBalance: result.remainingBalance,
            assignedTo: result.assignedTo || '',
            notes: result.notes || '',
            salesMonth: result.salesMonth || '',
            deliveryDate: result.deliveryDate || '',
          });
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

    fetchDeal();
  }, [id, reset]);

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

  const onSubmit = async (data: DealFormData) => {
    if (!id) return;

    setSaving(true);
    try {
      await updateDeal(id, {
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
        message: '商談を更新しました',
        severity: 'success',
      });

      // 詳細ページに遷移
      setTimeout(() => {
        navigate(`/deals/${id}`);
      }, 1000);
    } catch (err) {
      console.error('Error updating deal:', err);
      setSnackbar({
        open: true,
        message: '商談の更新に失敗しました',
        severity: 'error',
      });
    } finally {
      setSaving(false);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/deals/${id}`)}
        >
          商談詳細に戻る
        </Button>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        商談編集
      </Typography>

      {/* 顧客情報（読み取り専用） */}
      {deal.customerName && (
        <Alert severity="info" sx={{ mb: 3 }}>
          顧客: {deal.customerName} {deal.customerTrackingNo && `(No. ${deal.customerTrackingNo})`}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
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
                    <TextField
                      {...field}
                      select
                      label="担当者"
                      fullWidth
                      disabled={employeesLoading}
                    >
                      <MenuItem value="">
                        <em>選択してください</em>
                      </MenuItem>
                      {activeEmployees.map((employee) => (
                        <MenuItem key={employee.id} value={employee.name}>
                          {employee.name}
                        </MenuItem>
                      ))}
                    </TextField>
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
              <Grid item xs={6} sm={4}>
                <Controller
                  name="deliveryDate"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="工事完了引渡日" fullWidth type="date" InputLabelProps={{ shrink: true }} />
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
            onClick={() => navigate(`/deals/${id}`)}
            disabled={isSubmitting || saving}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={isSubmitting || saving}
          >
            保存
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
