import { useState, useEffect } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export type Protocol = 'defituna' | 'flash-trade';

export interface UsageDailyRecord {
  date: string;
  count: number;
}

export interface UsageTopWallet {
  address: string;
  tx_count: number;
  days_active: number;
  first_seen: string | null;
  last_seen: string | null;
  active_weeks?: number;
  active_months?: number;
}

export interface PoolUsageMetrics {
  unique_wallets: number;
  daily_counts: UsageDailyRecord[];
  weekly_counts: UsageDailyRecord[];
}

export interface UsageMetrics {
  generated_at: string;
  date_range: {
    start: string;
    end: string;
  };
  summary: {
    transactions_scanned: number;
    unique_wallets_platform?: number;
    unique_traders?: number;
    unique_lps?: number;
    unique_stakers?: number;
    staker_unique_addresses: number;
    daily_active_unique_addresses: number;
  };
  traders?: {
    daily_counts: UsageDailyRecord[];
    new_wallets?: UsageDailyRecord[];
    weekly_rolling?: UsageDailyRecord[];
    weekly_new_wallets?: UsageDailyRecord[];
    top_wallets: UsageTopWallet[];
    top_wallets_7d?: UsageTopWallet[];
    top_wallets_30d?: UsageTopWallet[];
  };
  lps?: {
    daily_counts: UsageDailyRecord[];
    top_wallets: UsageTopWallet[];
  };
  stakers: {
    daily_counts: UsageDailyRecord[];
    top_wallets: UsageTopWallet[];
  };
  daily_users: {
    daily_counts: UsageDailyRecord[];
    new_wallets?: UsageDailyRecord[];
    top_wallets: UsageTopWallet[];
    top_wallets_7d?: UsageTopWallet[];
    top_wallets_30d?: UsageTopWallet[];
  };
  weekly_users: {
    rolling_counts: UsageDailyRecord[];
    new_wallets?: UsageDailyRecord[];
    top_wallets: UsageTopWallet[];
    top_wallets_7d?: UsageTopWallet[];
    top_wallets_30d?: UsageTopWallet[];
  };
  by_pool?: Record<string, PoolUsageMetrics>;
}

// Module-level cache per protocol to prevent re-fetching on component remounts
const cacheByProtocol: Record<Protocol, {
  data: UsageMetrics | null;
  error: string | null;
  isLoading: boolean;
  loadPromise: Promise<void> | null;
}> = {
  'defituna': { data: null, error: null, isLoading: false, loadPromise: null },
  'flash-trade': { data: null, error: null, isLoading: false, loadPromise: null },
};

export function useUsageMetrics(protocol: Protocol = 'defituna') {
  const dataPath = useBaseUrl(`/data/${protocol}/usage_metrics.json`);
  const cache = cacheByProtocol[protocol];

  const [data, setData] = useState<UsageMetrics | null>(cache.data);
  const [loading, setLoading] = useState(!cache.data && !cache.error);
  const [error, setError] = useState<string | null>(cache.error);

  useEffect(() => {
    const cache = cacheByProtocol[protocol];

    // If we already have cached data or error, use it immediately
    if (cache.data || cache.error) {
      setData(cache.data);
      setError(cache.error);
      setLoading(false);
      return;
    }

    // If data is currently being loaded by another component instance, wait for it
    if (cache.isLoading && cache.loadPromise) {
      cache.loadPromise.then(() => {
        setData(cache.data);
        setError(cache.error);
        setLoading(false);
      });
      return;
    }

    // Start loading data
    let cancelled = false;
    const load = async () => {
      try {
        cache.isLoading = true;
        setLoading(true);
        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (!cancelled) {
          cache.data = payload;
          cache.error = null;
          setData(payload);
          setError(null);
        }
      } catch (err) {
        console.error(`Failed to load usage metrics for ${protocol}:`, err);
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          cache.error = errorMessage;
          setError(errorMessage);
        }
      } finally {
        cache.isLoading = false;
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    cache.loadPromise = load();
    return () => {
      cancelled = true;
    };
  }, [protocol, dataPath]);

  return { data, loading, error };
}
