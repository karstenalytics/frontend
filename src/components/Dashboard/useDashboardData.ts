import { useState, useEffect } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type { DashboardData, SummaryData, DailyDataPoint, TopTransactionsData } from './types';

// Supported protocols
export type Protocol = 'defituna' | 'flash-trade';

// Module-level cache to prevent re-fetching on component remounts
// Cache is per-protocol to avoid data mixing
const cachedDataByProtocol: Record<Protocol, DashboardData | null> = {
  'defituna': null,
  'flash-trade': null,
};
const loadingByProtocol: Record<Protocol, boolean> = {
  'defituna': false,
  'flash-trade': false,
};
const loadPromiseByProtocol: Record<Protocol, Promise<void> | null> = {
  'defituna': null,
  'flash-trade': null,
};

const emptyData: DashboardData = {
  summary: null,
  dailyStacked: [],
  dailyByToken: [],
  dailyByType: [],
  dailyByPool: [],
  topTransactionsToken: {},
  topTransactionsType: {},
  topTransactionsPool: {},
  topTransactionsPoolType: {},
  poolTypeSummary: null,
  dailyByPoolType: [],
  loading: true,
  error: null,
};

/**
 * Custom hook to load all dashboard data from JSON files
 * @param protocol - The protocol to load data for (default: 'defituna')
 */
export function useDashboardData(protocol: Protocol = 'defituna'): DashboardData {
  const BASE_PATH = useBaseUrl(`/data/${protocol}`);

  const [data, setData] = useState<DashboardData>(() => {
    // Initialize with cached data if available
    if (cachedDataByProtocol[protocol]) {
      return cachedDataByProtocol[protocol]!;
    }
    return { ...emptyData };
  });

  useEffect(() => {
    // If we already have cached data for this protocol, use it immediately
    if (cachedDataByProtocol[protocol]) {
      setData(cachedDataByProtocol[protocol]!);
      return;
    }

    // If data is currently being loaded by another component instance, wait for it
    if (loadingByProtocol[protocol] && loadPromiseByProtocol[protocol]) {
      loadPromiseByProtocol[protocol]!.then(() => {
        if (cachedDataByProtocol[protocol]) {
          setData(cachedDataByProtocol[protocol]!);
        }
      });
      return;
    }

    // Start loading data
    async function loadData() {
      try {
        loadingByProtocol[protocol] = true;
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Load all data files in parallel
        const [
          summary,
          dailyStacked,
          dailyByToken,
          dailyByType,
          dailyByPool,
          topTransactionsToken,
          topTransactionsType,
          topTransactionsPool,
          topTransactionsPoolType,
          poolTypeSummary,
          dailyByPoolType,
        ] = await Promise.all([
          fetch(`${BASE_PATH}/summary.json`).then(r => r.json()),
          fetch(`${BASE_PATH}/daily_stacked.json`).then(r => r.json()),
          fetch(`${BASE_PATH}/daily_by_token.json`).then(r => r.json()),
          fetch(`${BASE_PATH}/daily_by_type.json`).then(r => r.json()),
          fetch(`${BASE_PATH}/daily_by_pool.json`).then(r => r.json()),
          fetch(`${BASE_PATH}/top_transactions_token.json`).then(r => r.json()),
          fetch(`${BASE_PATH}/top_transactions_type.json`).then(r => r.json()),
          fetch(`${BASE_PATH}/top_transactions_pool.json`).then(r => r.json()),
          fetch(`${BASE_PATH}/top_transactions_pool_type.json`).then(r => r.json()),
          fetch(`${BASE_PATH}/pool_type_summary.json`).then(r => r.json()),
          fetch(`${BASE_PATH}/daily_by_pool_type.json`).then(r => r.json()),
        ]);

        const loadedData: DashboardData = {
          summary: summary as SummaryData,
          dailyStacked: dailyStacked as DailyDataPoint[],
          dailyByToken: dailyByToken as DailyDataPoint[],
          dailyByType: dailyByType as DailyDataPoint[],
          dailyByPool: dailyByPool as DailyDataPoint[],
          topTransactionsToken: topTransactionsToken as TopTransactionsData,
          topTransactionsType: topTransactionsType as TopTransactionsData,
          topTransactionsPool: topTransactionsPool as TopTransactionsData,
          topTransactionsPoolType: topTransactionsPoolType as TopTransactionsData,
          poolTypeSummary,
          dailyByPoolType: dailyByPoolType as DailyDataPoint[],
          loading: false,
          error: null,
        };

        // Cache the loaded data for this protocol
        cachedDataByProtocol[protocol] = loadedData;
        setData(loadedData);
      } catch (err) {
        console.error(`Error loading ${protocol} dashboard data:`, err);
        const errorData: DashboardData = {
          ...emptyData,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load data',
        };
        setData(errorData);
      } finally {
        loadingByProtocol[protocol] = false;
      }
    }

    loadPromiseByProtocol[protocol] = loadData();
  }, [protocol, BASE_PATH]);

  return data;
}
