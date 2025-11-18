import { useState, useEffect } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export interface StakingDailyRecord {
  date: string;
  staked: number;
  unstaked: number;
  total: number;
  staked_delta: number;
  total_delta: number;
}

export interface StakingTopEntry {
  address: string;
  amount: number;
}

export interface ActiveStakersRecord {
  date: string;
  count: number;
}

export interface StakingMetrics {
  generated_at: string;
  date_range: {
    start: string;
    end: string;
  };
  supply: {
    max: number;
  };
  daily: StakingDailyRecord[];
  active_stakers?: {
    daily_counts: ActiveStakersRecord[];
  };
  top_stakers_7d: StakingTopEntry[];
  top_withdrawers_7d: StakingTopEntry[];
}

// Module-level cache to prevent re-fetching on component remounts
let cachedData: StakingMetrics | null = null;
let cachedError: string | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

export function useStakingMetrics() {
  const dataPath = useBaseUrl('/data/staking_tuna.json');

  const [data, setData] = useState<StakingMetrics | null>(cachedData);
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
        console.error('Failed to load staking metrics:', err);
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

