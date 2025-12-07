/**
 * Algolia検索クライアント設定
 */
import algoliasearch from 'algoliasearch/lite';

// Algolia設定（Search-Only API Key使用）
const ALGOLIA_APP_ID = '5PE7L5U694';
const ALGOLIA_SEARCH_KEY = '8bb33d4b27a2ff5be2c32d1ba2100194'; // 本番ではSearch-Only Keyに変更

export const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
export const customersIndex = algoliaClient.initIndex('customers');

// 検索オプションのデフォルト値
export const DEFAULT_SEARCH_OPTIONS = {
  hitsPerPage: 100,
  attributesToRetrieve: [
    'objectID',
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
  ],
  attributesToHighlight: ['name', 'nameKana', 'address'],
};

// Algolia検索結果の型
export interface AlgoliaCustomerHit {
  objectID: string;
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
  _highlightResult?: {
    name?: { value: string; matchLevel: string };
    nameKana?: { value: string; matchLevel: string };
    address?: { value: string; matchLevel: string };
  };
}
