import { useState, useEffect } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

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

export interface UsageMetrics {
  generated_at: string;
  date_range: {
    start: string;
    end: string;
  };
  summary: {
    transactions_scanned: number;
    staker_unique_addresses: number;
    daily_active_unique_addresses: number;
  };
  stakers: {
    daily_counts: UsageDailyRecord[];
    top_wallets: UsageTopWallet[];
  };
  daily_users: {
    daily_counts: UsageDailyRecord[];
    top_wallets: UsageTopWallet[];
  };
  weekly_users: {
    rolling_counts: UsageDailyRecord[];
    top_wallets: UsageTopWallet[];
  };
}

// Module-level cache to prevent re-fetching on component remounts
let cachedData: UsageMetrics | null = null;
let cachedError: string | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

export function useUsageMetrics() {
  const dataPath = useBaseUrl('/data/usage_metrics.json');

  const [data, setData] = useState<UsageMetrics | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData && !cachedError);
  const [error, setError] = useState<string | null>(cachedError);

  useEffect(() => {
    // If we already have cached data or error, use it immediately
    if (cachedData || cachedError) {
      setData(cachedData);
      setError(cachedError);
      setLoading(false);
      return;
    }

    // If data is currently being loaded by another component instance, wait for it
    if (isLoading && loadPromise) {
      loadPromise.then(() => {
        setData(cachedData);
        setError(cachedError);
        setLoading(false);
      });
      return;
    }

    // Start loading data
    let cancelled = false;
    const load = async () => {
      try {
        isLoading = true;
        setLoading(true);
        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (!cancelled) {
          cachedData = payload;
          cachedError = null;
          setData(payload);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load usage metrics:', err);
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          cachedError = errorMessage;
          setError(errorMessage);
        }
      } finally {
        isLoading = false;
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPromise = load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
