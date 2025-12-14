/**
 * 埋葬者編集ページ
 * 新規作成と編集の両方に対応
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    CircularProgress,
    Alert,
    MenuItem,
    Divider,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { getBurialPersonById, createBurialPerson, updateBurialPerson } from '../api/burialPersons';
import { createHistoryEntry } from '../api/audit';
import { calculateChanges } from '../utils/diff';
import { useAuth } from '../auth/AuthProvider';
import type { BurialPerson } from '../types/firestore';

// バリデーションスキーマ
const burialPersonSchema = z.object({
    // 使用者情報
    userName: z.string().optional(),
    userNameKana: z.string().optional(),
    // 埋葬者情報
    buriedPersonName: z.string().optional(),
    buriedPersonNameKana: z.string().optional(),
    buriedPersonNameAlphabet: z.string().optional(),
    relationshipToUser: z.string().optional(),
    // 区画情報
    location: z.string().optional(),
    plotType: z.string().optional(),
    plotNumber: z.string().optional(),
    certificateNumber: z.string().optional(),
    // 商談情報
    dealName: z.string().optional(),
    contractDate: z.string().optional(),
    // 埋葬情報
    burialStatus: z.string().optional(),
    burialDate: z.string().optional(),
    burialOrder: z.union([z.number(), z.string()]).optional(),
    burialPerson: z.string().optional(),
    attendeesCount: z.union([z.number(), z.string()]).optional(),
    boneCollectionDate: z.string().optional(),
    certificateDepositDate: z.string().optional(),
    burialBoneBag: z.string().optional(),
    // 故人情報
    posthumousName: z.string().optional(),
    posthumousNameKana: z.string().optional(),
    birthDate: z.string().optional(),
    deathDate: z.string().optional(),
    ageAtDeath: z.string().optional(),
    gender: z.string().optional(),
    // ペット情報
    petType: z.string().optional(),
    petSize: z.string().optional(),
    // 彫刻情報
    engravingStatus: z.string().optional(),
    engravingPlan: z.string().optional(),
    stoneType: z.string().optional(),
    engravingPosition: z.string().optional(),
    engravingRequestDate: z.string().optional(),
    engravingConfirmedDate: z.string().optional(),
    engravingOrderDate: z.string().optional(),
    engravingCompletionDate: z.string().optional(),
    engravingMemo: z.string().optional(),
    // その他
    dealStatus: z.string().optional(),
    category: z.string().optional(),
    salesRecordDate: z.string().optional(),
    notes: z.string().optional(),
});

type BurialPersonFormData = z.infer<typeof burialPersonSchema>;

export function BurialPersonEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isNew = !id;

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [person, setPerson] = useState<BurialPerson | null>(null);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<BurialPersonFormData>({
        resolver: zodResolver(burialPersonSchema),
        defaultValues: {},
    });

    // 既存データ取得
    useEffect(() => {
        if (!isNew && id) {
            const fetchData = async () => {
                try {
                    const data = await getBurialPersonById(id);
                    if (data) {
                        setPerson(data);
                        reset({
                            userName: data.userName || '',
                            userNameKana: data.userNameKana || '',
                            buriedPersonName: data.buriedPersonName || '',
                            buriedPersonNameKana: data.buriedPersonNameKana || '',
                            buriedPersonNameAlphabet: data.buriedPersonNameAlphabet || '',
                            relationshipToUser: data.relationshipToUser || '',
                            location: data.location || '',
                            plotType: data.plotType || '',
                            plotNumber: data.plotNumber || '',
                            certificateNumber: data.certificateNumber || '',
                            dealName: data.dealName || '',
                            contractDate: data.contractDate || '',
                            burialStatus: data.burialStatus || '',
                            burialDate: data.burialDate || '',
                            burialOrder: data.burialOrder || '',
                            burialPerson: data.burialPerson || '',
                            attendeesCount: data.attendeesCount || '',
                            boneCollectionDate: data.boneCollectionDate || '',
                            certificateDepositDate: data.certificateDepositDate || '',
                            burialBoneBag: data.burialBoneBag || '',
                            posthumousName: data.posthumousName || '',
                            posthumousNameKana: data.posthumousNameKana || '',
                            birthDate: data.birthDate || '',
                            deathDate: data.deathDate || '',
                            ageAtDeath: data.ageAtDeath || '',
                            gender: data.gender || '',
                            petType: data.petType || '',
                            petSize: data.petSize || '',
                            engravingStatus: data.engravingStatus || '',
                            engravingPlan: data.engravingPlan || '',
                            stoneType: data.stoneType || '',
                            engravingPosition: data.engravingPosition || '',
                            engravingRequestDate: data.engravingRequestDate || '',
                            engravingConfirmedDate: data.engravingConfirmedDate || '',
                            engravingOrderDate: data.engravingOrderDate || '',
                            engravingCompletionDate: data.engravingCompletionDate || '',
                            engravingMemo: data.engravingMemo || '',
                            dealStatus: data.dealStatus || '',
                            category: data.category || '',
                            salesRecordDate: data.salesRecordDate || '',
                            notes: data.notes || '',
                        });
                    }
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'データ取得に失敗しました');
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [id, isNew, reset]);

    // 保存処理
    const onSubmit = async (data: BurialPersonFormData) => {
        if (!user) {
            setError('ログインが必要です');
            return;
        }

        setSaving(true);
        setError(null);

        const auditUser = {
            uid: user.uid,
            displayName: user.displayName || user.email || '',
            email: user.email || '',
        };

        try {
            // 数値フィールドを変換
            const updateData: Partial<BurialPerson> = {
                ...data,
                burialOrder: typeof data.burialOrder === 'string' && data.burialOrder
                    ? parseInt(data.burialOrder, 10)
                    : data.burialOrder as number | undefined,
                attendeesCount: typeof data.attendeesCount === 'string' && data.attendeesCount
                    ? parseInt(data.attendeesCount, 10)
                    : data.attendeesCount as number | undefined,
            };

            if (isNew) {
                // 新規作成
                const newId = await createBurialPerson({
                    ...updateData,
                    recordId: `V12-${Date.now()}`, // 新規はV12接頭辞付きのID
                } as Omit<BurialPerson, 'id'>);

                // 履歴記録
                await createHistoryEntry(
                    'BurialPerson',
                    newId,
                    'create',
                    [],
                    updateData as Record<string, unknown>,
                    auditUser
                );

                navigate(`/burial-persons/${newId}`);
            } else if (person) {
                // 更新
                await updateBurialPerson(id!, updateData);

                // 変更差分を計算して履歴記録
                const oldData = person as unknown as Record<string, unknown>;
                const newData = { ...person, ...updateData } as unknown as Record<string, unknown>;
                const changes = calculateChanges(oldData, newData);

                if (changes.length > 0) {
                    await createHistoryEntry(
                        'BurialPerson',
                        id!,
                        'update',
                        changes,
                        newData,
                        auditUser
                    );
                }

                navigate(`/burial-persons/${id}`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '保存に失敗しました');
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

    return (
        <Box>
            {/* ヘッダー */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(isNew ? '/burial-persons' : `/burial-persons/${id}`)}
                    >
                        戻る
                    </Button>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {isNew ? '埋葬者 新規作成' : '埋葬者 編集'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit(onSubmit)}
                    disabled={saving}
                >
                    {saving ? '保存中...' : '保存'}
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                    {/* 使用者・埋葬者情報 */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>使用者・埋葬者情報</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="userName"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="使用者名"
                                                fullWidth
                                                error={!!errors.userName}
                                                helperText={errors.userName?.message}
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="userNameKana"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="使用者名（カナ）"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="buriedPersonName"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="埋葬者"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="buriedPersonNameKana"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="埋葬者（カナ）"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="buriedPersonNameAlphabet"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="埋葬者（英字）"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="relationshipToUser"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="使用者との続柄"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* 区画情報 */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>区画情報</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="location"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="拠点"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="plotType"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="区画/種類"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="plotNumber"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="区画NO"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="certificateNumber"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="承認証番号"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="dealName"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="商談名"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="contractDate"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="契約日"
                                                fullWidth
                                                placeholder="YYYY/MM/DD"
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* 埋葬情報 */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>埋葬情報</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="burialStatus"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="埋葬有無"
                                                fullWidth
                                                select
                                            >
                                                <MenuItem value="">-</MenuItem>
                                                <MenuItem value="有">有</MenuItem>
                                                <MenuItem value="無">無</MenuItem>
                                            </TextField>
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="burialDate"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="埋葬日"
                                                fullWidth
                                                placeholder="YYYY/MM/DD"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="burialOrder"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="埋葬順"
                                                fullWidth
                                                type="number"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="burialPerson"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="埋葬担当"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="attendeesCount"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="参列者人数"
                                                fullWidth
                                                type="number"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="boneCollectionDate"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="収骨日"
                                                fullWidth
                                                placeholder="YYYY/MM/DD"
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* 故人情報 */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>故人情報</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Controller
                                        name="posthumousName"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="戒名"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller
                                        name="posthumousNameKana"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="戒名（かな）"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="birthDate"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="生年月日"
                                                fullWidth
                                                placeholder="YYYY/MM/DD"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="deathDate"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="没年月日"
                                                fullWidth
                                                placeholder="YYYY/MM/DD"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="ageAtDeath"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="行年"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="gender"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="性別"
                                                fullWidth
                                                select
                                            >
                                                <MenuItem value="">-</MenuItem>
                                                <MenuItem value="男">男</MenuItem>
                                                <MenuItem value="女">女</MenuItem>
                                            </TextField>
                                        )}
                                    />
                                </Grid>
                                <Divider sx={{ my: 2, width: '100%' }} />
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="petType"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="ペット種別"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="petSize"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="ペット大きさ"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* 彫刻情報 */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>彫刻情報</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="engravingStatus"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="彫刻有無"
                                                fullWidth
                                                select
                                            >
                                                <MenuItem value="">-</MenuItem>
                                                <MenuItem value="有">有</MenuItem>
                                                <MenuItem value="無">無</MenuItem>
                                            </TextField>
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="engravingPlan"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="彫刻プラン"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="stoneType"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="石種"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="engravingPosition"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="彫刻位置"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="engravingRequestDate"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="原稿依頼日"
                                                fullWidth
                                                placeholder="YYYY/MM/DD"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="engravingCompletionDate"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="彫刻完成日"
                                                fullWidth
                                                placeholder="YYYY/MM/DD"
                                            />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller
                                        name="engravingMemo"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="彫刻備考"
                                                fullWidth
                                                multiline
                                                rows={2}
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* その他 */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>その他</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="dealStatus"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="商談状況"
                                                fullWidth
                                            />
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
                                                label="区分"
                                                fullWidth
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
                                                label="売上計上日"
                                                fullWidth
                                                placeholder="YYYY/MM/DD"
                                            />
                                        )}
                                    />
                                </Grid>
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
                                                rows={3}
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>

                {/* 保存ボタン（下部） */}
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<SaveIcon />}
                        type="submit"
                        disabled={saving}
                    >
                        {saving ? '保存中...' : '保存'}
                    </Button>
                </Box>
            </form>
        </Box>
    );
}
