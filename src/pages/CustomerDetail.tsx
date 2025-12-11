import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Block as BlockIcon,
  Star as StarIcon,
} from '@mui/icons-material';
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
import { RelationshipCard } from '../components/RelationshipCard';
import { DealCard } from '../components/DealCard';
import { DealForm, DealFormData } from '../components/DealForm';
import { createDeal, updateDeal } from '../api/deals';
import type { Deal, DealStage } from '../types/firestore';

// 情報表示用のヘルパーコンポーネント
interface InfoItemProps {
  label: string;
  value: string | number | boolean | null | undefined;
  type?: 'text' | 'boolean';
}

function InfoItem({ label, value, type = 'text' }: InfoItemProps) {
  if (value === null || value === undefined || value === '' || value === '-') return null;

  if (type === 'boolean') {
    // booleanとして扱う場合
    const boolValue = Boolean(value);
    return (
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Box>
          <Chip
            label={boolValue ? 'はい' : 'いいえ'}
            size="small"
            color={boolValue ? 'primary' : 'default'}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {String(value)}
      </Typography>
    </Box>
  );
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const relationshipsRef = useRef<HTMLDivElement>(null);
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
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [dealFormMode, setDealFormMode] = useState<'create' | 'edit'>('create');
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

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

  // URLハッシュに応じてスクロール
  useEffect(() => {
    if (!loading && customer && location.hash === '#relationships') {
      // データ読み込み後にスクロール
      setTimeout(() => {
        relationshipsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [loading, customer, location.hash]);

  // 顧客データをフォームデータに変換
  const convertToFormData = (customer: Customer): Partial<CustomerFormData> => {
    const customerData = customer as unknown as Record<string, unknown>;

    // addressがJSON文字列の場合はパースする
    let addressObj: Record<string, unknown> | undefined;
    if (typeof customerData.address === 'string') {
      try {
        addressObj = JSON.parse(customerData.address);
      } catch {
        addressObj = undefined;
      }
    } else {
      addressObj = customerData.address as Record<string, unknown> | undefined;
    }

    const memorialContact = customerData.memorialContact as Record<string, unknown> | undefined;
    const userChangeInfo = customerData.userChangeInfo as Record<string, unknown> | undefined;
    const needs = customerData.needs as Record<string, unknown> | undefined;

    return {
      // 識別情報
      trackingNo: customer.trackingNo || '',
      parentChildFlag: extractValue(customerData.parentChildFlag),
      branch: extractValue(customerData.branch),

      // 基本情報
      name: getCustomerName(customerData),
      nameKana: getCustomerNameKana(customerData),
      gender: extractValue(customerData.gender) as '' | 'male' | 'female' | 'other' | '男' | '女' | undefined,
      age: extractValue(customerData.age),

      // 住所
      postalCode: addressObj ? extractValue(addressObj.postalCode) : '',
      prefecture: addressObj ? extractValue(addressObj.prefecture) : '',
      city: addressObj ? extractValue(addressObj.city) : '',
      town: addressObj ? extractValue(addressObj.town) : '',
      streetNumber: addressObj ? extractValue(addressObj.streetNumber) : '',
      building: addressObj ? extractValue(addressObj.building) : '',

      // 連絡先
      phone: getPhoneNumber(customerData.phone),
      phone2: getPhoneNumber(customerData.phone2),
      mobile: getPhoneNumber(customerData.mobile),
      email: getEmail(customerData.email),

      // CRM管理情報
      memo: getMemo(customerData.memo),
      notes: extractValue(customerData.notes),
      visitRoute: extractValue(customerData.visitRoute),
      otherCompanyReferralDate: extractValue(customerData.otherCompanyReferralDate),
      receptionist: extractValue(customerData.receptionist),
      doNotContact: customerData.doNotContact as boolean | undefined,
      crossSellTarget: customerData.crossSellTarget as boolean | undefined,

      // 典礼責任者
      memorialContactName: memorialContact ? extractValue(memorialContact.name) : '',
      memorialContactRelationship: memorialContact ? extractValue(memorialContact.relationship) : '',
      memorialContactPostalCode: memorialContact ? extractValue(memorialContact.postalCode) : '',
      memorialContactAddress: memorialContact ? extractValue(memorialContact.address) : '',
      memorialContactPhone: memorialContact ? extractValue(memorialContact.phone) : '',
      memorialContactMobile: memorialContact ? extractValue(memorialContact.mobile) : '',
      memorialContactEmail: memorialContact ? extractValue(memorialContact.email) : '',

      // 使用者変更
      userHasChanged: userChangeInfo ? (userChangeInfo.hasChanged as boolean | undefined) : false,
      userChangeReason: userChangeInfo ? extractValue(userChangeInfo.reason) : '',
      previousUserName: userChangeInfo ? extractValue(userChangeInfo.previousUserName) : '',
      relationshipToNewUser: userChangeInfo ? extractValue(userChangeInfo.relationshipToNew) : '',

      // ニーズ・嗜好
      transportation: needs ? extractValue(needs.transportation) : '',
      searchReason: needs ? extractValue(needs.searchReason) : '',
      familyStructure: needs ? extractValue(needs.familyStructure) : '',
      religiousSect: needs ? extractValue(needs.religiousSect) : '',
      preferredPlan: needs ? extractValue(needs.preferredPlan) : '',
      burialPlannedCount: needs ? extractValue(needs.burialPlannedCount) : '',
      purchaseTiming: needs ? extractValue(needs.purchaseTiming) : '',
      appealPoints: needs ? extractValue(needs.appealPoints) : '',
      appealPointsOther: needs ? extractValue(needs.appealPointsOther) : '',
      concerns: needs ? extractValue(needs.concerns) : '',
      otherConsultation: needs ? extractValue(needs.otherConsultation) : '',
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
        streetNumber: data.streetNumber || '',
        building: data.building || '',
        full: [data.prefecture, data.city, data.town, data.streetNumber, data.building].filter(Boolean).join(''),
      };

      // 典礼責任者オブジェクト
      const memorialContactUpdate = {
        name: data.memorialContactName || '',
        relationship: data.memorialContactRelationship || '',
        postalCode: data.memorialContactPostalCode || '',
        address: data.memorialContactAddress || '',
        phone: data.memorialContactPhone || '',
        mobile: data.memorialContactMobile || '',
        email: data.memorialContactEmail || '',
      };

      // 使用者変更オブジェクト
      const userChangeInfoUpdate = {
        hasChanged: data.userHasChanged || false,
        reason: data.userChangeReason || '',
        previousUserName: data.previousUserName || '',
        relationshipToNew: data.relationshipToNewUser || '',
      };

      // ニーズオブジェクト
      const needsUpdate = {
        transportation: data.transportation || '',
        searchReason: data.searchReason || '',
        familyStructure: data.familyStructure || '',
        religiousSect: data.religiousSect || '',
        preferredPlan: data.preferredPlan || '',
        burialPlannedCount: data.burialPlannedCount || '',
        purchaseTiming: data.purchaseTiming || '',
        appealPoints: data.appealPoints || '',
        appealPointsOther: data.appealPointsOther || '',
        concerns: data.concerns || '',
        otherConsultation: data.otherConsultation || '',
      };

      await updateCustomer(customer.id, {
        // 基本情報
        name: data.name,
        nameKana: data.nameKana || '',
        gender: data.gender || '',
        age: data.age ? parseInt(data.age) : undefined,
        parentChildFlag: data.parentChildFlag || '',
        branch: data.branch || '',

        // 連絡先
        phone: data.phone || '',
        phone2: data.phone2 || '',
        mobile: data.mobile || '',
        email: data.email || '',

        // 住所
        address: addressUpdate,

        // CRM管理情報
        memo: data.memo || '',
        notes: data.notes || '',
        visitRoute: data.visitRoute || '',
        otherCompanyReferralDate: data.otherCompanyReferralDate || '',
        receptionist: data.receptionist || '',
        doNotContact: data.doNotContact || false,
        crossSellTarget: data.crossSellTarget || false,

        // 典礼責任者
        memorialContact: memorialContactUpdate,

        // 使用者変更
        userChangeInfo: userChangeInfoUpdate,

        // ニーズ
        needs: needsUpdate,
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

  // 商談追加ハンドラ
  const handleAddDeal = () => {
    setDealFormMode('create');
    setEditingDeal(null);
    setDealFormOpen(true);
  };

  // 商談編集ハンドラ
  const handleEditDeal = (deal: Deal) => {
    setDealFormMode('edit');
    setEditingDeal(deal);
    setDealFormOpen(true);
  };

  // 商談フォーム送信ハンドラ（顧客情報はDealFormから渡される）
  const handleDealFormSubmit = async (data: DealFormData & { customerId: string; customerTrackingNo: string; customerName: string }) => {
    if (!customer?.id) return;

    try {
      if (dealFormMode === 'create') {
        await createDeal({
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
      } else if (editingDeal?.id) {
        await updateDeal(editingDeal.id, {
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
      }
      setDealFormOpen(false);
      setEditingDeal(null);
    } catch (err) {
      console.error('Error saving deal:', err);
      setSnackbar({
        open: true,
        message: dealFormMode === 'create' ? '商談の登録に失敗しました' : '商談の更新に失敗しました',
        severity: 'error',
      });
      throw err;
    }
  };

  // 商談編集時の初期データ変換
  const getDealFormInitialData = (): Partial<DealFormData> | undefined => {
    if (!editingDeal) return undefined;
    return {
      title: editingDeal.title,
      stage: editingDeal.stage,
      probability: editingDeal.probability,
      amount: editingDeal.amount,
      templeName: editingDeal.templeName,
      productCategory: editingDeal.productCategory,
      productSubcategory: editingDeal.productSubcategory,
      planName: editingDeal.planName,
      visitRoute: editingDeal.visitRoute,
      competitor: editingDeal.competitor,
      inquiryDate: editingDeal.inquiryDate,
      documentSentDate: editingDeal.documentSentDate,
      followUpEmailDate: editingDeal.followUpEmailDate,
      followUpCallDate: editingDeal.followUpCallDate,
      visitDate: editingDeal.visitDate,
      visitFollowUpDate: editingDeal.visitFollowUpDate,
      tentativeReservationDate: editingDeal.tentativeReservationDate,
      applicationDate: editingDeal.applicationDate,
      contractDate: editingDeal.contractDate,
      expectedCloseDate: editingDeal.expectedCloseDate,
      paymentDate1: editingDeal.paymentDate1,
      paymentAmount1: editingDeal.paymentAmount1,
      paymentDate2: editingDeal.paymentDate2,
      paymentAmount2: editingDeal.paymentAmount2,
      paymentDate3: editingDeal.paymentDate3,
      paymentAmount3: editingDeal.paymentAmount3,
      totalPayment: editingDeal.totalPayment,
      remainingBalance: editingDeal.remainingBalance,
      assignedTo: editingDeal.assignedTo,
      notes: editingDeal.notes,
      salesMonth: editingDeal.salesMonth,
      deliveryDate: editingDeal.deliveryDate,
    };
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

  // V9データ構造対応のため、customerをRecord型として扱う（ヘルパー関数用）
  const customerData = customer as unknown as Record<string, unknown>;

  const name = getCustomerName(customerData);
  const nameKana = getCustomerNameKana(customerData);
  const phone = getPhoneNumber(customerData.phone);
  const phone2 = getPhoneNumber(customerData.phone2);
  const mobile = getPhoneNumber(customerData.mobile);
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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h4" component="h1">
          {name}
        </Typography>
        {customer.doNotContact && (
          <Chip icon={<BlockIcon />} label="営業活動不可" color="error" size="small" />
        )}
        {customer.crossSellTarget && (
          <Chip icon={<StarIcon />} label="クロスセル対象" color="primary" size="small" />
        )}
      </Box>
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
                <InfoItem label="氏名" value={name} />
                <InfoItem label="フリガナ" value={nameKana} />
                <InfoItem label="性別" value={customer.gender} />
                <InfoItem label="年齢" value={customer.age} />
                <InfoItem label="拠点" value={customer.branch} />
                <InfoItem label="親子フラグ" value={customer.parentChildFlag} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 連絡先 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                連絡先
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ '& > *': { mb: 1.5 } }}>
                <InfoItem label="電話番号" value={phone} />
                <InfoItem label="電話番号2" value={phone2} />
                <InfoItem label="携帯番号" value={mobile} />
                <InfoItem label="メールアドレス" value={email} />
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

              <Box sx={{ '& > *': { mb: 1.5 } }}>
                <InfoItem label="郵便番号" value={customer.address?.postalCode} />
                <InfoItem label="住所" value={address} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* CRM管理情報 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CRM管理情報
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ '& > *': { mb: 1.5 } }}>
                <InfoItem label="来寺経緯" value={customer.visitRoute} />
                <InfoItem label="受付担当" value={customer.receptionist} />
                <InfoItem label="他社紹介日" value={customer.otherCompanyReferralDate} />
                <InfoItem label="営業活動不可" value={customer.doNotContact} type="boolean" />
                <InfoItem label="クロスセル対象" value={customer.crossSellTarget} type="boolean" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 備考 */}
        {(memo || customer.notes) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  備考・メモ
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ '& > *': { mb: 1.5 } }}>
                  <InfoItem label="備考" value={memo} />
                  <InfoItem label="社内メモ" value={customer.notes} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 典礼責任者 */}
        {customer.memorialContact && (customer.memorialContact.name || customer.memorialContact.phone) && (
          <Grid item xs={12}>
            <Accordion defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">典礼責任者</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoItem label="氏名" value={customer.memorialContact.name} />
                    <InfoItem label="続柄" value={customer.memorialContact.relationship} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem label="電話番号" value={customer.memorialContact.phone} />
                    <InfoItem label="携帯番号" value={customer.memorialContact.mobile} />
                    <InfoItem label="メールアドレス" value={customer.memorialContact.email} />
                  </Grid>
                  <Grid item xs={12}>
                    <InfoItem label="郵便番号" value={customer.memorialContact.postalCode} />
                    <InfoItem label="住所" value={customer.memorialContact.address} />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* 使用者変更 */}
        {customer.userChangeInfo && customer.userChangeInfo.hasChanged && (
          <Grid item xs={12}>
            <Accordion defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">使用者変更</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoItem label="旧使用者氏名" value={customer.userChangeInfo.previousUserName} />
                    <InfoItem label="新使用者との続柄" value={customer.userChangeInfo.relationshipToNew} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem label="使用者変更理由" value={customer.userChangeInfo.reason} />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* ニーズ・嗜好 */}
        {customer.needs && (customer.needs.searchReason || customer.needs.preferredPlan || customer.needs.familyStructure) && (
          <Grid item xs={12}>
            <Accordion defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">ニーズ・嗜好</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <InfoItem label="お探しの理由" value={customer.needs.searchReason} />
                    <InfoItem label="家族構成" value={customer.needs.familyStructure} />
                    <InfoItem label="宗旨・宗派" value={customer.needs.religiousSect} />
                    <InfoItem label="希望プラン" value={customer.needs.preferredPlan} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <InfoItem label="埋葬予定人数" value={customer.needs.burialPlannedCount} />
                    <InfoItem label="お墓の購入時期" value={customer.needs.purchaseTiming} />
                    <InfoItem label="交通手段" value={customer.needs.transportation} />
                  </Grid>
                  <Grid item xs={12}>
                    <InfoItem label="気に入っていただけた点" value={customer.needs.appealPoints} />
                    <InfoItem label="その他（気に入った点）" value={customer.needs.appealPointsOther} />
                    <InfoItem label="お墓について気になること" value={customer.needs.concerns} />
                    <InfoItem label="その他のご相談" value={customer.needs.otherConsultation} />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* 商談 */}
        <Grid item xs={12}>
          <DealCard
            customerId={customer.id}
            customerTrackingNo={customer.trackingNo}
            onAddDeal={handleAddDeal}
            onEditDeal={handleEditDeal}
          />
        </Grid>

        {/* 関係性 */}
        <Grid item xs={12} ref={relationshipsRef} id="relationships">
          <RelationshipCard
            customerId={customer.trackingNo || id || ''}
            customerName={name}
          />
        </Grid>
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

      {/* 商談フォームダイアログ */}
      {customer && (
        <DealForm
          open={dealFormOpen}
          onClose={() => {
            setDealFormOpen(false);
            setEditingDeal(null);
          }}
          onSubmit={handleDealFormSubmit}
          initialData={getDealFormInitialData()}
          mode={dealFormMode}
          customer={{
            customerId: customer.id,
            customerTrackingNo: customer.trackingNo,
            customerName: name,
          }}
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
