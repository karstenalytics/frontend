import { useState, useEffect } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export interface FlashVestingSchedule {
  contract_address: string;
  label: string;
  status: 'active' | 'cancelled';
  cancelled_at: string | null;
  recipient: string;
  allocation?: number;
  start_time: string;
  end_time: string;
  total_faf: number;
  withdrawn_faf: number;
  remaining_faf: number;
  cliff_time: string | null;
  cliff_faf: number;
  period_seconds: number;
  unlocks: FlashUnlockEvent[];
  wallet_faf_balance?: number;
}

export interface FlashUnlockEvent {
  date: string;
  amount: number;
  type: 'cliff' | 'periodic';
}

export interface FlashCancelledContract {
  contract_address: string;
  label: string;
  cancelled_at: string | null;
  replaced_by: string | null;
}

export interface FlashVestingStakingOp {
  signature: string;
  timestamp: string;
  date: string;
  wallet: string;
  type: string;
  amount: number;
  pool: number;
  mint: string | null;
}

export interface FlashVestingTimeline {
  schedules: FlashVestingSchedule[];
  daily_timeline: Record<string, number>;
  cancelled_contracts: FlashCancelledContract[];
  wallet_balances?: Record<string, number>;
  per_wallet_staked?: Record<string, number>;
  staked_by_vesting_wallets_timeline?: Record<string, number>;
  held_by_vesting_wallets_timeline?: Record<string, number>;
  vesting_wallet_staking_operations?: FlashVestingStakingOp[];
  date_range: {
    start: string;
    end: string;
  };
  metadata: {
    faf_decimals: number;
    total_supply: number;
    generated_at: string;
  };
}

// Module-level cache to prevent re-fetching on component remounts
let cachedData: FlashVestingTimeline | null = null;
let cachedError: string | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

export function useFlashVestingTimeline() {
  const dataPath = useBaseUrl('/data/flash-trade/vesting_timeline.json');

  const [data, setData] = useState<FlashVestingTimeline | null>(cachedData);
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
        console.error('Failed to load Flash vesting timeline:', err);
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
