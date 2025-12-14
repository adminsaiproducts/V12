import { useState, useCallback } from 'react';

export interface AddressSearchResult {
    postalCode: string;
    prefecture: string;
    city: string;
    town: string;
}

interface UseAddressToPostalCodeReturn {
    results: AddressSearchResult[];
    loading: boolean;
    error: string | null;
    search: (prefecture: string, city: string, town?: string) => Promise<void>;
    clear: () => void;
}

/**
 * Hook to search postal code from address using HeartRails Geo API
 * https://geoapi.heartrails.com/api.html
 */
export const useAddressToPostalCode = (): UseAddressToPostalCodeReturn => {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<AddressSearchResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async (prefecture: string, city: string, town?: string) => {
        if (!prefecture || !city) {
            setError('都道府県と市区町村を入力してください');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use HeartRails Geo API for address to postal code lookup
            // First, get towns in the city
            const params = new URLSearchParams({
                method: 'getTowns',
                prefecture: prefecture,
                city: city,
            });

            const response = await fetch(
                `https://geoapi.heartrails.com/api/json?${params.toString()}`
            );
            const json = await response.json();

            if (json.response && json.response.location && json.response.location.length > 0) {
                let locations = json.response.location;

                // Filter by town name if provided
                if (town && town.trim()) {
                    const townLower = town.toLowerCase();
                    locations = locations.filter((loc: { town?: string }) =>
                        loc.town && (
                            loc.town.toLowerCase().includes(townLower) ||
                            townLower.includes(loc.town.toLowerCase())
                        )
                    );
                }

                if (locations.length === 0) {
                    // No match with town filter, show all results for the city
                    locations = json.response.location;
                }

                const searchResults: AddressSearchResult[] = locations.map((loc: { postal: string; prefecture: string; city: string; town: string }) => ({
                    postalCode: loc.postal,
                    prefecture: loc.prefecture,
                    city: loc.city,
                    town: loc.town,
                }));

                // Remove duplicates based on postal code
                const uniqueResults = searchResults.filter((result, index, self) =>
                    index === self.findIndex((r) => r.postalCode === result.postalCode)
                );

                setResults(uniqueResults);

                if (uniqueResults.length === 0) {
                    setError('該当する郵便番号が見つかりませんでした');
                }
            } else {
                setError('該当する郵便番号が見つかりませんでした');
                setResults([]);
            }
        } catch (err) {
            console.error('Postal code search error:', err);
            setError('郵便番号の検索に失敗しました');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setResults([]);
        setError(null);
    }, []);

    return {
        results,
        loading,
        error,
        search,
        clear,
    };
};

/**
 * Validate if postal code matches the address
 */
export const validatePostalCodeAddress = async (
    postalCode: string,
    prefecture: string,
    city: string,
    town?: string
): Promise<{ isValid: boolean; message?: string; suggestions?: AddressSearchResult[] }> => {
    if (!postalCode || postalCode.replace(/[^0-9]/g, '').length !== 7) {
        return { isValid: true }; // Skip validation if no postal code
    }

    const cleaned = postalCode.replace(/[^0-9]/g, '');

    try {
        const response = await fetch(
            `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`
        );
        const json = await response.json();

        if (json.status !== 200 || !json.results || json.results.length === 0) {
            return { isValid: false, message: '郵便番号が間違っている可能性が高いです' };
        }

        // Check if any result matches the entered address
        const matchingResult = json.results.find((result: { address1: string; address2: string; address3: string }) => {
            const prefectureMatch = !prefecture || result.address1 === prefecture;
            const cityMatch = !city || result.address2.includes(city) || city.includes(result.address2);
            const townMatch = !town || result.address3.includes(town) || town.includes(result.address3);
            return prefectureMatch && cityMatch && townMatch;
        });

        if (matchingResult) {
            return { isValid: true };
        }

        // No match - return suggestions
        const suggestions: AddressSearchResult[] = json.results.map((result: { zipcode: string; address1: string; address2: string; address3: string }) => ({
            postalCode: result.zipcode,
            prefecture: result.address1,
            city: result.address2,
            town: result.address3,
        }));

        return {
            isValid: false,
            message: '郵便番号と住所が一致しません',
            suggestions,
        };
    } catch (err) {
        return { isValid: true }; // Skip validation on error
    }
};
