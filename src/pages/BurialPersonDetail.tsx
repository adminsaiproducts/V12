/**
 * 埋葬者詳細ページ
 * 埋葬者データの詳細表示・編集・削除・履歴機能
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Divider,
    CircularProgress,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Chip,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    History as HistoryIcon,
    Link as LinkIcon,
} from '@mui/icons-material';
import { getBurialPersonById, deleteBurialPerson, linkBurialPersonToCustomer } from '../api/burialPersons';
import { searchCustomersByName, getCustomerById } from '../api/customers';
import type { BurialPerson, Customer } from '../types/firestore';
import { HistoryDialog } from '../components/HistoryDialog';
import { useAuth } from '../auth/AuthProvider';

// 日付フォーマット
function formatDate(date: string | undefined): string {
    if (!date) return '-';
    return date;
}

// 情報表示行コンポーネント
function InfoRow({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
    return (
        <Box sx={{ display: 'flex', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ width: 200, fontWeight: 500, color: 'text.secondary', flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography sx={{ flex: 1, fontWeight: highlight ? 600 : 400, color: highlight ? 'primary.main' : 'text.primary' }}>
                {value || '-'}
            </Typography>
        </Box>
    );
}

export function BurialPersonDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [person, setPerson] = useState<BurialPerson | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

    // 顧客紐づけ関連
    const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);
    const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linking, setLinking] = useState(false);

    const loadPerson = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getBurialPersonById(id);
            setPerson(data);

            // 紐づけ済み顧客を取得
            if (data?.linkedCustomerId) {
                const customer = await getCustomerById(data.linkedCustomerId);
                setLinkedCustomer(customer);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadPerson();
    }, [loadPerson]);

    // 顧客紐づけ候補を検索
    const searchMatchingCustomers = async () => {
        if (!person?.userNameKana && !person?.userName) {
            setError('使用者名がないため、顧客検索ができません');
            return;
        }
        try {
            // フリガナまたは名前で検索
            const searchTerm = person.userNameKana || person.userName || '';
            const customers = await searchCustomersByName(searchTerm);
            setMatchingCustomers(customers);
            setLinkDialogOpen(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : '顧客検索に失敗しました');
        }
    };

    // 顧客と紐づけ
    const handleLinkCustomer = async (customer: Customer) => {
        if (!person?.id) return;
        setLinking(true);
        try {
            await linkBurialPersonToCustomer(person.id, customer.id, customer.trackingNo);
            setLinkedCustomer(customer);
            setPerson({
                ...person,
                linkedCustomerId: customer.id,
                linkedCustomerTrackingNo: customer.trackingNo,
            });
            setLinkDialogOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : '紐づけに失敗しました');
        } finally {
            setLinking(false);
        }
    };

    // 削除処理
    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteBurialPerson(id);
            navigate('/burial-persons');
        } catch (err) {
            setError(err instanceof Error ? err.message : '削除に失敗しました');
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
        return <Alert severity="error">{error}</Alert>;
    }

    if (!person) {
        return <Alert severity="warning">埋葬者が見つかりません</Alert>;
    }

    // AuditUserオブジェクトを作成
    const currentUser = user ? {
        uid: user.uid,
        displayName: user.displayName || user.email || '',
        email: user.email || '',
    } : null;

    return (
        <Box>
            {/* ヘッダー */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/burial-persons')}
                    >
                        一覧に戻る
                    </Button>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {person.buriedPersonName || person.userName || '埋葬者詳細'}
                    </Typography>
                    <Chip
                        label={person.burialStatus || '不明'}
                        color={person.burialStatus === '有' || person.burialStatus === '有り' ? 'success' : 'default'}
                    />
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
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/burial-persons/${id}/edit`)}
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

            {/* 顧客紐づけ */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">顧客紐づけ</Typography>
                    {!linkedCustomer && (
                        <Button
                            variant="contained"
                            startIcon={<LinkIcon />}
                            onClick={searchMatchingCustomers}
                            disabled={!person.userNameKana && !person.userName}
                        >
                            紐づけ
                        </Button>
                    )}
                </Box>
                {linkedCustomer ? (
                    <Box>
                        <InfoRow label="紐づけ顧客" value={
                            <Button
                                variant="text"
                                onClick={() => navigate(`/customers/${person.linkedCustomerTrackingNo || linkedCustomer.trackingNo}`)}
                            >
                                {linkedCustomer.name} ({person.linkedCustomerTrackingNo || linkedCustomer.trackingNo})
                            </Button>
                        } />
                    </Box>
                ) : (
                    <Typography color="text.secondary">
                        まだ顧客と紐づけられていません
                    </Typography>
                )}
            </Paper>

            <Grid container spacing={3}>
                {/* 基本情報 */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>基本情報</Typography>
                        <InfoRow label="使用者名" value={person.userName} highlight />
                        <InfoRow label="使用者名（カナ）" value={person.userNameKana} />
                        <InfoRow label="埋葬者" value={person.buriedPersonName} highlight />
                        <InfoRow label="埋葬者（カナ）" value={person.buriedPersonNameKana} />
                        <InfoRow label="埋葬者（英字）" value={person.buriedPersonNameAlphabet} />
                        <InfoRow label="使用者との続柄" value={person.relationshipToUser} />
                        <InfoRow label="商談名" value={person.dealName} />
                        <InfoRow label="契約日" value={formatDate(person.contractDate)} />
                    </Paper>
                </Grid>

                {/* 区画情報 */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>区画情報</Typography>
                        <InfoRow label="拠点" value={person.location} />
                        <InfoRow label="区画/種類" value={person.plotType} />
                        <InfoRow label="区画NO" value={person.plotNumber} />
                        <InfoRow label="承認証番号" value={person.certificateNumber} />
                        <InfoRow label="区分" value={person.category} />
                    </Paper>
                </Grid>

                {/* 埋葬情報 */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>埋葬情報</Typography>
                        <InfoRow label="埋葬有無" value={person.burialStatus} highlight />
                        <InfoRow label="埋葬日" value={formatDate(person.burialDate)} />
                        <InfoRow label="埋葬順" value={person.burialOrder} />
                        <InfoRow label="埋葬担当" value={person.burialPerson} />
                        <InfoRow label="参列者人数" value={person.attendeesCount} />
                        <InfoRow label="収骨日" value={formatDate(person.boneCollectionDate)} />
                        <InfoRow label="承認証預り日" value={formatDate(person.certificateDepositDate)} />
                        <InfoRow label="埋葬用骨袋" value={person.burialBoneBag} />
                    </Paper>
                </Grid>

                {/* 故人情報 */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>故人情報</Typography>
                        <InfoRow label="戒名" value={person.posthumousName} />
                        <InfoRow label="戒名（かな）" value={person.posthumousNameKana} />
                        <InfoRow label="生年月日" value={formatDate(person.birthDate)} />
                        <InfoRow label="没年月日" value={formatDate(person.deathDate)} />
                        <InfoRow label="行年" value={person.ageAtDeath} />
                        <InfoRow label="性別" value={person.gender} />
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>ペット情報</Typography>
                        <InfoRow label="ペット種別" value={person.petType} />
                        <InfoRow label="ペット大きさ" value={person.petSize} />
                    </Paper>
                </Grid>

                {/* 彫刻情報 */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>彫刻情報</Typography>
                        <InfoRow label="彫刻有無" value={person.engravingStatus} highlight />
                        <InfoRow label="彫刻プラン" value={person.engravingPlan} />
                        <InfoRow label="石種" value={person.stoneType} />
                        <InfoRow label="彫刻位置" value={person.engravingPosition} />
                        <InfoRow label="原稿依頼日" value={formatDate(person.engravingRequestDate)} />
                        <InfoRow label="文字OK確認日" value={formatDate(person.engravingConfirmedDate)} />
                        <InfoRow label="彫刻依頼日" value={formatDate(person.engravingOrderDate)} />
                        <InfoRow label="彫刻完成日" value={formatDate(person.engravingCompletionDate)} />
                        <InfoRow label="彫刻備考" value={person.engravingMemo} />
                    </Paper>
                </Grid>

                {/* 年忌情報 */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>年忌情報</Typography>
                        <InfoRow label="一周忌" value={formatDate(person.memorial1Year)} />
                        <InfoRow label="三回忌" value={formatDate(person.memorial3Year)} />
                        <InfoRow label="七回忌" value={formatDate(person.memorial7Year)} />
                        <InfoRow label="十三回忌" value={formatDate(person.memorial13Year)} />
                        <InfoRow label="十七回忌" value={formatDate(person.memorial17Year)} />
                        <InfoRow label="二十三回忌" value={formatDate(person.memorial23Year)} />
                        <InfoRow label="二十七回忌" value={formatDate(person.memorial27Year)} />
                        <InfoRow label="三十三回忌" value={formatDate(person.memorial33Year)} />
                        <InfoRow label="五十回忌" value={formatDate(person.memorial50Year)} />
                    </Paper>
                </Grid>

                {/* その他情報 */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>その他</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <InfoRow label="商談状況" value={person.dealStatus} />
                                <InfoRow label="売上計上日" value={formatDate(person.salesRecordDate)} />
                                <InfoRow label="備考" value={person.notes} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <InfoRow label="作成日時" value={formatDate(person.genieCreatedAt)} />
                                <InfoRow label="更新日時" value={formatDate(person.genieUpdatedAt)} />
                                <InfoRow label="レコードID" value={person.recordId} />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>

            {/* 削除確認ダイアログ */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>削除の確認</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        「{person.buriedPersonName || person.userName}」を削除しますか？この操作は取り消せません。
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">
                        削除
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 顧客紐づけダイアログ */}
            <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>顧客紐づけ</DialogTitle>
                <DialogContent>
                    {matchingCustomers.length === 0 ? (
                        <DialogContentText>
                            フリガナ「{person.userNameKana}」に一致する顧客が見つかりませんでした。
                        </DialogContentText>
                    ) : (
                        <Box>
                            <DialogContentText sx={{ mb: 2 }}>
                                フリガナ「{person.userNameKana}」に一致する顧客が{matchingCustomers.length}件見つかりました。
                            </DialogContentText>
                            {matchingCustomers.map(customer => (
                                <Paper key={customer.id} sx={{ p: 2, mb: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle1">{customer.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {customer.trackingNo} / {customer.nameKana}
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => handleLinkCustomer(customer)}
                                            disabled={linking}
                                        >
                                            紐づける
                                        </Button>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLinkDialogOpen(false)}>閉じる</Button>
                </DialogActions>
            </Dialog>

            {/* 履歴ダイアログ */}
            <HistoryDialog
                open={historyDialogOpen}
                onClose={() => setHistoryDialogOpen(false)}
                entityType="BurialPerson"
                entityId={id || ''}
                entityName={person.buriedPersonName || person.userName}
                currentUser={currentUser}
                onRollbackComplete={loadPerson}
            />
        </Box>
    );
}
