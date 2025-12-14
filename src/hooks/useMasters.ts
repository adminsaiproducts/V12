/**
 * マスターデータを管理するカスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MasterType,
  MasterDocument,
  MasterItem,
  getMaster,
  getAllMasters,
  addMasterItem,
  updateMasterItem,
  deleteMasterItem,
  removeMasterItem,
  reorderMasterItems,
  MASTER_TYPE_LABELS,
} from '../api/masters';

interface UseMasterResult {
  master: MasterDocument | null;
  options: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (name: string) => Promise<MasterItem>;
  updateItem: (itemId: string, updates: Partial<MasterItem>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  reorderItems: (itemIds: string[]) => Promise<void>;
}

/**
 * 単一のマスタータイプを管理するフック
 */
export function useMaster(type: MasterType): UseMasterResult {
  const [master, setMaster] = useState<MasterDocument | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaster = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMaster(type);
      setMaster(data);
      if (data) {
        const opts = data.items
          .filter((item) => item.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => item.name);
        setOptions(opts);
      }
    } catch (err) {
      console.error('Error fetching master:', err);
      setError('マスターデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchMaster();
  }, [fetchMaster]);

  const addItem = useCallback(async (name: string): Promise<MasterItem> => {
    const newItem = await addMasterItem(type, name);
    await fetchMaster();
    return newItem;
  }, [type, fetchMaster]);

  const updateItem = useCallback(async (itemId: string, updates: Partial<MasterItem>): Promise<void> => {
    await updateMasterItem(type, itemId, updates);
    await fetchMaster();
  }, [type, fetchMaster]);

  const deleteItem = useCallback(async (itemId: string): Promise<void> => {
    await deleteMasterItem(type, itemId);
    await fetchMaster();
  }, [type, fetchMaster]);

  const removeItem = useCallback(async (itemId: string): Promise<void> => {
    await removeMasterItem(type, itemId);
    await fetchMaster();
  }, [type, fetchMaster]);

  const reorderItems = useCallback(async (itemIds: string[]): Promise<void> => {
    await reorderMasterItems(type, itemIds);
    await fetchMaster();
  }, [type, fetchMaster]);

  return {
    master,
    options,
    loading,
    error,
    refresh: fetchMaster,
    addItem,
    updateItem,
    deleteItem,
    removeItem,
    reorderItems,
  };
}

interface UseAllMastersResult {
  masters: Record<MasterType, MasterDocument> | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getOptions: (type: MasterType) => string[];
}

/**
 * 全マスターデータを管理するフック
 */
export function useAllMasters(): UseAllMastersResult {
  const [masters, setMasters] = useState<Record<MasterType, MasterDocument> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllMasters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllMasters();
      setMasters(data);
    } catch (err) {
      console.error('Error fetching all masters:', err);
      setError('マスターデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMasters();
  }, [fetchAllMasters]);

  const getOptions = useCallback((type: MasterType): string[] => {
    if (!masters || !masters[type]) return [];
    return masters[type].items
      .filter((item) => item.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.name);
  }, [masters]);

  return {
    masters,
    loading,
    error,
    refresh: fetchAllMasters,
    getOptions,
  };
}

// Re-export types
export type { MasterType, MasterDocument, MasterItem };
export { MASTER_TYPE_LABELS };
