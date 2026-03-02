import { useState, useEffect } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export interface StakingDailyRecord {
  date: string;
  staked: number;
  pending?: number;    // FAF in unstaking queue (Flash.Trade only)
  unstaked: number;
  vested?: number;     // Reserved FAF: allocated but not yet distributed; includes NFT reserve + accumulated penalties (Flash.Trade only)
  total: number;
  staked_delta?: number;
  total_delta?: number;
  price?: number;      // Token price in USD (Flash.Trade only)
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
  generated_at?: string;
  date_range?: {
    start: string;
    end: string;
  };
  supply?: {
    max: number;
  };
  daily: StakingDailyRecord[];
  active_stakers?: number | {
    daily_counts: ActiveStakersRecord[];
  };
  top_stakers_7d: StakingTopEntry[];
  top_withdrawers_7d: StakingTopEntry[];
  // Flash.Trade specific fields
  total_staked?: number;
  staking_wallets?: number;
  percent_staked?: number;
  rewards_30d_usdc?: number;
  current_apr?: number;
  total_rewards_usdc?: number;
  changes?: Record<string, unknown>;
}

interface ProtocolConfig {
  protocol: 'defituna' | 'flash-trade';
  dataPath: string;
  stakeToken: string;
  rewardToken: string;
}

const PROTOCOL_CONFIGS: Record<string, ProtocolConfig> = {
  'defituna': {
    protocol: 'defituna',
    dataPath: '/data/defituna/staking_tuna.json',
    stakeToken: 'TUNA',
    rewardToken: 'SOL',
  },
  'flash-trade': {
    protocol: 'flash-trade',
    dataPath: '/data/flash-trade/staking_metrics.json',
    stakeToken: 'FAF',
    rewardToken: 'USDC',
  },
};

// Per-protocol caches to prevent re-fetching on component remounts
const cacheByProtocol: Record<string, {
  data: StakingMetrics | null;
  error: string | null;
  isLoading: boolean;
  loadPromise: Promise<void> | null;
}> = {};

function getCache(protocol: string) {
  if (!cacheByProtocol[protocol]) {
    cacheByProtocol[protocol] = {
      data: null,
      error: null,
      isLoading: false,
      loadPromise: null,
    };
  }
  return cacheByProtocol[protocol];
}

export function useStakingMetrics(protocol: 'defituna' | 'flash-trade' = 'defituna') {
  const config = PROTOCOL_CONFIGS[protocol];
  const dataPath = useBaseUrl(config.dataPath);
  const cache = getCache(protocol);

  const [data, setData] = useState<StakingMetrics | null>(cache.data);
  const [loading, setLoading] = useState(!cache.data && !cache.error);
  const [error, setError] = useState<string | null>(cache.error);

  useEffect(() => {
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
        console.error('Failed to load staking metrics:', err);
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

  return { data, loading, error, config };
}
