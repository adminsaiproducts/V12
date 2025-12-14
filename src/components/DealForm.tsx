/**
 * 商談フォームコンポーネント
 */

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  CircularProgress,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { DealStage } from '../types/firestore';
import { DEAL_STAGE_LABELS } from '../types/firestore';
import { useMaster } from '../hooks/useMasters';

// 商談スキーマ
const dealSchema = z.object({
  // 基本情報
  title: z.string().min(1, '商談名は必須です'),
  stage: z.string().min(1, 'ステージは必須です'),
  probability: z.number().min(0).max(100).optional(),
  amount: z.number().min(0).optional(),

  // 寺院・プラン
  templeName: z.string().optional(),
  productCategory: z.string().optional(),
  productSubcategory: z.string().optional(),
  planName: z.string().optional(),

  // 流入経路・競合
  visitRoute: z.string().optional(),
  competitor: z.string().optional(),

  // 日付
  inquiryDate: z.string().optional(),
  documentSentDate: z.string().optional(),
  followUpEmailDate: z.string().optional(),
  followUpCallDate: z.string().optional(),
  visitDate: z.string().optional(),
  visitFollowUpDate: z.string().optional(),
  tentativeReservationDate: z.string().optional(),
  contractDate: z.string().optional(),
  expectedCloseDate: z.string().optional(),

  // 入金情報
  paymentDate1: z.string().optional(),
  paymentAmount1: z.number().min(0).optional(),
  paymentDate2: z.string().optional(),
  paymentAmount2: z.number().min(0).optional(),
  paymentDate3: z.string().optional(),
  paymentAmount3: z.number().min(0).optional(),
  totalPayment: z.number().min(0).optional(),
  remainingBalance: z.number().min(0).optional(),

  // その他
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  salesMonth: z.string().optional(),
  deliveryDate: z.string().optional(),
});

export type DealFormData = z.infer<typeof dealSchema>;

// 顧客情報（必須）
interface CustomerInfo {
  customerId: string;
  customerTrackingNo: string;
  customerName: string;
}

interface DealFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: DealFormData & CustomerInfo) => Promise<void>;
  initialData?: Partial<DealFormData>;
  mode: 'create' | 'edit';
  // 顧客情報は必須
  customer: CustomerInfo;
}

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
const productCategoryOptions = [
  '樹木墓',
  'その他',
];

// 商品サブカテゴリオプション
const productSubcategoryOptions = [
  '樹木墓プラン',
  '樹木墓オプション',
  '埋葬彫刻',
  '広報',
];

// プランオプション
const planOptions = [
  '2名用',
  '家族用',
  '1名用',
  'ペアセット',
  '樹木墓オプション',
];

// 流入経路オプション
const visitRouteOptions = [
  'WEB',
  '鎌倉新書',
  '看板広告',
  '雑誌',
  'チラシ',
  '紹介',
  'リピーター',
  'その他',
];

export const DealForm: React.FC<DealFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  mode,
  customer,
}) => {
  // 従業員マスターを取得
  const { master: employeesMaster, loading: employeesLoading } = useMaster('employees');

  // アクティブな従業員のみ取得し、フリガナ昇順でソート
  const activeEmployees = React.useMemo(() => {
    if (!employeesMaster?.items) return [];
    return employeesMaster.items
      .filter(item => item.isActive)
      .sort((a, b) => (a.furigana || '').localeCompare(b.furigana || '', 'ja'));
  }, [employeesMaster]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      stage: 'inquiry',
      ...initialData,
    },
  });

  // ダイアログが開いたときに初期データをリセット
  useEffect(() => {
    if (open) {
      reset({
        stage: 'inquiry',
        ...initialData,
      });
    }
  }, [open, initialData, reset]);

  // ステージが契約済の場合、確度を100%に自動設定
  const currentStage = watch('stage');
  useEffect(() => {
    if (currentStage === 'contracted') {
      setValue('probability', 100);
    }
  }, [currentStage, setValue]);

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

  const handleFormSubmit = async (data: DealFormData) => {
    // 顧客情報を含めて送信
    await onSubmit({
      ...data,
      customerId: customer.customerId,
      customerTrackingNo: customer.customerTrackingNo,
      customerName: customer.customerName,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? '新規商談登録' : '商談編集'}
        <Typography variant="subtitle2" color="text.secondary">
          顧客: {customer.customerName} (No. {customer.customerTrackingNo})
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          {/* 基本情報 */}
          <Accordion expanded>
            <AccordionSummary>
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
                            {employee.name}{employee.furigana ? ` (${employee.furigana})` : ''}
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
          <Accordion expanded>
            <AccordionSummary>
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
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
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
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
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
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
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
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
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
          <Accordion expanded>
            <AccordionSummary>
              <Typography variant="subtitle1" fontWeight="bold">進捗日付</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="inquiryDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="問い合わせ日"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="documentSentDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="資料送付日"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="followUpEmailDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="追客メール日"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="followUpCallDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="追客TEL日"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="visitDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="見学日"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="visitFollowUpDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="見学フォロー日"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="tentativeReservationDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="仮予約日"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="contractDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="契約日"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="expectedCloseDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="見込み完了日"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="deliveryDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="工事完了引渡日"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="salesMonth"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="売上計上月"
                        fullWidth
                        type="month"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 入金情報 */}
          <Accordion expanded>
            <AccordionSummary>
              <Typography variant="subtitle1" fontWeight="bold">入金情報</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="paymentDate1"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="入金日1"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
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
                      <TextField
                        {...field}
                        label="入金日2"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
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
                      <TextField
                        {...field}
                        label="入金日3"
                        fullWidth
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
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
                <Grid item xs={12} sm={4} />
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="totalPayment"
                    control={control}
                    render={({ field: { value, ...field } }) => (
                      <TextField
                        {...field}
                        label="入金合計"
                        fullWidth
                        type="number"
                        value={value ?? ''}
                        disabled
                        InputProps={{
                          startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Controller
                    name="remainingBalance"
                    control={control}
                    render={({ field: { value, ...field } }) => (
                      <TextField
                        {...field}
                        label="残高"
                        fullWidth
                        type="number"
                        value={value ?? ''}
                        disabled
                        InputProps={{
                          startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                        }}
                        sx={{
                          '& .MuiInputBase-input': {
                            color: value && value > 0 ? 'warning.main' : 'text.primary',
                          },
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 備考 */}
          <Accordion expanded>
            <AccordionSummary>
              <Typography variant="subtitle1" fontWeight="bold">備考</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="備考"
                        fullWidth
                        multiline
                        rows={4}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={24} /> : mode === 'create' ? '登録' : '更新'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
