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

// 結果をtrackingNoの降順でソート（管理番号の大きい順）
const sortByTrackingNoDesc = (hits: AlgoliaCustomerHit[]): AlgoliaCustomerHit[] => {
  return [...hits].sort((a, b) => {
    const aNo = parseInt(a.trackingNo, 10) || 0;
    const bNo = parseInt(b.trackingNo, 10) || 0;
    return bNo - aNo; // 降順
  });
};

// 管理番号の一致を優先してソート
const sortWithTrackingNoPriority = (hits: AlgoliaCustomerHit[], query: string): AlgoliaCustomerHit[] => {
  const trimmedQuery = query.trim();

  // クエリが空の場合は管理番号降順
  if (!trimmedQuery) {
    return sortByTrackingNoDesc(hits);
  }

  return [...hits].sort((a, b) => {
    const aTrackingNo = a.trackingNo || '';
    const bTrackingNo = b.trackingNo || '';

    // 管理番号の完全一致を最優先
    const aExactMatch = aTrackingNo === trimmedQuery;
    const bExactMatch = bTrackingNo === trimmedQuery;
    if (aExactMatch && !bExactMatch) return -1;
    if (!aExactMatch && bExactMatch) return 1;

    // 管理番号の前方一致を次に優先
    const aStartsWith = aTrackingNo.startsWith(trimmedQuery);
    const bStartsWith = bTrackingNo.startsWith(trimmedQuery);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;

    // 管理番号に含まれる場合
    const aContains = aTrackingNo.includes(trimmedQuery);
    const bContains = bTrackingNo.includes(trimmedQuery);
    if (aContains && !bContains) return -1;
    if (!aContains && bContains) return 1;

    // それ以外はAlgoliaのスコア順（元の順序を維持）
    return 0;
  });
};

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
        // 管理番号の大きい順にソート
        const sortedHits = sortByTrackingNoDesc(hits as AlgoliaCustomerHit[]);
        setResults(sortedHits);
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

      // 管理番号の一致を優先してソート
      const sortedHits = sortWithTrackingNoPriority(hits as AlgoliaCustomerHit[], searchQuery);
      setResults(sortedHits);
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
