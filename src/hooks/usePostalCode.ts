import { useState, useEffect } from 'react';

export interface PostalCodeResult {
    prefecture: string;
    city: string;
    town: string;
}

interface UsePostalCodeReturn {
    data: PostalCodeResult | null;
    results: PostalCodeResult[];
    loading: boolean;
    error: string | null;
    hasMultipleResults: boolean;
    selectResult: (index: number) => void;
}

export const usePostalCode = (postalCode: string): UsePostalCodeReturn => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<PostalCodeResult | null>(null);
    const [results, setResults] = useState<PostalCodeResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Only fetch if postal code is 7 digits
        const cleaned = postalCode.replace(/[^0-9]/g, '');
        if (cleaned.length !== 7) {
            setData(null);
            setResults([]);
            return;
        }

        const fetchAddress = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`
                );
                const json = await response.json();

                if (json.status === 200 && json.results && json.results.length > 0) {
                    const allResults: PostalCodeResult[] = json.results.map((result: Record<string, string>) => ({
                        prefecture: result.address1,
                        city: result.address2,
                        town: result.address3,
                    }));

                    setResults(allResults);

                    // If only one result, auto-select it
                    if (allResults.length === 1) {
                        setData(allResults[0]);
                    } else {
                        // Multiple results - don't auto-select, let user choose
                        setData(null);
                    }
                } else {
                    setError('郵便番号が見つかりませんでした');
                    setData(null);
                    setResults([]);
                }
            } catch (err) {
                setError('住所の取得に失敗しました');
                setData(null);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchAddress, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [postalCode]);

    const selectResult = (index: number) => {
        if (index >= 0 && index < results.length) {
            setData(results[index]);
        }
    };

    return {
        data,
        results,
        loading,
        error,
        hasMultipleResults: results.length > 1,
        selectResult,
    };
};
