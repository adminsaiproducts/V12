import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch/lite';

const appId = import.meta.env.VITE_ALGOLIA_APP_ID || '';
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY || '';
const indexName = import.meta.env.VITE_ALGOLIA_INDEX_NAME || 'customers';

// Algoliaが設定されているかチェック
export const isAlgoliaConfigured = Boolean(appId && searchKey);

// Initialize Algolia client (設定がある場合のみ)
let searchClient: SearchClient | null = null;
let customersIndex: SearchIndex | null = null;

if (isAlgoliaConfigured) {
  searchClient = algoliasearch(appId, searchKey);
  customersIndex = searchClient.initIndex(indexName);
}

// Algolia search configuration
export const ALGOLIA_CONFIG = {
  indexName,
  searchClient,
  isConfigured: isAlgoliaConfigured,
};

export { searchClient, customersIndex };

/**
 * Algoliaで顧客を検索
 * Algoliaが設定されていない場合はnullを返す
 */
export async function searchCustomersAlgolia(
  query: string,
  options?: {
    hitsPerPage?: number;
    page?: number;
    filters?: string;
  }
) {
  if (!customersIndex) {
    console.warn('Algolia is not configured. Using Firestore search instead.');
    return null;
  }

  const { hitsPerPage = 50, page = 0, filters } = options || {};

  const result = await customersIndex.search(query, {
    hitsPerPage,
    page,
    filters,
    attributesToRetrieve: [
      'objectID',
      'trackingNo',
      'name',
      'nameKana',
      'phone',
      'address',
      'email',
    ],
    attributesToHighlight: ['name', 'nameKana', 'phone'],
  });

  return {
    hits: result.hits,
    nbHits: result.nbHits,
    page: result.page,
    nbPages: result.nbPages,
    processingTimeMS: result.processingTimeMS,
  };
}
