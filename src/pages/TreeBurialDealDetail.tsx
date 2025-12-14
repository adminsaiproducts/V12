/**
 * 樹木墓商談詳細ページ
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Typography,
    Grid,
    Chip,
    CircularProgress,
    Button,
    Card,
    CardContent,
    IconButton,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Snackbar,
    Paper,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Person as PersonIcon,
    Place as PlaceIcon,
    AttachMoney as MoneyIcon,
    CalendarToday as CalendarIcon,
    Description as DescriptionIcon,
    Link as LinkIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { getTreeBurialDealById, deleteTreeBurialDeal, linkTreeBurialDealToCustomer } from '../api/treeBurialDeals';
import { getCustomers } from '../api/customers';
import type { TreeBurialDeal, Customer } from '../types/firestore';
import { TREE_BURIAL_DEAL_STATUS_LABELS, TREE_BURIAL_CATEGORY_LABELS, TreeBurialDealStatus } from '../types/firestore';
import { HistoryDialog } from '../components/HistoryDialog';
import { useAuth } from '../auth/AuthProvider';
import type { AuditUser } from '../types/audit';
import { formatCurrency } from '../utils/format';

// ステータスの色
const STATUS_COLORS: Record<TreeBurialDealStatus, 'success' | 'error' | 'warning'> = {
    contracted: 'success',
    lost: 'error',
    pending: 'warning',
};

// 日付フォーマット
function formatDate(date: string | undefined): string {
    if (!date) return '-';
    return date;
}

// 詳細項目コンポーネント
function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {label}
            </Typography>
            <Typography variant="body1">{value || '-'}</Typography>
        </Box>
    );
}

export function TreeBurialDealDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [deal, setDeal] = useState<TreeBurialDeal | null>(null);
    const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);
    const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [linkingCustomerId, setLinkingCustomerId] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // 現在のユーザーをAuditUser形式に変換
    const currentAuditUser: AuditUser | undefined = user ? {
        uid: user.uid,
        displayName: user.displayName || user.email || 'Unknown',
        email: user.email || '',
    } : undefined;

    const fetchData = async () => {
        if (!id) return;

        try {
            const dealData = await getTreeBurialDealById(id);
            if (!dealData) {
                setError('商談が見つかりません');
                return;
            }
            setDeal(dealData);

            // 顧客データを取得
            const customers = await getCustomers(10000);

            // 紐づけ済み顧客を取得
            if (dealData.linkedCustomerId) {
                const linked = customers.find(c => c.id === dealData.linkedCustomerId);
                if (linked) setLinkedCustomer(linked);
            }

            // フリガナで顧客を検索（紐づけ候補）
            if (dealData.userNameKana && !dealData.linkedCustomerId) {
                const kana = dealData.userNameKana.replace(/\s+/g, '');
                const matches = customers.filter(c => {
                    const customerKana = c.nameKana?.replace(/\s+/g, '');
                    return customerKana && customerKana.includes(kana);
                });
                setMatchingCustomers(matches.slice(0, 5));
            }
        } catch (err) {
            console.error('データ取得エラー:', err);
            setError('データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    // 削除ハンドラ
    const handleDelete = async () => {
        if (!deal?.id) return;

        setIsDeleting(true);
        try {
            await deleteTreeBurialDeal(deal.id);
            setSnackbar({
                open: true,
                message: '樹木墓商談を削除しました',
                severity: 'success',
            });
            navigate('/tree-burial-deals');
        } catch (err) {
            console.error('削除エラー:', err);
            setSnackbar({
                open: true,
                message: '削除に失敗しました',
                severity: 'error',
            });
            setDeleteDialogOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    // 顧客紐づけハンドラ
    const handleLinkCustomer = async (customer: Customer) => {
        if (!deal?.id || !customer.id) return;

        setLinkingCustomerId(customer.id);
        try {
            await linkTreeBurialDealToCustomer(deal.id, customer.id, customer.trackingNo || '');
            setLinkedCustomer(customer);
            setMatchingCustomers([]);
            setSnackbar({
                open: true,
                message: `${customer.name}に紐づけました`,
                severity: 'success',
            });
            // データを再取得
            fetchData();
        } catch (err) {
            console.error('紐づけエラー:', err);
            setSnackbar({
                open: true,
                message: '紐づけに失敗しました',
                severity: 'error',
            });
        } finally {
            setLinkingCustomerId(null);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !deal) {
        return (
            <Box>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/tree-burial-deals')}
                    sx={{ mb: 2 }}
                >
                    一覧に戻る
                </Button>
                <Alert severity="error">{error || '商談が見つかりません'}</Alert>
            </Box>
        );
    }

    return (
        <Box>
            {/* ヘッダー */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={() => navigate('/tree-burial-deals')} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {deal.dealName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                                label={TREE_BURIAL_DEAL_STATUS_LABELS[deal.status] || deal.status}
                                color={STATUS_COLORS[deal.status] || 'default'}
                                size="small"
                            />
                            {deal.category && (
                                <Chip
                                    label={TREE_BURIAL_CATEGORY_LABELS[deal.category]}
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                            <Typography variant="body2" color="text.secondary">
                                {deal.location}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<HistoryIcon />}
                        onClick={() => setHistoryDialogOpen(true)}
                    >
                        履歴
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/tree-burial-deals/${id}/edit`)}
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

            {/* 紐づけ済み顧客 */}
            {linkedCustomer && (
                <Alert
                    severity="success"
                    sx={{ mb: 3 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => navigate(`/customers/${deal.linkedCustomerTrackingNo || linkedCustomer.trackingNo}`)}
                        >
                            顧客詳細へ
                        </Button>
                    }
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon fontSize="small" />
                        <Typography variant="body2">
                            紐づけ済み: <strong>{linkedCustomer.name}</strong>（追客No: {deal.linkedCustomerTrackingNo || linkedCustomer.trackingNo}）
                        </Typography>
                    </Box>
                </Alert>
            )}

            {/* 紐づけ候補 */}
            {!linkedCustomer && matchingCustomers.length > 0 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        フリガナ「{deal.userNameKana}」に一致する顧客候補:
                    </Typography>
                    {matchingCustomers.map(c => (
                        <Box key={c.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2">
                                {c.name}（追客No: {c.trackingNo}）
                            </Typography>
                            <Button
                                size="small"
                                onClick={() => navigate(`/customers/${c.trackingNo}`)}
                            >
                                詳細
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={linkingCustomerId === c.id ? <CircularProgress size={16} /> : <LinkIcon />}
                                disabled={linkingCustomerId !== null}
                                onClick={() => handleLinkCustomer(c)}
                            >
                                紐づけ
                            </Button>
                        </Box>
                    ))}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* 基本情報 */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="h6">基本情報</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Box sx={{ mb: 1.5 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                            使用者名
                                        </Typography>
                                        {linkedCustomer ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography
                                                    component={RouterLink}
                                                    to={`/customers/${deal.linkedCustomerTrackingNo || linkedCustomer.trackingNo}`}
                                                    sx={{
                                                        color: 'primary.main',
                                                        textDecoration: 'none',
                                                        fontWeight: 500,
                                                        '&:hover': {
                                                            textDecoration: 'underline',
                                                        },
                                                    }}
                                                >
                                                    {deal.userName || '-'}
                                                </Typography>
                                                <Chip
                                                    label={`追客No: ${deal.linkedCustomerTrackingNo || linkedCustomer.trackingNo}`}
                                                    size="small"
                                                    variant="outlined"
                                                    color="primary"
                                                    sx={{ ml: 1 }}
                                                />
                                            </Box>
                                        ) : (
                                            <Typography variant="body1">{deal.userName || '-'}</Typography>
                                        )}
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="フリガナ" value={deal.userNameKana} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="拠点" value={deal.location} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="区分" value={deal.category ? TREE_BURIAL_CATEGORY_LABELS[deal.category] : undefined} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="受付担当" value={deal.receptionist} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="埋葬担当" value={deal.burialPerson} />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 区画情報 */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <PlaceIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="h6">区画情報</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <DetailItem label="区画/種類" value={deal.plotType} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="区画NO" value={deal.plotNumber} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="承認証番号" value={deal.certificateNumber} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="埋葬人数" value={deal.burialCount?.toString()} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="埋葬有無" value={deal.hasBurial} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="彫刻有無" value={deal.hasEngraving} />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 金額情報 */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="h6">金額情報</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <DetailItem label="プラン小計" value={formatCurrency(deal.planSubtotal)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="オプション小計" value={formatCurrency(deal.optionSubtotal)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="合計金額" value={formatCurrency(deal.totalAmount)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="彩プロ売上" value={formatCurrency(deal.saiProSales)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="プラン入金方法" value={deal.planPaymentMethod} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="オプション入金方法" value={deal.optionPaymentMethod} />
                                </Grid>
                            </Grid>
                            {deal.paymentMemo && (
                                <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary">入金メモ</Typography>
                                    <Typography variant="body2">{deal.paymentMemo}</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* 日付情報 */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="h6">日付情報</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <DetailItem label="申込日" value={formatDate(deal.applicationDate)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="売上計上日" value={formatDate(deal.salesRecordDate)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="プラン入金日" value={formatDate(deal.planPaymentDate)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="オプション入金日" value={formatDate(deal.optionPaymentDate)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="墓所使用許可証送付日" value={formatDate(deal.gravePermitSentDate)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="入金連絡日" value={formatDate(deal.paymentNotificationDate)} />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 合祀墓改葬情報 */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>合祀墓改葬情報</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <DetailItem label="合祀墓改葬日（通常）" value={formatDate(deal.collectiveReburialDateNormal)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="（最終納骨日から計算）" value={formatDate(deal.collectiveReburialDateFromLastInterment)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="（契約日から計算）" value={formatDate(deal.collectiveReburialDateFromContract)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="合祀墓改葬実施日" value={formatDate(deal.collectiveReburialActualDate)} />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 紹介情報 */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <LinkIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="h6">紹介情報</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <DetailItem label="紹介者" value={deal.referrer} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="紹介手数料" value={formatCurrency(deal.referralFee)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="他社紹介日" value={formatDate(deal.otherCompanyReferralDate)} />
                                </Grid>
                                <Grid item xs={6}>
                                    <DetailItem label="成約報告日" value={formatDate(deal.contractReportDate)} />
                                </Grid>
                                <Grid item xs={12}>
                                    <DetailItem label="紹介手数料備考" value={deal.referralFeeMemo} />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* 失注情報（失注の場合のみ表示） */}
                {deal.status === 'lost' && (
                    <Grid item xs={12} md={6}>
                        <Card sx={{ borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
                            <CardContent>
                                <Typography variant="h6" color="error" sx={{ mb: 2 }}>失注情報</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <DetailItem label="失注種別" value={deal.lostType} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <DetailItem label="失注理由詳細" value={deal.lostReasonDetail} />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* その他情報 */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="h6">その他情報</Typography>
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={3}>
                                    <DetailItem label="来寺経緯" value={deal.templeVisitHistory} />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <DetailItem label="価格改定" value={deal.priceRevision} />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <DetailItem label="石種" value={deal.stoneType} />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <DetailItem label="連絡方法" value={deal.contactMethod} />
                                </Grid>
                            </Grid>
                            {deal.notes && (
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        備考
                                    </Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {deal.notes}
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* geniee CRM情報 */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                            geniee CRM情報
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={3}>
                                <DetailItem label="レコードID" value={deal.recordId} />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <DetailItem label="作成日時" value={formatDate(deal.genieCreatedAt)} />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <DetailItem label="更新日時" value={formatDate(deal.genieUpdatedAt)} />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <DetailItem label="最終活動日時" value={formatDate(deal.lastActivityAt)} />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>

            {/* 削除確認ダイアログ */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>樹木墓商談を削除しますか？</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        「{deal.dealName}」を削除します。この操作は取り消せません。
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
