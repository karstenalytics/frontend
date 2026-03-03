import { useState, useEffect, useMemo } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { fetchStakerCache } from './stakerCacheStore';

export interface ActiveStakersDaily {
  date: string;
  count: number;
}

export interface StakingDaily {
  date: string;
  staked: number;
  pending?: number;    // FAF in unstaking queue: 30-day cliff pre-Epoch 10, 90-day linear vesting post-2026-02-15 (Flash.Trade only)
  unstaked: number;    // FAF withdrawable (Flash.Trade) or in unstaked pool (DefiTuna)
  total: number;
}

export interface TopStakerWallet {
  address: string;
  days_active: number;
  total_staked: number;
  total_rewards: number;
  first_seen: string;
  last_seen: string;
}

export interface TopStakerEntry {
  address: string;
  amount: number;
}

export interface TopStakerByBalance {
  address: string;
  current_balance: number;
  share_pct: number;         // current_balance / totalStaked * 100
  vs_peak_pct: number;       // current_balance / max_ever_balance * 100
  change_30d_pct: number | null; // % change in wallet's own balance over 30d, null if wallet didn't exist 30d ago
}

export interface ActiveStakersData {
  daily_counts: ActiveStakersDaily[];
  daily_balances: StakingDaily[];
  top_wallets: TopStakerWallet[];
  top_stakers: TopStakerByBalance[];
  top_stakers_7d: TopStakerEntry[];
  top_withdrawers_7d: TopStakerEntry[];
  total_unique_stakers: number;
  current_active_stakers: number;
  current_total_staked: number;
  active_stakers_change_pct: number | null;
  top50_concentration_pct: number;
  top50_concentration_change_pp: number | null;
  top50_at_peak_pct: number;
  top50_at_peak_change_pp: number | null;
}

interface ProtocolConfig {
  protocol: 'defituna' | 'flash-trade';
  cachePath: string;
  stakeToken: string;
  rewardToken: string;
}

const PROTOCOL_CONFIGS: Record<string, ProtocolConfig> = {
  'defituna': {
    protocol: 'defituna',
    cachePath: '/data/defituna/staker_cache.json.gz',
    stakeToken: 'TUNA',
    rewardToken: 'SOL',
  },
  'flash-trade': {
    protocol: 'flash-trade',
    cachePath: '/data/flash-trade/staker_cache.json.gz',
    stakeToken: 'FAF',
    rewardToken: 'USDC',
  },
};

// Event array indices (same format for both protocols)
const IDX_TIMESTAMP = 1;
const IDX_TYPE = 3;
const IDX_ADDRESS = 4;
const IDX_D_STAKE = 5;
const IDX_D_PENDING = 6;      // Flash.Trade: change in pending (unstaking queue)
const IDX_D_WITHDRAWN = 7;    // Flash.Trade: change in withdrawn (withdrawable FAF)
const IDX_REWARD = 10;

// set_vesting events store locked amount in d_stake for display only;
// they do NOT represent actual token deposits and must be excluded from balance accumulation.
const EVENT_TYPE_SET_VESTING = 6;

// Minimum balance threshold to count as active. Summing many floats in JS
// introduces rounding dust (e.g. 2e-10) that the Python builder's Decimal
// arithmetic correctly quantizes to zero. Without this guard ~120 wallets
// with zero real balance are over-counted as active stakers.
const DUST_THRESHOLD = 0.001;

export function useActiveStakers(protocol: 'defituna' | 'flash-trade' = 'defituna') {
  const config = PROTOCOL_CONFIGS[protocol];
  const dataPath = useBaseUrl(config.cachePath);

  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const parsed = await fetchStakerCache(dataPath);

        if (!cancelled) {
          setRawData(parsed);
        }
      } catch (err) {
        console.error('Failed to load staker cache:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [dataPath]);

  // Process raw data into active stakers metrics
  const data = useMemo<ActiveStakersData | null>(() => {
    if (!rawData?.events) return null;

    const events = rawData.events as any[];

    // Track wallet balances over time
    const walletBalances: Map<string, number> = new Map();
    const walletStats: Map<string, {
      days_active: Set<string>;
      total_staked: number;
      total_rewards: number;
      max_balance: number;
      first_seen: string;
      last_seen: string;
    }> = new Map();

    // Track 7-day staking/withdrawing activity
    const staking7d: Map<string, number> = new Map();
    const withdrawing7d: Map<string, number> = new Map();

    // Group events by date
    const eventsByDate: Map<string, any[]> = new Map();

    for (const event of events) {
      const timestamp = event[IDX_TIMESTAMP];
      // Timestamp can be ISO string or Unix timestamp
      const date = typeof timestamp === 'string'
        ? timestamp.split('T')[0]
        : new Date(timestamp * 1000).toISOString().split('T')[0];

      if (!eventsByDate.has(date)) {
        eventsByDate.set(date, []);
      }
      eventsByDate.get(date)!.push(event);
    }

    // Sort dates
    const sortedDates = Array.from(eventsByDate.keys()).sort();

    // Get last 7 days for recent activity
    const last7Days = new Set(sortedDates.slice(-7));

    // Compute 30-day snapshot date (largest date <= lastDate - 30 days)
    let snapshotDate: string | null = null;
    if (sortedDates.length > 0) {
      const lastDate = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00Z');
      const target30d = new Date(lastDate);
      target30d.setUTCDate(target30d.getUTCDate() - 30);
      const targetStr = target30d.toISOString().split('T')[0];
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        if (sortedDates[i] <= targetStr) {
          snapshotDate = sortedDates[i];
          break;
        }
      }
    }
    let walletBalances30dAgo: Map<string, number> | null = null;
    let walletMaxBalances30dAgo: Map<string, number> | null = null;
    let totalStaked30dAgo = 0;
    let activeStakers30dAgo: number | null = null;

    // Calculate active stakers per day and daily balances
    const dailyCounts: ActiveStakersDaily[] = [];
    const dailyBalances: StakingDaily[] = [];

    // Track cumulative pending and withdrawn amounts for Flash.Trade
    let cumulativePending = 0;
    let cumulativeWithdrawn = 0;

    for (const date of sortedDates) {
      const dayEvents = eventsByDate.get(date)!;
      const isRecent = last7Days.has(date);

      // Process all events for this day
      for (const event of dayEvents) {
        const eventType = event[IDX_TYPE];

        // set_vesting events record vesting metadata in d_stake for display;
        // they don't represent actual token movements.
        if (eventType === EVENT_TYPE_SET_VESTING) continue;

        const address = event[IDX_ADDRESS];
        const dStake = event[IDX_D_STAKE] || 0;
        const dPending = event[IDX_D_PENDING] || 0;
        const dWithdrawn = event[IDX_D_WITHDRAWN] || 0;
        const reward = event[IDX_REWARD] || 0;

        // Update balance
        const currentBalance = walletBalances.get(address) || 0;
        const newBalance = currentBalance + dStake;
        walletBalances.set(address, newBalance);

        // Update cumulative pending and withdrawn (Flash.Trade)
        cumulativePending += dPending;
        cumulativeWithdrawn += dWithdrawn;

        // Track 7-day activity
        if (isRecent) {
          if (dStake > 0) {
            staking7d.set(address, (staking7d.get(address) || 0) + dStake);
          } else if (dStake < 0) {
            withdrawing7d.set(address, (withdrawing7d.get(address) || 0) + Math.abs(dStake));
          }
        }

        // Update wallet stats
        if (!walletStats.has(address)) {
          walletStats.set(address, {
            days_active: new Set(),
            total_staked: 0,
            total_rewards: 0,
            max_balance: 0,
            first_seen: date,
            last_seen: date,
          });
        }

        const stats = walletStats.get(address)!;
        stats.days_active.add(date);
        stats.last_seen = date;
        if (newBalance > stats.max_balance) {
          stats.max_balance = newBalance;
        }
        if (dStake > 0) {
          stats.total_staked += dStake;
        }
        if (reward > 0) {
          stats.total_rewards += reward;
        }
      }

      // Count wallets with positive balance and sum total staked at end of day
      let activeCount = 0;
      let totalStaked = 0;
      for (const balance of walletBalances.values()) {
        if (balance > DUST_THRESHOLD) {
          activeCount++;
          totalStaked += balance;
        }
      }

      dailyCounts.push({ date, count: activeCount });

      // Capture 30-day snapshot at end of the snapshot date
      if (date === snapshotDate) {
        walletBalances30dAgo = new Map(walletBalances);
        totalStaked30dAgo = totalStaked;
        activeStakers30dAgo = activeCount;
        walletMaxBalances30dAgo = new Map();
        for (const [addr, stats] of walletStats) {
          walletMaxBalances30dAgo.set(addr, stats.max_balance);
        }
      }

      // For Flash.Trade, include pending and unstaked (withdrawn) amounts
      const dailyBalance: StakingDaily = {
        date,
        staked: totalStaked,
        unstaked: cumulativeWithdrawn,
        total: totalStaked + cumulativePending + cumulativeWithdrawn,
      };

      // Only include pending field for Flash.Trade
      if (config.protocol === 'flash-trade') {
        dailyBalance.pending = cumulativePending;
      }

      dailyBalances.push(dailyBalance);
    }

    // Build top wallets list (by days active)
    const topWallets: TopStakerWallet[] = Array.from(walletStats.entries())
      .map(([address, stats]) => ({
        address,
        days_active: stats.days_active.size,
        total_staked: stats.total_staked,
        total_rewards: stats.total_rewards,
        first_seen: stats.first_seen,
        last_seen: stats.last_seen,
      }))
      .sort((a, b) => b.days_active - a.days_active)
      .slice(0, 100);

    // Build top stakers by current balance
    const currentTotalStaked = dailyBalances.length > 0
      ? dailyBalances[dailyBalances.length - 1].staked
      : 0;

    const topStakers: TopStakerByBalance[] = Array.from(walletBalances.entries())
      .filter(([, balance]) => balance > DUST_THRESHOLD)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([address, balance]) => {
        const stats = walletStats.get(address)!;
        const sharePct = currentTotalStaked > 0 ? (balance / currentTotalStaked) * 100 : 0;
        const vsPeakPct = stats.max_balance > 0 ? (balance / stats.max_balance) * 100 : 0;

        let change30dPct: number | null = null;
        if (walletBalances30dAgo) {
          const balance30d = walletBalances30dAgo.get(address) || 0;
          if (balance30d > 0) {
            change30dPct = ((balance - balance30d) / balance30d) * 100;
          } else if (stats.first_seen <= (snapshotDate || '')) {
            // Wallet existed 30d ago with zero balance, now has a balance
            change30dPct = balance > DUST_THRESHOLD ? 100 : 0;
          }
        }

        return {
          address,
          current_balance: balance,
          share_pct: sharePct,
          vs_peak_pct: vsPeakPct,
          change_30d_pct: change30dPct,
        };
      });

    // Count current active stakers (last day's count)
    const currentActive = dailyCounts.length > 0
      ? dailyCounts[dailyCounts.length - 1].count
      : 0;

    // Compute metric card values
    const activeStakersChangePct = activeStakers30dAgo != null && activeStakers30dAgo > 0
      ? ((currentActive - activeStakers30dAgo) / activeStakers30dAgo) * 100
      : null;

    const top50ConcentrationPct = topStakers.reduce((s, w) => s + w.share_pct, 0);

    let top50ConcentrationChangePp: number | null = null;
    if (walletBalances30dAgo && totalStaked30dAgo > 0) {
      const snapshot30dEntries = Array.from(walletBalances30dAgo.entries())
        .filter(([, b]) => b > DUST_THRESHOLD)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);
      const concentration30d = snapshot30dEntries.reduce(
        (s, [, b]) => s + (b / totalStaked30dAgo) * 100, 0,
      );
      top50ConcentrationChangePp = top50ConcentrationPct - concentration30d;
    }

    const atPeakCount = topStakers.filter(w => w.vs_peak_pct >= 100).length;
    const top50AtPeakPct = topStakers.length > 0 ? (atPeakCount / topStakers.length) * 100 : 0;

    let top50AtPeakChangePp: number | null = null;
    if (walletBalances30dAgo && walletMaxBalances30dAgo) {
      const snapshot30dTop50 = Array.from(walletBalances30dAgo.entries())
        .filter(([, b]) => b > DUST_THRESHOLD)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);
      const atPeak30d = snapshot30dTop50.filter(([addr, bal]) => {
        const maxBal = walletMaxBalances30dAgo!.get(addr) || 0;
        return maxBal > 0 && bal >= maxBal;
      }).length;
      const atPeakPct30d = snapshot30dTop50.length > 0 ? (atPeak30d / snapshot30dTop50.length) * 100 : 0;
      top50AtPeakChangePp = top50AtPeakPct - atPeakPct30d;
    }

    // Build top stakers/withdrawers in last 7 days
    const topStakers7d: TopStakerEntry[] = Array.from(staking7d.entries())
      .map(([address, amount]) => ({ address, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const topWithdrawers7d: TopStakerEntry[] = Array.from(withdrawing7d.entries())
      .map(([address, amount]) => ({ address, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      daily_counts: dailyCounts,
      daily_balances: dailyBalances,
      top_wallets: topWallets,
      top_stakers: topStakers,
      top_stakers_7d: topStakers7d,
      top_withdrawers_7d: topWithdrawers7d,
      total_unique_stakers: walletStats.size,
      current_active_stakers: currentActive,
      current_total_staked: currentTotalStaked,
      active_stakers_change_pct: activeStakersChangePct,
      top50_concentration_pct: top50ConcentrationPct,
      top50_concentration_change_pp: top50ConcentrationChangePp,
      top50_at_peak_pct: top50AtPeakPct,
      top50_at_peak_change_pp: top50AtPeakChangePp,
    };
  }, [rawData]);

  return { data, loading, error, config };
}
