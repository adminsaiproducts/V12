/**
 * Algolia検索クライアント設定
 */
import algoliasearch from 'algoliasearch/lite';

// Algolia設定（Search-Only API Key使用）
const ALGOLIA_APP_ID = '5PE7L5U694';
const ALGOLIA_SEARCH_KEY = '8bb33d4b27a2ff5be2c32d1ba2100194'; // 本番ではSearch-Only Keyに変更

export const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
export const customersIndex = algoliaClient.initIndex('customers');
export const activitiesIndex = algoliaClient.initIndex('activities');

// 検索オプションのデフォルト値
export const DEFAULT_SEARCH_OPTIONS = {
  hitsPerPage: 100,
  attributesToRetrieve: [
    'objectID',
    'firestoreId',
    'trackingNo',
    'name',
    'nameKana',
    'phone',
    'phoneOriginal',
    'email',
    'address',
    'addressPrefecture',
    'addressCity',
    'status',
    'memo',
    'customerCategory',
    'branch',
    'hasDeals',
    'hasTreeBurialDeals',
    'hasBurialPersons',
  ],
  attributesToHighlight: ['name', 'nameKana', 'address', 'memo'],
};

// Algolia検索結果の型
export interface AlgoliaCustomerHit {
  objectID: string;
  firestoreId?: string;
  trackingNo: string;
  name: string;
  nameKana: string;
  phone: string;
  phoneOriginal?: string;
  email: string;
  address: string;
  addressPrefecture: string;
  addressCity: string;
  status: string;
  memo?: string;
  customerCategory?: string;  // 顧客区分（individual/corporation/professional）
  branch?: string;  // 拠点名
  hasDeals?: boolean;  // 一般商談有無
  hasTreeBurialDeals?: boolean;  // 樹木墓商談有無
  hasBurialPersons?: boolean;  // 樹木墓オプション有無
  _highlightResult?: {
    name?: { value: string; matchLevel: string };
    nameKana?: { value: string; matchLevel: string };
    address?: { value: string; matchLevel: string };
    memo?: { value: string; matchLevel: string };
  };
}

// 活動履歴検索オプションのデフォルト値
export const ACTIVITIES_SEARCH_OPTIONS = {
  hitsPerPage: 100,
  attributesToRetrieve: [
    'objectID',
    'firestoreId',
    'recordId',
    'subject',
    'activityDate',
    'activityCategory',
    'activityDetail',
    'receptionist',
    'userName',
    'trackingNo',
    'location',
    'visitRoute',
  ],
  attributesToHighlight: ['subject', 'userName', 'activityDetail'],
};

// Algolia活動履歴検索結果の型
export interface AlgoliaActivityHit {
  objectID: string;
  firestoreId: string;
  recordId: string;
  subject: string;
  activityDate: string;
  activityDateNumeric: number;
  activityCategory: string;
  activityDetail: string;
  receptionist: string;
  receptionistCode?: string;
  userName: string;
  trackingNo: string;
  linkedCustomerId?: string;
  linkedCustomerTrackingNo?: string;
  location: string;
  locationCode?: string;
  visitRoute: string;
  visitRouteCode?: string;
  _highlightResult?: {
    subject?: { value: string; matchLevel: string };
    userName?: { value: string; matchLevel: string };
    activityDetail?: { value: string; matchLevel: string };
  };
}
