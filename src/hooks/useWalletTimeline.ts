import { useState, useEffect, useCallback, useRef } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { fetchStakerCache } from './stakerCacheStore';

/**
 * Raw event data structure from staker cache.
 * DefiTuna columns (11): [sig, ts, slot, type_id, address, d_stake, d_pending, d_withdrawn, d_compounded, fee_payer, reward_sol]
 * Flash columns (12):    [sig, ts, slot, type_id, address, d_stake, d_pending, d_withdrawn, d_compounded, fee_payer, reward_amount, treasury_delta]
 * Fields d_unstaked (12) and d_vested (13) are reserved but not currently populated in the cache.
 */
type StakerEvent = [
  signature: string,
  timestamp: string,
  slot: number,
  type_id: number,
  address: string,
  d_stake: number,
  d_pending: number,
  d_withdrawn: number,
  d_compounded: number,
  fee_payer: string | null,
  reward_amount: number,
  treasury_delta?: number,
  d_unstaked?: number,
  d_vested?: number,
  ...rest: unknown[]
];

/**
 * Address data structure from staker cache
 */
interface AddressData {
  first_event: number;
  last_event: number;
  // DefiTuna: [staked, pending(=unstaked), withdrawn, compounded, total_rewards]
  // Flash:    [staked, pending, withdrawn_lifetime, compound_rate, total_rewards, behavior]
  current: number[];
}

/**
 * Staker cache structure
 */
interface StakerCache {
  addresses: Record<string, AddressData>;
  events: StakerEvent[];
  meta: {
    start: string;
    end: string;
    address_count: number;
    event_count: number;
  };
}

export interface TimelinePoint {
  date: string;
  staked: number;
  unstaked: number;
  locked: number;  // Locked TUNA from vesting schedules
  realized_rewards: number;
}

// Vesting schedule for tracking locked amounts
interface VestingSchedule {
  startTime: Date;
  lockedTuna: number;
  cliffHours: number;
  unlockPeriodHours: number;
  unlockRateTuna: number;
}

/**
 * Calculate remaining locked amount for a vesting schedule at a given time
 */
function calculateLockedAmount(schedule: VestingSchedule, currentTime: Date): number {
  const elapsedMs = currentTime.getTime() - schedule.startTime.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  // Still in cliff period
  if (elapsedHours < schedule.cliffHours) {
    return schedule.lockedTuna;
  }

  // Calculate hours since cliff ended
  const hoursSinceCliff = elapsedHours - schedule.cliffHours;

  // Calculate number of complete unlock periods
  const unlockPeriods = Math.floor(hoursSinceCliff / schedule.unlockPeriodHours);

  // Calculate total unlocked
  const totalUnlocked = unlockPeriods * schedule.unlockRateTuna;

  // Return remaining locked (minimum 0)
  return Math.max(0, schedule.lockedTuna - totalUnlocked);
}

export interface Operation {
  date: string;
  type: string;
  type_label: string;
  amount: number;
  signature: string;
  solscan_url: string;
}

export interface WalletSummary {
  total_operations: number;
  current_staked: number;
  current_unstaked: number;
  current_locked: number;  // Currently locked in vesting
  realized_rewards: number;
  first_stake_date: string;
  last_activity_date: string;
  days_active: number;
}

export interface WalletTimelineData {
  wallet: string;
  found: boolean;
  date_range?: [string, string];
  timeline?: TimelinePoint[];
  operations?: Operation[];
  summary?: WalletSummary;
  error?: string;
}

// Event type mapping (must match build_staker_cache.py EVENT_TYPE_CODES)
const EVENT_TYPES: Record<number, [string, string]> = {
  0: ['initialize', 'Initialize Position'],
  1: ['stake', 'Stake'],
  2: ['unstake', 'Unstake'],
  3: ['withdraw', 'Withdraw'],
  4: ['compound', 'Compound'],
  5: ['claim', 'Claim Rewards'],
  6: ['set_vesting', 'Set Vesting Strategy'],
  7: ['collect_revenue', 'Collect Revenue'],
  8: ['collect_token_reward', 'Collect Token Reward'],
  9: ['burn_and_stake', 'Burn & Stake'],
  10: ['burn_and_claim', 'Burn & Claim'],
  11: ['withdraw_unclaimed', 'Withdraw Unclaimed'],
  13: ['cancel_unstake', 'Cancel Unstake'],
};

/**
 * Build timeline from wallet events
 * Returns [timeline, operations, vestingSchedules]
 */
function buildBalanceTimeline(
  events: StakerEvent[],
  protocol: 'defituna' | 'flash-trade'
): [TimelinePoint[], Operation[], VestingSchedule[]] {
  const timeline: TimelinePoint[] = [];
  const operations: Operation[] = [];

  let staked = 0.0;
  let pending = 0.0;
  let unstaked = 0.0; // Explicit unstaked bucket (Flash only; remains 0 for DefiTuna)
  let realized_rewards = 0.0; // Cumulative claimed + compounded (in SOL)

  // Track ALL vesting schedules (wallet can have multiple positions, each with own vesting)
  const vestingSchedules: VestingSchedule[] = [];

  for (const event of events) {
    if (event.length < 11) continue;

    // Event structure: [signature, timestamp, slot, type_id, address, d_stake, d_pending, d_withdrawn, d_compounded, fee_payer, reward_amount, treasury_delta?, d_unstaked?, d_vested?]
    const signature = event[0];
    const timestamp = event[1];
    const slot = event[2];
    const op_type = event[3];
    const d_stake = event[5] || 0; // Change in staked amount
    const d_pending = event[6] || 0; // Change in pending amount
    const d_withdrawn = event[7] || 0; // Change in withdrawn amount
    const d_compounded = event[8] || 0; // Amount compounded
    const reward_amount = event[10] || 0; // Reward amount (SOL for DefiTuna, USDC for Flash)
    const d_unstaked = (event.length > 12 ? event[12] : 0) || 0; // Flash explicit unstaked delta

    let [type_id, type_label] = EVENT_TYPES[op_type] || ['unknown', 'Unknown'];

    // Distinguish UnstakeInstant (ds<0, dp=0, dw>0) from UnstakeRequest (ds<0, dp>0)
    // UnstakeInstant bypasses the queue: unstake + withdraw in one step
    if (op_type === 2 && d_pending === 0 && d_withdrawn > 0) {
      type_id = 'unstake_instant';
      type_label = 'Unstake Instant';
    }

    // Skip events not related to FAF staking for Flash.Trade:
    // - type 5 (CollectStakeFees): LP staking USDC rewards
    // - type 10 (BurnAndClaim): TGE FAF distribution, never staked
    // - type 11 (WithdrawUnclaimed): protocol sweep of unclaimed reserve
    // - type 12 (WithdrawInstantFees): protocol pulls accumulated instant-unstake penalties
    if (protocol === 'flash-trade' && (op_type === 5 || op_type === 10 || op_type === 11 || op_type === 12)) continue;

    // Track rewards and operation amounts
    let amount = 0.0;
    // Use max (not sum) to avoid double-counting when tokens move between buckets
    // e.g. UnstakeRequest: d_stake=-X, d_pending=+X -> max gives X, sum would give 2X
    const tokenDeltaMax =
      Math.max(Math.abs(d_stake), Math.abs(d_pending), Math.abs(d_unstaked));

    if (op_type === 0) { // Initialize position (includes initial stake)
      amount = tokenDeltaMax || Math.abs(d_withdrawn);
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    } else if (op_type === 1) { // Stake
      amount = tokenDeltaMax || Math.abs(d_withdrawn);
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    } else if (op_type === 2) { // Unstake
      // Show combined amount moved out of stake (requests or instant)
      amount = tokenDeltaMax || Math.abs(d_withdrawn);
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    } else if (op_type === 3) { // Withdraw
      // Withdraws typically reduce pending/unstaked
      amount = tokenDeltaMax || Math.abs(d_withdrawn);
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    } else if (op_type === 4) { // Compound
      amount = reward_amount;
      realized_rewards += reward_amount;
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    } else if (op_type === 5) { // Claim
      amount = reward_amount;
      realized_rewards += reward_amount;
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    } else if (op_type === 7) { // Collect Revenue (USDC revenue share)
      amount = reward_amount;
      realized_rewards += reward_amount;
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    } else if (op_type === 8) { // Collect Token Reward (FAF token rewards)
      amount = Math.abs(d_withdrawn) || tokenDeltaMax;
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    } else if (op_type === 6) { // Set vesting strategy
      amount = Math.abs(d_stake); // Show locked_tuna amount (stored in d_stake field)
      // Vesting doesn't change balances - it just sets a lock on existing stake

      // Extract vesting parameters from extended event fields
      // Event structure for vesting: [..., treasury_balance, cliff_hours, unlock_period_hours, unlock_rate_tuna]
      const cliffHours = (event[12] as number) || 0;
      const unlockPeriodHours = (event[13] as number) || 0;
      const unlockRateTuna = (event[14] as number) || 0;

      // Add or update vesting schedules array (wallet can have multiple positions with vesting)
      // If we see the same lockedTuna amount, it's an update to an existing schedule (not a new one)
      if (amount > 0 && unlockPeriodHours > 0 && unlockRateTuna > 0) {
        const newSchedule = {
          startTime: new Date(timestamp),
          lockedTuna: amount,
          cliffHours,
          unlockPeriodHours,
          unlockRateTuna,
        };

        // Check if this is an update to an existing schedule (same lockedTuna amount)
        const existingIndex = vestingSchedules.findIndex(s => s.lockedTuna === amount);
        if (existingIndex >= 0) {
          // Replace the existing schedule with updated parameters
          vestingSchedules[existingIndex] = newSchedule;
        } else {
          // New vesting schedule for a different position
          vestingSchedules.push(newSchedule);
        }
      }
    } else if (op_type === 13) { // Cancel Unstake (returns FAF from queue to staked)
      amount = tokenDeltaMax || Math.abs(d_withdrawn);
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    } else if (op_type === 9) { // Burn & Stake (TGE event - burns LP tokens and stakes FAF)
      amount = tokenDeltaMax || Math.abs(d_withdrawn);
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    } else if (op_type === 10) { // Burn & Claim (TGE event - burns LP tokens and claims FAF)
      amount = Math.abs(d_withdrawn) || tokenDeltaMax;
      // Burn & Claim distributes FAF directly to wallet, doesn't affect staking balances
    } else if (op_type === 11) { // Withdraw Unclaimed (protocol operation)
      amount = Math.abs(d_withdrawn) || tokenDeltaMax;
      // Protocol-level withdrawal, doesn't affect staking balances
    } else {
      // Unknown event type - still apply deltas
      staked += d_stake;
      pending += d_pending;
      unstaked += d_unstaked;
    }

    // Calculate locked amount by summing across ALL vesting schedules
    // Vesting is purely time-based and not affected by withdrawals
    const eventTime = new Date(timestamp);
    let rawLocked = 0;
    for (const schedule of vestingSchedules) {
      rawLocked += calculateLockedAmount(schedule, eventTime);
    }

    // Cap locked to not exceed staked (locked is a subset of staked)
    const locked = Math.min(rawLocked, staked);

    // For the chart's "Unstaked" area, use `pending` (queue balance from d_pending)
    // rather than `unstaked` (d_unstaked, which is always 0 for Flash.Trade).
    // This shows FAF sitting in the unstake queue awaiting withdrawal.
    const chartUnstaked = pending + unstaked;

    timeline.push({
      date: timestamp,
      staked: Math.round(staked * 1000000) / 1000000,
      unstaked: Math.round(chartUnstaked * 1000000) / 1000000,
      locked: Math.round(locked * 1000000) / 1000000,
      realized_rewards: Math.round(realized_rewards * 1000000) / 1000000,
    });

    operations.push({
      date: timestamp,
      type: type_id,
      type_label: type_label,
      amount: Math.round(amount * 1000000) / 1000000,
      signature: signature,
      solscan_url: `https://solscan.io/tx/${signature}`,
    });
  }

  return [timeline, operations, vestingSchedules];
}

/**
 * Parse wallet timeline from staker cache
 */
function parseWalletTimeline(
  walletAddress: string,
  cache: StakerCache,
  protocol: 'defituna' | 'flash-trade'
): WalletTimelineData {
  const addresses = cache.addresses || {};
  const events = cache.events || [];
  const meta = cache.meta || {};

  // Look up wallet
  if (!addresses[walletAddress]) {
    return {
      wallet: walletAddress,
      found: false,
      error: 'This wallet did not stake FAF at any given time in the past.',
    };
  }

  const addrData = addresses[walletAddress];
  const firstEventIdx = addrData.first_event;
  const lastEventIdx = addrData.last_event;

  if (firstEventIdx === undefined || lastEventIdx === undefined) {
    return {
      wallet: walletAddress,
      found: false,
      error: 'Wallet has no event data',
    };
  }

  // Extract events for this wallet by filtering the entire events array
  // Note: first_event/last_event are indices of first/last occurrence,
  // but events are NOT contiguous - they're interleaved chronologically
  const walletEvents = events.filter((e: StakerEvent) => e.length > 4 && e[4] === walletAddress);

  if (walletEvents.length === 0) {
    return {
      wallet: walletAddress,
      found: false,
      error: 'No events found for wallet',
    };
  }

  // Sort events by timestamp to ensure chronological order
  // (synthetic events like vesting may have been appended out of order)
  walletEvents.sort((a, b) => {
    const tsA = a[1] || '';
    const tsB = b[1] || '';
    return tsA < tsB ? -1 : tsA > tsB ? 1 : 0;
  });

  // Build timeline
  const [timeline, operations, vestingSchedules] = buildBalanceTimeline(walletEvents, protocol);

  if (timeline.length === 0) {
    return {
      wallet: walletAddress,
      found: false,
      error: 'Failed to build timeline',
    };
  }

  // Insert vesting unlock events and extend to cache end date
  const cacheEndDate = meta.end;
  if (cacheEndDate && timeline.length > 0 && vestingSchedules.length > 0) {
    const cacheEndTimestamp = `${cacheEndDate}T23:59:59Z`;
    const cacheEndTime = new Date(cacheEndTimestamp);

    // Collect all unlock times from ALL vesting schedules
    const unlockTimes: Date[] = [];
    for (const schedule of vestingSchedules) {
      const startMs = schedule.startTime.getTime();
      const cliffMs = schedule.cliffHours * 60 * 60 * 1000;
      const periodMs = schedule.unlockPeriodHours * 60 * 60 * 1000;
      const totalPeriods = Math.ceil(schedule.lockedTuna / schedule.unlockRateTuna);

      for (let i = 0; i <= totalPeriods; i++) {
        let unlockTime: Date;
        if (i === 0) {
          unlockTime = new Date(startMs + cliffMs); // Cliff end
        } else {
          unlockTime = new Date(startMs + cliffMs + (i * periodMs));
        }
        if (unlockTime <= cacheEndTime) {
          unlockTimes.push(unlockTime);
        }
      }
    }

    // Add unlock points that don't coincide with existing events
    const existingDates = new Set(timeline.map(p => p.date));

    for (const unlockTime of unlockTimes) {
      const unlockDateStr = unlockTime.toISOString();

      // Skip if we already have this exact timestamp
      if (existingDates.has(unlockDateStr)) continue;

      // Find the previous event to get staked/unstaked/rewards values
      // Don't break early since timeline isn't sorted yet (added unlocks are at the end)
      let prevPoint = timeline[0];
      for (const point of timeline) {
        if (point.date <= unlockDateStr && point.date > prevPoint.date) {
          prevPoint = point;
        }
      }

      // Calculate locked at this unlock time by summing across ALL schedules
      let lockedAtUnlock = 0;
      for (const schedule of vestingSchedules) {
        lockedAtUnlock += calculateLockedAmount(schedule, unlockTime);
      }
      // Cap locked to not exceed staked
      const cappedLocked = Math.min(lockedAtUnlock, prevPoint.staked);

      timeline.push({
        date: unlockDateStr,
        staked: prevPoint.staked,
        unstaked: prevPoint.unstaked,
        locked: Math.round(cappedLocked * 1000000) / 1000000,
        realized_rewards: prevPoint.realized_rewards,
      });
    }

    // Add final point at cache end
    const lastPoint = timeline.reduce((latest, p) => p.date > latest.date ? p : latest);
    if (cacheEndTimestamp > lastPoint.date) {
      // Sum locked across ALL schedules at cache end
      let lockedAtEnd = 0;
      for (const schedule of vestingSchedules) {
        lockedAtEnd += calculateLockedAmount(schedule, cacheEndTime);
      }
      // Cap locked to not exceed staked
      lockedAtEnd = Math.min(lockedAtEnd, lastPoint.staked);

      timeline.push({
        date: cacheEndTimestamp,
        staked: lastPoint.staked,
        unstaked: lastPoint.unstaked,
        locked: Math.round(lockedAtEnd * 1000000) / 1000000,
        realized_rewards: lastPoint.realized_rewards,
      });
    }

    // Sort timeline chronologically
    timeline.sort((a, b) => a.date.localeCompare(b.date));

  } else if (cacheEndDate && timeline.length > 0) {
    // No vesting schedule - just extend to cache end
    const lastTimelineDate = timeline[timeline.length - 1].date;
    const cacheEndTimestamp = `${cacheEndDate}T23:59:59Z`;

    if (cacheEndTimestamp > lastTimelineDate) {
      const lastPoint = timeline[timeline.length - 1];
      timeline.push({
        date: cacheEndTimestamp,
        staked: lastPoint.staked,
        unstaked: lastPoint.unstaked,
        locked: lastPoint.locked,
        realized_rewards: lastPoint.realized_rewards,
      });
    }
  }

  // Calculate summary
  const firstDate = timeline[0].date;
  const lastDate = timeline[timeline.length - 1].date; // Full timeline range (includes vesting extension)
  // Use the last OPERATION date (real activity), not the extended timeline date
  const lastActivityDate = operations.length > 0 ? operations[operations.length - 1].date : timeline[0].date;

  let daysActive = timeline.length;
  try {
    const firstDt = new Date(firstDate);
    const lastActivityDt = new Date(lastActivityDate);
    daysActive = Math.floor((lastActivityDt.getTime() - firstDt.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  } catch (e) {
    // Keep default
  }

  const current = addrData.current || [];
  // Use the replayed timeline value for currentStaked rather than current[0] from the
  // Python builder's address metadata.  The cache's current[0] can be inflated when
  // set_vesting events' display-only d_stake is accidentally included in the total,
  // while the JS replay correctly skips set_vesting (type 6) balance accumulation.
  const currentStaked = timeline[timeline.length - 1].staked;
  let currentUnstaked = timeline[timeline.length - 1].unstaked;
  if (protocol === 'flash-trade') {
    // Flash current = [staked, pending, withdrawn_lifetime, compound_rate, total_rewards, behavior]
    // Only pending (queue balance) counts as "Pending Unstake"; current[2] is withdrawn_lifetime
    currentUnstaked = current[1] || 0;
  } else if (current[1] !== undefined) {
    currentUnstaked = current[1];
  }
  const currentLocked = timeline[timeline.length - 1].locked;

  const summary: WalletSummary = {
    total_operations: operations.length,
    current_staked: Math.round(currentStaked * 1000000) / 1000000,
    current_unstaked: Math.round(currentUnstaked * 1000000) / 1000000,
    current_locked: Math.round(currentLocked * 1000000) / 1000000,
    realized_rewards: timeline[timeline.length - 1].realized_rewards,
    first_stake_date: firstDate,
    last_activity_date: lastActivityDate,
    days_active: daysActive,
  };

  return {
    wallet: walletAddress,
    found: true,
    date_range: [firstDate, lastDate],
    timeline,
    operations,
    summary,
  };
}

/**
 * Protocol configuration for wallet timeline
 */
export interface ProtocolConfig {
  protocol: 'defituna' | 'flash-trade';
  stakeToken: string;
  rewardToken: string;
  cachePath: string;
  supportsVesting?: boolean;
}

const PROTOCOL_CONFIGS: Record<string, ProtocolConfig> = {
  'defituna': {
    protocol: 'defituna',
    stakeToken: 'TUNA',
    rewardToken: 'SOL',
    cachePath: '/data/defituna/staker_cache.json.gz',
    supportsVesting: true,
  },
  'flash-trade': {
    protocol: 'flash-trade',
    stakeToken: 'FAF',
    rewardToken: 'USDC',
    cachePath: '/data/flash-trade/staker_cache.json.gz',
    supportsVesting: false, // Streamflow vesting model incompatible with DefiTuna visualization
  },
};

/**
 * Hook to load and parse wallet timeline from staker cache
 * Includes debouncing to prevent excessive requests during rapid input changes
 * @param walletAddress - Wallet address to look up
 * @param protocol - Protocol to use ('defituna' or 'flash-trade'), defaults to 'defituna'
 */
export function useWalletTimeline(walletAddress: string | null, protocol: 'defituna' | 'flash-trade' = 'defituna') {
  const config = PROTOCOL_CONFIGS[protocol];
  const dataPath = useBaseUrl(config.cachePath);

  const [data, setData] = useState<WalletTimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track debounce timeout
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if component is mounted (to avoid state updates after unmount)
  const isMountedRef = useRef(true);

  // Memoized load function
  const loadTimeline = useCallback(async (address: string) => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const cache = await fetchStakerCache(dataPath);

      // Parse timeline for this wallet
      const result = parseWalletTimeline(address.trim(), cache, config.protocol);

      // Filter out vesting operations when vesting is disabled
      if (result.found && result.operations && !config.supportsVesting) {
        result.operations = result.operations.filter(op => op.type !== 'set_vesting');
        if (result.summary) {
          result.summary.total_operations = result.operations.length;
        }
      }

      if (isMountedRef.current) {
        setData(result);
        if (!result.found && !result.error) {
          // Wallet simply not in cache -- not an error, let the
          // "Wallet Not Found" card render instead of the error banner.
        } else if (!result.found) {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error('Error loading wallet timeline:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
        setData(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Clear any pending debounced calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Handle empty/invalid wallet address
    if (!walletAddress || walletAddress.trim().length === 0) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Debounce the wallet lookup by 500ms to prevent excessive requests
    // while user is typing the wallet address
    debounceTimeoutRef.current = setTimeout(() => {
      loadTimeline(walletAddress.trim());
    }, 500);

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [walletAddress, loadTimeline]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { data, loading, error, config };
}
