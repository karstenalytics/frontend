import { useState, useEffect } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export interface LoyaltySummary {
  total_users: number;
  compound_only_users: number;
  claim_only_users: number;
  mixed_users: number;
  total_rewards_sol: number;
  total_compounded_sol: number;
  total_claimed_sol: number;
  compound_rate: number;
  loyalty_score: number;
}

export interface BehaviorSegment {
  count: number;
  percentage: number;
}

export interface RewardSizeSegment {
  label: string;
  user_count: number;
  avg_compound_rate: number;
  total_rewards: number;
}

export interface StakeSizeSegment {
  label: string;
  user_count: number;
  avg_compound_rate: number;
  total_staked_tuna: number;
  total_rewards: number;
  compound_only_users: number;
  claim_only_users: number;
  mixed_users: number;
}

export interface UserSegments {
  by_behavior: {
    compound_only: BehaviorSegment;
    claim_only: BehaviorSegment;
    mixed: BehaviorSegment;
  };
  by_reward_size: {
    whales: RewardSizeSegment;
    large: RewardSizeSegment;
    medium: RewardSizeSegment;
    small: RewardSizeSegment;
  };
  by_stake_size?: {
    [key: string]: StakeSizeSegment;
  };
}

export interface WeeklyTrend {
  week: string;
  claim_amount: number;
  compound_amount: number;
  total_amount: number;
  compound_rate: number;
}

export interface DailyTrend {
  date: string;
  claim_amount: number;
  compound_amount: number;
  total_amount: number;
  compound_rate: number;
}

export interface StakeDistributionBucket {
  min: number;
  max: number | null;
  label: string;
  count: number;
  total_tuna: number;
}

export interface CompoundVsStakePoint {
  stake_tuna: number;
  compound_rate: number;
  total_rewards_sol: number;
  behavior: 'compound_only' | 'claim_only' | 'mixed';
  address_short: string;
}

export interface Visualizations {
  stake_distribution: StakeDistributionBucket[];
  compound_vs_stake: CompoundVsStakePoint[];
}

/**
 * Additional context about the staker population.
 * These fields should be provided by the data pipeline to enable dynamic statistics.
 *
 * @property total_stakers_ever - Total unique wallets that have ever staked since launch
 * @property current_active_stakers - Wallets currently holding non-zero staking balances
 * @property snapshot_date - Date when current_active_stakers count was taken (e.g., "October 27, 2025")
 */
export interface DataContext {
  total_stakers_ever?: number;
  current_active_stakers?: number;
  snapshot_date?: string;
}

export interface StakerLoyaltyData {
  generated_at: string;
  date_range: {
    start: string;
    end: string;
  };
  summary: LoyaltySummary;
  user_segments: UserSegments;
  weekly_trends: WeeklyTrend[];
  daily_trends?: DailyTrend[];
  visualizations?: Visualizations;
  context?: DataContext;
}

export interface UseStakerLoyaltyResult {
  data: StakerLoyaltyData | null;
  loading: boolean;
  error: string | null;
}

// Module-level cache to prevent re-fetching on component remounts
let cachedData: StakerLoyaltyData | null = null;
let cachedError: string | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

export function useStakerLoyalty(): UseStakerLoyaltyResult {
  const dataPath = useBaseUrl('/data/staker_loyalty.json');

  const [data, setData] = useState<StakerLoyaltyData | null>(cachedData);
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
    const load = async () => {
      try {
        isLoading = true;
        setLoading(true);
        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const jsonData = await response.json();
        cachedData = jsonData;
        cachedError = null;
        setData(jsonData);
        setError(null);
      } catch (err) {
        console.error('Error loading staker loyalty data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load staker loyalty data';
        cachedError = errorMessage;
        setError(errorMessage);
      } finally {
        isLoading = false;
        setLoading(false);
      }
    };

    loadPromise = load();
  }, []);

  return { data, loading, error };
}
