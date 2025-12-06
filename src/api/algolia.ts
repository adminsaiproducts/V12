import algoliasearch from 'algoliasearch/lite';

const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY;
const indexName = import.meta.env.VITE_ALGOLIA_INDEX_NAME || 'customers';

// Initialize Algolia client
export const searchClient = algoliasearch(appId, searchKey);
export const customersIndex = searchClient.initIndex(indexName);

// Algolia search configuration
export const ALGOLIA_CONFIG = {
  indexName,
  searchClient,
};

/**
 * Algoliaで顧客を検索
 */
export async function searchCustomersAlgolia(
  query: string,
  options?: {
    hitsPerPage?: number;
    page?: number;
    filters?: string;
  }
) {
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
