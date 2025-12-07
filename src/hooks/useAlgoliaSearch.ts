/**
 * Algolia検索フック
 */
import { useState, useEffect, useCallback } from 'react';
import { customersIndex, DEFAULT_SEARCH_OPTIONS, AlgoliaCustomerHit } from '../lib/algolia';

interface UseAlgoliaSearchResult {
  results: AlgoliaCustomerHit[];
  loading: boolean;
  error: string | null;
  totalHits: number;
  searchTime: number;
}

export function useAlgoliaSearch(query: string, debounceMs = 300): UseAlgoliaSearchResult {
  const [results, setResults] = useState<AlgoliaCustomerHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalHits, setTotalHits] = useState(0);
  const [searchTime, setSearchTime] = useState(0);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      // クエリが空の場合は初期データを取得
      setLoading(true);
      try {
        const { hits, nbHits, processingTimeMS } = await customersIndex.search('', {
          ...DEFAULT_SEARCH_OPTIONS,
          hitsPerPage: 100,
        });
        setResults(hits as AlgoliaCustomerHit[]);
        setTotalHits(nbHits);
        setSearchTime(processingTimeMS);
        setError(null);
      } catch (err) {
        console.error('Algolia search error:', err);
        setError('検索中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Algolia] Searching for:', searchQuery);
      const { hits, nbHits, processingTimeMS } = await customersIndex.search(searchQuery, {
        ...DEFAULT_SEARCH_OPTIONS,
      });
      console.log('[Algolia] Results:', { nbHits, hitsCount: hits.length, processingTimeMS });

      setResults(hits as AlgoliaCustomerHit[]);
      setTotalHits(nbHits);
      setSearchTime(processingTimeMS);
    } catch (err) {
      console.error('[Algolia] Search error:', err);
      setError('検索中にエラーが発生しました');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, performSearch]);

  return { results, loading, error, totalHits, searchTime };
}
