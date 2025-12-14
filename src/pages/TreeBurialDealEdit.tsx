/**
 * 樹木墓商談編集ページ
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
    Paper,
    InputAdornment,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getTreeBurialDealById, updateTreeBurialDeal, createTreeBurialDeal } from '../api/treeBurialDeals';
import { createHistoryEntry } from '../api/audit';
import { getMaster } from '../api/masters';
import type { MasterItem } from '../api/masters';
import { calculateChanges } from '../utils/diff';
import type { TreeBurialDeal, TreeBurialDealStatus, TreeBurialCategory } from '../types/firestore';
import { TREE_BURIAL_DEAL_STATUS_LABELS, TREE_BURIAL_CATEGORY_LABELS } from '../types/firestore';
import { HistoryDialog } from '../components/HistoryDialog';
import { useAuth } from '../auth/AuthProvider';
import type { AuditUser } from '../types/audit';

// 樹木墓商談スキーマ
const treeBurialDealSchema = z.object({
    dealName: z.string().min(1, '商談名は必須です'),
    location: z.string().min(1, '拠点は必須です'),
    status: z.string().min(1, 'ステータスは必須です'),
    category: z.string().optional(),
    userName: z.string().optional(),
    userNameKana: z.string().optional(),
    plotType: z.string().optional(),
    plotNumber: z.string().optional(),
    certificateNumber: z.string().optional(),
    receptionist: z.string().optional(),
    burialPerson: z.string().optional(),
    planSubtotal: z.number().min(0).optional().nullable(),
    planPaymentMethod: z.string().optional(),
    planPaymentDate: z.string().optional(),
    optionSubtotal: z.number().min(0).optional().nullable(),
    optionPaymentMethod: z.string().optional(),
    optionPaymentDate: z.string().optional(),
    paymentMemo: z.string().optional(),
    totalAmount: z.number().min(0).optional().nullable(),
    saiProSales: z.number().min(0).optional().nullable(),
    applicationDate: z.string().optional(),
    salesRecordDate: z.string().optional(),
    referrer: z.string().optional(),
    referralFee: z.number().min(0).optional().nullable(),
    lostType: z.string().optional(),
    lostReasonDetail: z.string().optional(),
    templeVisitHistory: z.string().optional(),
    notes: z.string().optional(),
});

type TreeBurialDealFormData = z.infer<typeof treeBurialDealSchema>;

// ステータスオプション
const statusOptions: { value: TreeBurialDealStatus; label: string }[] = [
    { value: 'contracted', label: TREE_BURIAL_DEAL_STATUS_LABELS.contracted },
    { value: 'pending', label: TREE_BURIAL_DEAL_STATUS_LABELS.pending },
    { value: 'lost', label: TREE_BURIAL_DEAL_STATUS_LABELS.lost },
];

// 区分オプション
const categoryOptions: { value: TreeBurialCategory | ''; label: string }[] = [
    { value: '', label: '未選択' },
    { value: 'before_death', label: TREE_BURIAL_CATEGORY_LABELS.before_death },
    { value: 'burial', label: TREE_BURIAL_CATEGORY_LABELS.burial },
];

// 拠点オプション
const locationOptions = [
    '横浜令和の杜',
    '新横浜令和の杜',
    '池上本門寺',
    '龍口の杜',
    'ふうがくの杜',
    '広尾の杜',
    '谷中天龍の杜',
    '町田 久遠の杜',
];

export function TreeBurialDealEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isNew = !id;

    // 履歴ダイアログ用の状態
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

    // 現在のユーザーをAuditUser形式に変換
    const currentAuditUser: AuditUser | undefined = user ? {
        uid: user.uid,
        displayName: user.displayName || user.email || 'Unknown',
        email: user.email || '',
    } : undefined;

    const [deal, setDeal] = useState<TreeBurialDeal | null>(null);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [employees, setEmployees] = useState<MasterItem[]>([]);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<TreeBurialDealFormData>({
        resolver: zodResolver(treeBurialDealSchema),
        defaultValues: {
            dealName: '',
            location: '',
            status: 'pending',
            category: '',
            userName: '',
            userNameKana: '',
            plotType: '',
            plotNumber: '',
            certificateNumber: '',
            receptionist: '',
            burialPerson: '',
            planSubtotal: null,
            planPaymentMethod: '',
            planPaymentDate: '',
            optionSubtotal: null,
            optionPaymentMethod: '',
            optionPaymentDate: '',
            paymentMemo: '',
            totalAmount: null,
            saiProSales: null,
            applicationDate: '',
            salesRecordDate: '',
            referrer: '',
            referralFee: null,
            lostType: '',
            lostReasonDetail: '',
            templeVisitHistory: '',
            notes: '',
        },
    });

    // 従業員マスターを取得
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const masterDoc = await getMaster('employees');
                if (masterDoc?.items) {
                    // アクティブな従業員のみフィルタリング
                    const activeEmployees = masterDoc.items.filter(e => e.isActive !== false);
                    setEmployees(activeEmployees);
                }
            } catch (err) {
                console.error('Error fetching employees:', err);
            }
        };
        fetchEmployees();
    }, []);

    // 商談データを取得
    useEffect(() => {
        const fetchDeal = async () => {
            if (isNew) return;

            try {
                const result = await getTreeBurialDealById(id!);
                if (result) {
                    setDeal(result);
                    reset({
                        dealName: result.dealName || '',
                        location: result.location || '',
                        status: result.status || 'pending',
                        category: result.category || '',
                        userName: result.userName || '',
                        userNameKana: result.userNameKana || '',
                        plotType: result.plotType || '',
                        plotNumber: result.plotNumber || '',
                        certificateNumber: result.certificateNumber || '',
                        receptionist: result.receptionist || '',
                        burialPerson: result.burialPerson || '',
                        planSubtotal: result.planSubtotal ?? null,
                        planPaymentMethod: result.planPaymentMethod || '',
                        planPaymentDate: result.planPaymentDate || '',
                        optionSubtotal: result.optionSubtotal ?? null,
                        optionPaymentMethod: result.optionPaymentMethod || '',
                        optionPaymentDate: result.optionPaymentDate || '',
                        paymentMemo: result.paymentMemo || '',
                        totalAmount: result.totalAmount ?? null,
                        saiProSales: result.saiProSales ?? null,
                        applicationDate: result.applicationDate || '',
                        salesRecordDate: result.salesRecordDate || '',
                        referrer: result.referrer || '',
                        referralFee: result.referralFee ?? null,
                        lostType: result.lostType || '',
                        lostReasonDetail: result.lostReasonDetail || '',
                        templeVisitHistory: result.templeVisitHistory || '',
                        notes: result.notes || '',
                    });
                } else {
                    setError('商談が見つかりません');
                }
            } catch (err) {
                console.error('Error fetching deal:', err);
                setError('商談データの取得に失敗しました');
            } finally {
                setLoading(false);
            }
        };

        fetchDeal();
    }, [id, isNew, reset]);

    // 保存ハンドラ
    const onSubmit = async (data: TreeBurialDealFormData) => {
        setSaving(true);
        try {
            const updateData: Partial<TreeBurialDeal> = {
                dealName: data.dealName,
                location: data.location,
                status: data.status as TreeBurialDealStatus,
                category: data.category as TreeBurialCategory | undefined,
                userName: data.userName || undefined,
                userNameKana: data.userNameKana || undefined,
                plotType: data.plotType || undefined,
                plotNumber: data.plotNumber || undefined,
                certificateNumber: data.certificateNumber || undefined,
                receptionist: data.receptionist || undefined,
                burialPerson: data.burialPerson || undefined,
                planSubtotal: data.planSubtotal ?? undefined,
                planPaymentMethod: data.planPaymentMethod || undefined,
                planPaymentDate: data.planPaymentDate || undefined,
                optionSubtotal: data.optionSubtotal ?? undefined,
                optionPaymentMethod: data.optionPaymentMethod || undefined,
                optionPaymentDate: data.optionPaymentDate || undefined,
                paymentMemo: data.paymentMemo || undefined,
                totalAmount: data.totalAmount ?? undefined,
                saiProSales: data.saiProSales ?? undefined,
                applicationDate: data.applicationDate || undefined,
                salesRecordDate: data.salesRecordDate || undefined,
                referrer: data.referrer || undefined,
                referralFee: data.referralFee ?? undefined,
                lostType: data.lostType || undefined,
                lostReasonDetail: data.lostReasonDetail || undefined,
                templeVisitHistory: data.templeVisitHistory || undefined,
                notes: data.notes || undefined,
            };

            if (isNew) {
                // 新規作成
                const newId = await createTreeBurialDeal({
                    ...updateData,
                    recordId: `manual-${Date.now()}`, // 手動作成のレコードID
                } as Omit<TreeBurialDeal, 'id'>);

                // 履歴を作成
                if (currentAuditUser) {
                    await createHistoryEntry(
                        'TreeBurialDeal',
                        newId,
                        'create',
                        [],
                        updateData,
                        currentAuditUser
                    );
                }

                setSnackbar({
                    open: true,
                    message: '樹木墓商談を作成しました',
                    severity: 'success',
                });
                navigate(`/tree-burial-deals/${newId}`);
            } else {
                // 更新
                await updateTreeBurialDeal(id!, updateData);

                // 履歴を作成
                if (currentAuditUser && deal) {
                    const oldData = deal as unknown as Record<string, unknown>;
                    const newData = { ...deal, ...updateData } as unknown as Record<string, unknown>;
                    const changes = calculateChanges(oldData, newData);
                    if (changes.length > 0) {
                        await createHistoryEntry(
                            'TreeBurialDeal',
                            id!,
                            'update',
                            changes,
                            newData,
                            currentAuditUser
                        );
                    }
                }

                setSnackbar({
                    open: true,
                    message: '樹木墓商談を更新しました',
                    severity: 'success',
                });
                navigate(`/tree-burial-deals/${id}`);
            }
        } catch (err) {
            console.error('Error saving deal:', err);
            setSnackbar({
                open: true,
                message: isNew ? '作成に失敗しました' : '更新に失敗しました',
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
                    onClick={() => navigate('/tree-burial-deals')}
                    sx={{ mb: 2 }}
                >
                    一覧に戻る
                </Button>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {/* ヘッダー */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(isNew ? '/tree-burial-deals' : `/tree-burial-deals/${id}`)}
                        sx={{ mr: 2 }}
                    >
                        戻る
                    </Button>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {isNew ? '樹木墓商談 新規作成' : '樹木墓商談 編集'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {!isNew && (
                        <Button
                            variant="outlined"
                            startIcon={<HistoryIcon />}
                            onClick={() => setHistoryDialogOpen(true)}
                        >
                            履歴
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                        disabled={saving || (!isNew && !isDirty)}
                    >
                        {saving ? '保存中...' : '保存'}
                    </Button>
                </Box>
            </Box>

            {/* 基本情報 */}
            <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>基本情報</Typography>
                <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Controller
                                name="dealName"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="商談名"
                                        required
                                        fullWidth
                                        error={!!errors.dealName}
                                        helperText={errors.dealName?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="location"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        label="拠点"
                                        required
                                        fullWidth
                                        error={!!errors.location}
                                        helperText={errors.location?.message}
                                    >
                                        {locationOptions.map((option) => (
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
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        label="ステータス"
                                        required
                                        fullWidth
                                        error={!!errors.status}
                                        helperText={errors.status?.message}
                                    >
                                        {statusOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="category"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        select
                                        label="区分"
                                        fullWidth
                                    >
                                        {categoryOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="userName"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="使用者名" fullWidth />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="userNameKana"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="フリガナ" fullWidth />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="receptionist"
                                control={control}
                                render={({ field }) => {
                                    // 名前の正規化（空白を除去して比較）
                                    const normalizeName = (name: string) => name.replace(/[\s　]+/g, '');
                                    const currentValue = field.value || '';
                                    const normalizedCurrent = normalizeName(currentValue);
                                    // 空白を無視して一致する従業員を検索
                                    const matchingEmployee = employees.find(emp => normalizeName(emp.name) === normalizedCurrent);
                                    const isCurrentValueInList = !currentValue || !!matchingEmployee;
                                    // マッチした従業員の名前を使用（空白ありの正式名称）
                                    const displayValue = matchingEmployee ? matchingEmployee.name : currentValue;
                                    return (
                                        <TextField
                                            {...field}
                                            value={displayValue}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            select
                                            label="受付担当"
                                            fullWidth
                                        >
                                            <MenuItem value="">
                                                <em>未選択</em>
                                            </MenuItem>
                                            {/* 現在の値がリストにない場合、先頭に表示 */}
                                            {!isCurrentValueInList && currentValue && (
                                                <MenuItem key={`current-${currentValue}`} value={currentValue}>
                                                    {currentValue}（マスター外）
                                                </MenuItem>
                                            )}
                                            {employees.map((emp) => (
                                                <MenuItem key={emp.id} value={emp.name}>
                                                    {emp.name}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    );
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="burialPerson"
                                control={control}
                                render={({ field }) => {
                                    // 名前の正規化（空白を除去して比較）
                                    const normalizeName = (name: string) => name.replace(/[\s　]+/g, '');
                                    const currentValue = field.value || '';
                                    const normalizedCurrent = normalizeName(currentValue);
                                    // 空白を無視して一致する従業員を検索
                                    const matchingEmployee = employees.find(emp => normalizeName(emp.name) === normalizedCurrent);
                                    const isCurrentValueInList = !currentValue || !!matchingEmployee;
                                    // マッチした従業員の名前を使用（空白ありの正式名称）
                                    const displayValue = matchingEmployee ? matchingEmployee.name : currentValue;
                                    return (
                                        <TextField
                                            {...field}
                                            value={displayValue}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            select
                                            label="埋葬担当"
                                            fullWidth
                                        >
                                            <MenuItem value="">
                                                <em>未選択</em>
                                            </MenuItem>
                                            {/* 現在の値がリストにない場合、先頭に表示 */}
                                            {!isCurrentValueInList && currentValue && (
                                                <MenuItem key={`current-${currentValue}`} value={currentValue}>
                                                    {currentValue}（マスター外）
                                                </MenuItem>
                                            )}
                                            {employees.map((emp) => (
                                                <MenuItem key={emp.id} value={emp.name}>
                                                    {emp.name}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    );
                                }}
                            />
                        </Grid>
                </Grid>
            </Paper>

            {/* 区画情報 */}
            <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>区画情報</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Controller
                            name="plotType"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="区画/種類" fullWidth />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Controller
                            name="plotNumber"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="区画NO" fullWidth />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Controller
                            name="certificateNumber"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="承認証番号" fullWidth />
                            )}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* 金額情報 */}
            <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>金額情報</Typography>
                <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="planSubtotal"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="number"
                                        label="プラン小計"
                                        fullWidth
                                        value={field.value ?? ''}
                                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="optionSubtotal"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="number"
                                        label="オプション小計"
                                        fullWidth
                                        value={field.value ?? ''}
                                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="totalAmount"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="number"
                                        label="合計金額"
                                        fullWidth
                                        value={field.value ?? ''}
                                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="saiProSales"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="number"
                                        label="彩プロ売上"
                                        fullWidth
                                        value={field.value ?? ''}
                                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="planPaymentMethod"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="プラン入金方法" fullWidth />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="optionPaymentMethod"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="オプション入金方法" fullWidth />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller
                                name="paymentMemo"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="入金メモ" fullWidth multiline rows={2} />
                                )}
                            />
                        </Grid>
                </Grid>
            </Paper>

            {/* 日付情報 */}
            <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>日付情報</Typography>
                <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="applicationDate"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="date"
                                        label="申込日"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="salesRecordDate"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="date"
                                        label="売上計上日"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="planPaymentDate"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="date"
                                        label="プラン入金日"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="optionPaymentDate"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        type="date"
                                        label="オプション入金日"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                )}
                            />
                        </Grid>
                </Grid>
            </Paper>

            {/* 紹介情報 */}
            <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>紹介情報</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Controller
                            name="referrer"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="紹介者" fullWidth />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Controller
                            name="referralFee"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    type="number"
                                    label="紹介手数料"
                                    fullWidth
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                                    }}
                                />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Controller
                            name="templeVisitHistory"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="来寺経緯" fullWidth />
                            )}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* 失注情報 */}
            <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>失注情報</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Controller
                            name="lostType"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="失注種別" fullWidth />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Controller
                            name="lostReasonDetail"
                            control={control}
                            render={({ field }) => (
                                <TextField {...field} label="失注理由詳細" fullWidth multiline rows={2} />
                            )}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* 備考 */}
            <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>備考</Typography>
                <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                        <TextField {...field} label="備考" fullWidth multiline rows={4} />
                    )}
                />
            </Paper>

            {/* 履歴ダイアログ */}
            {id && (
                <HistoryDialog
                    open={historyDialogOpen}
                    onClose={() => setHistoryDialogOpen(false)}
                    entityType="TreeBurialDeal"
                    entityId={id}
                    entityName={deal?.dealName || '樹木墓商談'}
                    currentUser={currentAuditUser}
                />
            )}

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
