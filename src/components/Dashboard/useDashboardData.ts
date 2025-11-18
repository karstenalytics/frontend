import { useState, useEffect } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type { DashboardData, SummaryData, DailyDataPoint, TopTransactionsData } from './types';

// Module-level cache to prevent re-fetching on component remounts
let cachedData: DashboardData | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

/**
 * Custom hook to load all dashboard data from JSON files
 */
export function useDashboardData(): DashboardData {
  const BASE_PATH = useBaseUrl('/data');

  const [data, setData] = useState<DashboardData>(() => {
    // Initialize with cached data if available
    if (cachedData) {
      return cachedData;
    }
    return {
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
  });

  useEffect(() => {
    // If we already have cached data, use it immediately
    if (cachedData) {
      setData(cachedData);
      return;
    }

    // If data is currently being loaded by another component instance, wait for it
    if (isLoading && loadPromise) {
      loadPromise.then(() => {
        if (cachedData) {
          setData(cachedData);
        }
      });
      return;
    }

    // Start loading data
    async function loadData() {
      try {
        isLoading = true;
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

        // Cache the loaded data
        cachedData = loadedData;
        setData(loadedData);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        const errorData = {
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
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load data',
        };
        setData(errorData);
      } finally {
        isLoading = false;
      }
    }

    loadPromise = loadData();
  }, []);

  return data;
}
