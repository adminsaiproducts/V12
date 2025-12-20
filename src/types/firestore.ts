/**
 * Firestore Customer document type
 * V9から移植したスキーマ定義（拡張版）
 */

export interface Address {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  town?: string;
  streetNumber?: string;
  building?: string;
  full?: string;
}

export interface MemorialContact {
  name?: string;
  relationship?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  mobile?: string;
  email?: string;
}

export interface UserChangeInfo {
  hasChanged?: boolean;
  reason?: string;
  previousUserName?: string;
  relationshipToNew?: string;
}

export interface CustomerNeeds {
  transportation?: string;
  searchReason?: string;
  familyStructure?: string;
  religiousSect?: string;
  preferredPlan?: string;
  burialPlannedCount?: string;
  purchaseTiming?: string;
  appealPoints?: string;
  appealPointsOther?: string;
  concerns?: string;
  otherConsultation?: string;
}

/**
 * 顧客区分
 */
export type CustomerCategory = 'individual' | 'corporation' | 'professional';

export const CUSTOMER_CATEGORY_LABELS: Record<CustomerCategory, string> = {
  individual: '個人',
  corporation: '法人',
  professional: '士業',
};

export const CUSTOMER_CATEGORY_OPTIONS: { value: CustomerCategory; label: string }[] = [
  { value: 'individual', label: '個人' },
  { value: 'corporation', label: '法人' },
  { value: 'professional', label: '士業（弁護士・司法書士等）' },
];

export interface Customer {
  id: string;

  // 識別情報
  trackingNo: string;
  parentChildFlag?: string;
  branch?: string;
  recordId?: string;
  originalId?: string;

  // 基本情報
  name: string;
  nameKana?: string;
  gender?: string;
  age?: number | string;
  type?: 'CORPORATION' | 'INDIVIDUAL';
  customerCategory?: CustomerCategory;

  // 連絡先
  phone?: string;
  phone2?: string;
  phone3?: string;
  mobile?: string;
  email?: string;

  // 住所
  address?: Address;

  // CRM管理情報
  memo?: string;
  notes?: string;
  visitRoute?: string;
  otherCompanyReferralDate?: string;
  receptionist?: string;
  doNotContact?: boolean;
  crossSellTarget?: boolean;

  // 典礼責任者
  memorialContact?: MemorialContact;

  // 使用者変更
  userChangeInfo?: UserChangeInfo;

  // ニーズ・嗜好
  needs?: CustomerNeeds;

  // 活動・商談
  activityCount?: number;
  dealCount?: number;
  lastActivityDate?: string;
  lastTransactionDate?: string;

  // 商談有無フラグ（顧客一覧表示用）
  hasDeals?: boolean;  // 一般商談（樹木墓以外）有無
  hasTreeBurialDeals?: boolean;  // 樹木墓商談有無
  hasBurialPersons?: boolean;  // 樹木墓オプション（埋葬者）有無

  // その他
  category?: string;
  status?: string;
  assignedTo?: string;
  tags?: string[];
  role?: string;

  // タイムスタンプ
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

/**
 * 商談ステージ
 */
export type DealStage =
  | 'inquiry'           // 問い合わせ
  | 'document_sent'     // 資料送付
  | 'follow_up'         // 追客中
  | 'visit_scheduled'   // 見学予約
  | 'visited'           // 見学済
  | 'tentative'         // 仮予約
  | 'application'       // 申込
  | 'contracted'        // 契約済
  | 'lost'              // 失注
  | 'c_yomi'            // Cヨミ
  | 'b_yomi'            // Bヨミ
  | 'a_yomi';           // Aヨミ

/**
 * ステージの表示名
 */
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  inquiry: '問い合わせ',
  document_sent: '資料送付',
  follow_up: '追客中',
  visit_scheduled: '見学予約',
  visited: '見学済',
  tentative: '仮予約',
  application: '申込',
  contracted: '契約済',
  lost: '失注',
  c_yomi: 'Cヨミ',
  b_yomi: 'Bヨミ',
  a_yomi: 'Aヨミ',
};

/**
 * ステージの色
 */
export const DEAL_STAGE_COLORS: Record<DealStage, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  inquiry: 'default',
  document_sent: 'info',
  follow_up: 'info',
  visit_scheduled: 'primary',
  visited: 'primary',
  tentative: 'warning',
  application: 'warning',
  contracted: 'success',
  lost: 'error',
  c_yomi: 'default',
  b_yomi: 'info',
  a_yomi: 'warning',
};

/**
 * Firestore Deal document type
 * 商談管理（ヨミ表 + 契約詳細）
 */
export interface Deal {
  id: string;
  // 顧客情報（必須）
  customerId: string;
  customerTrackingNo: string;
  customerName: string;

  // 商談基本情報
  title: string;
  stage: DealStage;
  probability?: number;
  amount?: number;

  // 寺院・プラン情報
  templeId?: string;
  templeName?: string;
  productCategory?: string;  // 大分類: 樹木墓、その他
  productSubcategory?: string;  // 小分類: 樹木墓プラン、樹木墓オプション、埋葬彫刻、広報
  planName?: string;  // プラン名: 2名用、家族用など

  // 流入経路・競合
  visitRoute?: string;  // 流入経路: WEB、鎌倉新書、看板広告など
  competitor?: string;  // 競合他社・他拠点

  // 日付情報
  inquiryDate?: string;  // 問い合わせ日
  documentSentDate?: string;  // 資料送付日
  followUpEmailDate?: string;  // 追客メール日
  followUpCallDate?: string;  // 追客TEL日
  visitDate?: string;  // 見学日
  visitFollowUpDate?: string;  // 見学フォロー連絡日
  tentativeReservationDate?: string;  // 仮予約日
  applicationDate?: string;  // 申込日
  contractDate?: string;  // 契約日
  expectedCloseDate?: string;  // 見込み完了日

  // 入金情報
  paymentDate1?: string;
  paymentAmount1?: number;
  paymentDate2?: string;
  paymentAmount2?: number;
  paymentDate3?: string;
  paymentAmount3?: number;
  totalPayment?: number;
  remainingBalance?: number;

  // 担当者
  assignedTo?: string;

  // その他
  notes?: string;
  salesMonth?: string;  // 売上計上月
  deliveryDate?: string;  // 工事完了引渡日

  // タイムスタンプ
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Firestore Temple document type
 */
export interface Temple {
  id: string;
  templeId: string;
  name: string;
  area?: string;
  address?: Address;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Firestore Relationship document type
 */
export interface Relationship {
  id: string;
  sourceCustomerId: string;
  targetCustomerId: string;
  relationshipType: string;
  relationshipName?: string;
  direction?: 'forward' | 'reverse' | 'bidirectional' | 'unidirectional';
  description?: string;
  confidence?: number;
  sourceRecordType?: string;
  sourceRecordId?: string;
  needsManualResolution?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Firestore Activity document type
 */
export interface Activity {
  id: string;
  customerId: string;
  dealId?: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'other';
  subject: string;
  description?: string;
  date: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 活動区分
 */
export type ActivityCategory =
  | '説明のみ'
  | '資料送付'
  | '見学（案内無し）'
  | '見学（案内有り）'
  | '電話アポ'
  | 'メールアポ'
  | 'その他';

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  '説明のみ': '説明のみ',
  '資料送付': '資料送付',
  '見学（案内無し）': '見学（案内無し）',
  '見学（案内有り）': '見学（案内有り）',
  '電話アポ': '電話アポ',
  'メールアポ': 'メールアポ',
  'その他': 'その他',
};

/**
 * Firestore ActivityHistory document type
 * geniee CRMからインポートした活動履歴データ
 */
export interface ActivityHistory {
  id: string;

  // geniee CRM識別情報
  recordId: string;  // レコードID

  // 活動基本情報
  subject: string;  // 件名
  activityDate: string;  // 活動期日
  activityCategory: string;  // 活動区分（説明のみ、資料送付、見学等）
  activityDetail?: string;  // 活動詳細

  // 担当者情報
  receptionist?: string;  // 受付担当者
  receptionistCode?: string;  // 受付担当者コード（従業員マスター紐づけ）

  // 顧客情報
  userName?: string;  // 使用者名
  trackingNo?: string;  // 追客NO
  linkedCustomerId?: string;  // 紐づけられた顧客ID
  linkedCustomerTrackingNo?: string;  // 紐づけられた追客No

  // 拠点情報
  location?: string;  // メイン拠点
  locationCode?: string;  // 拠点コード（寺院マスター紐づけ）
  targetLocations?: string;  // 対象拠点を全て選択（複数選択可）

  // 来寺経緯
  visitRoute?: string;  // 来寺経緯
  visitRouteCode?: string;  // 来寺経緯コード（来寺経緯マスター紐づけ）

  // 商談情報
  dealName?: string;  // 商談

  // その他
  firstTimeOnly?: string;  // 初回のみ選択
  role?: string;  // ロール

  // タイムスタンプ
  customerCreatedAt?: string;  // 顧客作成日時
  genieCreatedAt?: string;  // geniee作成日時
  genieUpdatedAt?: string;  // geniee更新日時
  createdAt?: string;  // V12インポート日時
  updatedAt?: string;  // V12更新日時
}

/**
 * 樹木墓商談ステータス
 */
export type TreeBurialDealStatus =
  | 'contracted'  // 成約
  | 'lost'        // 失注
  | 'pending';    // 検討中

export const TREE_BURIAL_DEAL_STATUS_LABELS: Record<TreeBurialDealStatus, string> = {
  contracted: '成約',
  lost: '失注',
  pending: '検討中',
};

/**
 * 樹木墓商談区分
 */
export type TreeBurialCategory =
  | 'before_death'  // 生前
  | 'burial';       // 埋葬

export const TREE_BURIAL_CATEGORY_LABELS: Record<TreeBurialCategory, string> = {
  before_death: '生前',
  burial: '埋葬',
};

/**
 * Firestore TreeBurialDeal document type
 * geniee CRMからインポートした樹木墓商談データ
 */
export interface TreeBurialDeal {
  id: string;

  // geniee CRM識別情報
  recordId: string;  // geniee CRMのレコードID

  // 商談基本情報
  dealName: string;  // 商談名
  location: string;  // 拠点（横浜令和の杜など）
  priceRevision?: string;  // 価格改定
  status: TreeBurialDealStatus;  // 商談状況
  category?: TreeBurialCategory;  // 区分（生前/埋葬）

  // 使用者情報
  userName?: string;  // 使用者名
  userNameKana?: string;  // 使用者名（フリガナ）

  // 区画情報
  plotType?: string;  // 区画/種類
  plotNumber?: string;  // 区画NO
  certificateNumber?: string;  // 承認証番号

  // 担当者
  receptionist?: string;  // 受付担当
  burialPerson?: string;  // 埋葬担当

  // 金額情報
  planSubtotal?: number;  // プラン小計
  planPaymentMethod?: string;  // プラン入金方法
  planPaymentDate?: string;  // プラン入金日
  paymentNotificationDate?: string;  // 入金連絡日
  optionSubtotal?: number;  // オプション小計
  optionPaymentMethod?: string;  // オプション入金方法
  optionPaymentDate?: string;  // オプション入金日
  paymentMemo?: string;  // 入金メモ
  totalAmount?: number;  // プラン＋オプション合計
  saiProSales?: number;  // 彩プロ売上

  // 日付情報
  salesRecordDate?: string;  // 売上計上日
  applicationDate?: string;  // 申込日
  gravePermitSentDate?: string;  // 墓所使用許可証送付日

  // 合祀墓改葬日
  collectiveReburialDateNormal?: string;  // 合祀墓改葬日（通常）
  collectiveReburialDateFromLastInterment?: string;  // 合祀墓改葬日（最終納骨日から計算）
  collectiveReburialDateFromContract?: string;  // 合祀墓改葬日（契約日から計算）
  collectiveReburialActualDate?: string;  // 合祀墓改葬実施日

  // 許可証・書類
  familyRegisterSubmissionDate?: string;  // 戸籍謄本または住民票提出日
  cremationPermitSubmissionDate?: string;  // 埋・火葬許可証または改葬許可証提出日

  // 状態フラグ
  hasBurial?: string;  // 埋葬有無
  hasEngraving?: string;  // 彫刻有無
  burialCount?: number;  // 埋葬人数

  // 来寺経緯
  templeVisitHistory?: string;  // 来寺経緯

  // 見込み情報
  expectedTime?: string;  // 見込時期
  probability?: string;  // 確度

  // 失注情報
  lostType?: string;  // 失注種別
  lostReasonDetail?: string;  // 失注理由詳細

  // 紹介情報
  referrer?: string;  // 紹介者
  referralFee?: number;  // 紹介手数料
  referralFeeMemo?: string;  // 紹介手数料備考
  otherCompanyReferralDate?: string;  // 他社紹介日
  contractReportDate?: string;  // 成約報告日
  invoiceRequestEmailDate?: string;  // 請求依頼メール送信日

  // 使用期間
  usePeriod3Years?: string;
  usePeriod5Years?: string;
  usePeriod7Years?: string;
  usePeriod8Years?: string;
  usePeriod10Years?: string;
  usePeriod13Years?: string;
  usePeriod17Years?: string;
  usePeriod20Years?: string;
  usePeriod23Years?: string;
  usePeriod30Years?: string;
  usePeriod33Years?: string;
  usePeriodFromLastInterment3Years?: string;
  usePeriodFromLastInterment5Years?: string;
  usePeriodFromLastInterment6Years?: string;
  usePeriodFromLastInterment7Years?: string;
  usePeriodFromLastInterment10Years?: string;
  usePeriodFromLastInterment13Years?: string;
  usePeriodFromLastInterment23Years?: string;
  usePeriodFromLastInterment33Years?: string;
  usePeriodFromContract20Years?: string;
  usePeriodFromContract30Years?: string;
  usePeriodFromContract50Years?: string;
  usePeriodFromContract60Years?: string;
  templeManagementFromLastInterment10Years?: string;

  // 使用期間延長
  usePeriodExtensionDate?: string;  // 使用期間延長申請日（最新）
  allBurialsComplete?: string;  // 納骨予定者の埋葬がすべて完了している(区画のみ)

  // 石種
  stoneType?: string;  // 石種

  // 連絡方法
  contactMethod?: string;  // 連絡方法

  // その他
  documentsSentCount?: number;  // 資料送付件数
  role?: string;  // ロール
  notes?: string;  // 備考

  // 顧客紐づけ（CRM V12での紐づけ用）
  linkedCustomerId?: string;  // 紐づけられた顧客ID
  linkedCustomerTrackingNo?: string;  // 紐づけられた追客No

  // タイムスタンプ
  genieCreatedAt?: string;  // geniee作成日時
  genieUpdatedAt?: string;  // geniee更新日時
  lastActivityAt?: string;  // 最終活動日時
  createdAt?: string;  // V12インポート日時
  updatedAt?: string;  // V12更新日時
}

/**
 * 商談（樹木墓以外）
 * 建墓、広報、埋葬彫刻、シニアライフサポート、墓じまい、駐車場収入等
 */
export interface GeneralSalesDeal {
  id: string;

  // 契約情報
  contractDate?: string;  // 契約日
  contractorName: string;  // 契約者

  // 寺院・エリア
  templeName: string;  // 寺院名
  area?: string;  // エリア

  // 金額情報
  applicationAmount?: number;  // 申込実績

  // 入金情報1
  paymentDate1?: string;  // 入金日１
  paymentAmount1?: number;  // 入金額１

  // 入金情報2
  paymentDate2?: string;  // 入金日２
  paymentAmount2?: number;  // 入金額２

  // 入金情報3
  paymentDate3?: string;  // 入金日３
  paymentAmount3?: number;  // 入金額３

  // 合計
  totalPayment?: number;  // 入金合計
  remainingBalance?: number;  // 残金

  // 分類
  subCategory: string;  // 小分類（建墓、広報、埋葬彫刻、シニアライフサポート、墓じまい、駐車場収入、Web、その他）
  majorCategory: string;  // 大分類（建墓、広報、その他、シニアライフサポート、墓じまい）

  // その他
  notes?: string;  // 備考
  inputOrder?: number;  // 入力順

  // タイムスタンプ
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 商談（樹木墓以外）大分類
 */
export type GeneralSalesMajorCategory =
  | '建墓'
  | '広報'
  | '墓じまい'
  | 'シニアライフサポート'
  | 'その他';

export const GENERAL_SALES_MAJOR_CATEGORIES: GeneralSalesMajorCategory[] = [
  '建墓',
  '広報',
  '墓じまい',
  'シニアライフサポート',
  'その他',
];

/**
 * 商談（樹木墓以外）小分類
 */
export type GeneralSalesSubCategory =
  | '建墓'
  | '広報'
  | '埋葬彫刻'
  | 'シニアライフサポート'
  | '墓じまい'
  | '駐車場収入'
  | 'Web'
  | '海洋散骨'
  | 'その他';

export const GENERAL_SALES_SUB_CATEGORIES: GeneralSalesSubCategory[] = [
  '建墓',
  '広報',
  '埋葬彫刻',
  'シニアライフサポート',
  '墓じまい',
  '駐車場収入',
  'Web',
  '海洋散骨',
  'その他',
];

/**
 * 統合売上レコード（売上管理表・ダッシュボード用）
 * TreeBurialDeal と GeneralSalesDeal を統一したフォーマット
 */
export interface UnifiedSalesRecord {
  id: string;
  sourceType: 'treeBurial' | 'general';  // データソース種別
  sourceId: string;  // 元データのID

  // 追客No（顧客紐づけ用）
  trackingNo?: string;  // 追客No

  // 契約情報
  contractDate: string;  // 契約日（YYYY-MM-DD形式）
  contractorName: string;  // 契約者名
  templeName: string;  // 寺院名/拠点名
  area?: string;  // エリア

  // 金額情報
  applicationAmount: number;  // 申込実績（売上金額）
  paymentDate1?: string;  // 入金日１
  paymentAmount1?: number;  // 入金額１
  paymentDate2?: string;  // 入金日２
  paymentAmount2?: number;  // 入金額２
  paymentDate3?: string;  // 入金日３
  paymentAmount3?: number;  // 入金額３
  totalPayment?: number;  // 入金合計
  remainingBalance?: number;  // 残金

  // 分類情報
  majorCategory: string;  // 大分類
  subCategory: string;  // 小分類

  // その他
  notes?: string;  // 備考

  // タイムスタンプ
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 埋葬有無
 */
export type BurialStatus = 'buried' | 'not_buried' | 'unknown';

export const BURIAL_STATUS_LABELS: Record<BurialStatus, string> = {
  buried: '埋葬済',
  not_buried: '未埋葬',
  unknown: '不明',
};

/**
 * 彫刻有無
 */
export type EngravingStatus = 'engraved' | 'not_engraved' | 'unknown';

export const ENGRAVING_STATUS_LABELS: Record<EngravingStatus, string> = {
  engraved: '彫刻済',
  not_engraved: '未彫刻',
  unknown: '不明',
};

/**
 * Firestore BurialPerson document type
 * geniee CRMからインポートした埋葬者データ（樹木墓オプション）
 */
export interface BurialPerson {
  id: string;

  // geniee CRM識別情報
  recordId: string;  // レコードID

  // 拠点・区画情報
  location?: string;  // 拠点
  plotType?: string;  // 区画/種類
  plotNumber?: string;  // 区画NO
  certificateNumber?: string;  // 承認証番号

  // 使用者情報
  userName?: string;  // 使用者名
  userNameKana?: string;  // 使用者名（フリガナ）

  // 埋葬者情報
  buriedPersonName?: string;  // 埋葬者
  buriedPersonNameKana?: string;  // 埋葬者（フリガナ）
  buriedPersonNameAlphabet?: string;  // 埋葬者（アルファベット）
  relationshipToUser?: string;  // 使用者との続柄

  // 商談情報
  dealName?: string;  // 商談名
  contractDate?: string;  // 契約日

  // 埋葬情報
  burialStatus?: string;  // 埋葬有無
  burialBoneBag?: string;  // 埋葬用骨袋
  burialDate?: string;  // 埋葬日
  burialOrder?: number;  // 埋葬順
  burialPerson?: string;  // 埋葬担当
  attendeesCount?: number;  // 参列者人数
  boneCollectionDate?: string;  // 収骨日
  certificateDepositDate?: string;  // 承認証預り日

  // 故人情報
  posthumousName?: string;  // 戒名
  posthumousNameKana?: string;  // 戒名ふりがな
  birthDate?: string;  // 生年月日
  deathDate?: string;  // 没年月日
  ageAtDeath?: string;  // 行年
  gender?: string;  // 性別

  // ペット情報
  petType?: string;  // ペット種別
  petSize?: string;  // ペット大きさ

  // 彫刻情報
  engravingStatus?: string;  // 彫刻有無
  engravingPlan?: string;  // 彫刻プラン
  stoneType?: string;  // 石種
  engravingPosition?: string;  // 彫刻位置

  // 彫刻詳細
  engravingText?: string;  // 彫刻内容（自由入力）
  engravingRow1_1?: string;  // 彫刻行1-1
  engravingRow1_2?: string;  // 彫刻行1-2
  engravingRow2_1?: string;  // 彫刻行2-1
  engravingRow2_2?: string;  // 彫刻行2-2
  engravingRow3_1?: string;  // 彫刻行3-1
  engravingRow3_2?: string;  // 彫刻行3-2
  engravingRow4_1?: string;  // 彫刻行4-1
  engravingRow4_2?: string;  // 彫刻行4-2
  engravingRow5_1?: string;  // 彫刻行5-1
  engravingRow5_2?: string;  // 彫刻行5-2

  // 彫刻金額・入金
  engravingAmount?: number;  // 彫刻金額
  engravingPaymentMethod?: string;  // 彫刻入金方法
  engravingPaymentDate?: string;  // 彫刻入金日
  engravingPaymentMemo?: string;  // 彫刻入金メモ
  engravingSalesRecordDate?: string;  // 彫刻売上計上日

  // 彫刻スケジュール
  engravingOrderDate?: string;  // 彫刻発注日
  engravingInstallationDate?: string;  // 彫刻設置日
  engravingCompletionDate?: string;  // 彫刻完成日
  engravingDeliveryDate?: string;  // 彫刻納品日

  // 彫刻確認
  engravingConfirmedDate?: string;  // 彫刻原稿確認日
  engravingPhotoSentDate?: string;  // 彫刻写真送付日
  engravingRequestDate?: string;  // 彫刻依頼日
  engravingMemo?: string;  // 彫刻備考

  // 彫刻情報（2セット目）
  engravingStatus2?: string;  // 彫刻有無２
  engravingPlan2?: string;  // 彫刻プラン２
  stoneType2?: string;  // 石種２
  engravingPosition2?: string;  // 添付位置２
  engravingRequestDate2?: string;  // 原稿依頼日２
  engravingOrderDate2?: string;  // 彫刻依頼日２
  engravingMemo2?: string;  // 彫刻備考２

  // 彫刻情報（3セット目）
  engravingStatus3?: string;  // 彫刻有無３
  engravingPlan3?: string;  // 彫刻プラン３
  stoneType3?: string;  // 石種３
  engravingRequestDate3?: string;  // 原稿依頼日３
  engravingOrderDate3?: string;  // 彫刻依頼日３
  engravingMemo3?: string;  // 彫刻備考３

  // 合祀墓改葬日
  collectiveReburialDateNormal?: string;  // 合祀墓改葬日（通常）
  collectiveReburialDateFromContract?: string;  // 合祀墓改葬日（契約時から計算）
  collectiveReburialDateFromLastInterment?: string;  // 合祀墓改葬日（最終納骨日から計算）

  // 使用期間
  usePeriod3Years?: string;
  usePeriod5Years?: string;
  usePeriod7Years?: string;
  usePeriod8Years?: string;
  usePeriod10Years?: string;
  usePeriod13Years?: string;
  usePeriod17Years?: string;
  usePeriod20Years?: string;
  usePeriod23Years?: string;
  usePeriod30Years?: string;
  usePeriod33Years?: string;
  usePeriodFromLastInterment3Years?: string;
  usePeriodFromLastInterment5Years?: string;
  usePeriodFromLastInterment6Years?: string;
  usePeriodFromLastInterment7Years?: string;
  usePeriodFromLastInterment10Years?: string;
  usePeriodFromLastInterment13Years?: string;
  usePeriodFromLastInterment23Years?: string;
  usePeriodFromLastInterment33Years?: string;
  usePeriodFromContract20Years?: string;
  usePeriodFromContract30Years?: string;
  usePeriodFromContract50Years?: string;
  usePeriodFromContract60Years?: string;
  templeManagementFromLastInterment10Years?: string;

  // 売上
  salesRecordDate?: string;  // 売上計上日

  // 年忌情報
  memorial1Year?: string;  // 1回忌
  memorial3Year?: string;  // 3回忌
  memorial7Year?: string;  // 7回忌
  memorial13Year?: string;  // 13回忌
  memorial17Year?: string;  // 17回忌
  memorial23Year?: string;  // 23回忌
  memorial27Year?: string;  // 27回忌
  memorial33Year?: string;  // 33回忌
  memorial50Year?: string;  // 50回忌
  memorial100Year?: string;  // 100回忌

  // 商談状況
  dealStatus?: string;  // 商談状況
  category?: string;  // 区分

  // その他
  burialCount?: number;  // 埋葬人数
  notes?: string;  // 備考
  role?: string;  // ロール

  // 顧客紐づけ（CRM V12での紐づけ用）
  linkedCustomerId?: string;  // 紐づけられた顧客ID
  linkedCustomerTrackingNo?: string;  // 紐づけられた追客No
  linkedTreeBurialDealId?: string;  // 紐づけられた樹木墓商談ID

  // タイムスタンプ
  genieCreatedAt?: string;  // geniee作成日時
  genieUpdatedAt?: string;  // geniee更新日時
  createdAt?: string;  // V12インポート日時
  updatedAt?: string;  // V12更新日時
}
