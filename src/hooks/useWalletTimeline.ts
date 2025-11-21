import { useState, useEffect, useCallback, useRef } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import pako from 'pako';

/**
 * Raw event data structure from staker cache
 * Event structure: [signature, timestamp, slot, type_id, address, d_stake, d_pending, d_withdrawn, d_compounded, fee_payer, reward_sol, ...]
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
  reward_sol: number,
  ...rest: unknown[]
];

/**
 * Address data structure from staker cache
 */
interface AddressData {
  first_event: number;
  last_event: number;
  current: [staked: number, unstaked: number, withdrawn: number, compounded: number, total_rewards: number];
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
    total_wallets: number;
    total_events: number;
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
};

/**
 * Build timeline from wallet events
 * Returns [timeline, operations, vestingSchedules]
 */
function buildBalanceTimeline(events: StakerEvent[]): [TimelinePoint[], Operation[], VestingSchedule[]] {
  const timeline: TimelinePoint[] = [];
  const operations: Operation[] = [];

  let staked = 0.0;
  let unstaked = 0.0; // This is "pending" in the cache
  let realized_rewards = 0.0; // Cumulative claimed + compounded (in SOL)

  // Track ALL vesting schedules (wallet can have multiple positions, each with own vesting)
  const vestingSchedules: VestingSchedule[] = [];

  for (const event of events) {
    if (event.length < 11) continue;

    // Event structure: [signature, timestamp, slot, type_id, address, d_stake, d_pending, d_withdrawn, d_compounded, fee_payer, reward_sol, ...]
    const signature = event[0];
    const timestamp = event[1];
    const slot = event[2];
    const op_type = event[3];
    const address = event[4];
    const d_stake = event[5] || 0; // Change in staked amount (TUNA)
    const d_pending = event[6] || 0; // Change in pending/unstaked amount (TUNA)
    const d_withdrawn = event[7] || 0; // Change in withdrawn amount (TUNA)
    const d_compounded = event[8] || 0; // Amount compounded (TUNA)
    const fee_payer = event[9] || null;
    const reward_sol = event[10] || 0; // Reward in SOL (already in SOL, not lamports)

    const [type_id, type_label] = EVENT_TYPES[op_type] || ['unknown', 'Unknown'];

    // Track rewards and operation amounts
    let amount = 0.0;
    if (op_type === 0) { // Initialize position (includes initial stake)
      amount = Math.abs(d_stake);
      staked += d_stake;
      unstaked += d_pending;
    } else if (op_type === 1) { // Stake
      amount = Math.abs(d_stake);
      staked += d_stake;
      unstaked += d_pending;
    } else if (op_type === 2) { // Unstake
      amount = Math.abs(d_stake); // Show amount unstaked (positive value)
      staked += d_stake;
      unstaked += d_pending;
    } else if (op_type === 3) { // Withdraw
      amount = Math.abs(d_pending); // Show amount withdrawn (positive value)
      staked += d_stake;
      unstaked += d_pending;
    } else if (op_type === 4) { // Compound
      amount = reward_sol; // Show SOL rewards compounded
      realized_rewards += reward_sol;
      staked += d_stake;
      unstaked += d_pending;
    } else if (op_type === 5) { // Claim
      amount = reward_sol; // Show SOL rewards claimed
      realized_rewards += reward_sol;
      staked += d_stake;
      unstaked += d_pending;
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
    } else {
      // Unknown event type - still apply deltas
      staked += d_stake;
      unstaked += d_pending;
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

    timeline.push({
      date: timestamp,
      staked: Math.round(staked * 1000000) / 1000000,
      unstaked: Math.round(unstaked * 1000000) / 1000000,
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
function parseWalletTimeline(walletAddress: string, cache: StakerCache): WalletTimelineData {
  const addresses = cache.addresses || {};
  const events = cache.events || [];
  const meta = cache.meta || {};

  // Look up wallet
  if (!addresses[walletAddress]) {
    return {
      wallet: walletAddress,
      found: false,
      error: `Wallet not found in cache. Total wallets: ${Object.keys(addresses).length.toLocaleString()}`,
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

  // Build timeline
  const [timeline, operations, vestingSchedules] = buildBalanceTimeline(walletEvents);

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

  const current = addrData.current || [0, 0, 0, 0, 0];
  const currentStaked = current[0] !== undefined ? current[0] : timeline[timeline.length - 1].staked;
  const currentUnstaked = current[1] !== undefined ? current[1] : timeline[timeline.length - 1].unstaked;
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
 * Hook to load and parse wallet timeline from staker cache
 * Includes debouncing to prevent excessive requests during rapid input changes
 */
export function useWalletTimeline(walletAddress: string | null) {
  const dataPath = useBaseUrl('/data/staker_cache.json.gz');

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
      // Load compressed staker cache
      const response = await fetch(dataPath);
      if (!response.ok) {
        throw new Error(`Failed to load staker cache: ${response.statusText}`);
      }

      const compressed = await response.arrayBuffer();

      // Check compressed size (10MB limit to prevent DoS)
      const MAX_COMPRESSED_SIZE = 10 * 1024 * 1024; // 10MB
      if (compressed.byteLength > MAX_COMPRESSED_SIZE) {
        throw new Error(`Compressed file too large: ${(compressed.byteLength / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
      }

      const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });

      // Check decompressed size (50MB limit to prevent memory exhaustion)
      const MAX_DECOMPRESSED_SIZE = 50 * 1024 * 1024; // 50MB
      if (decompressed.length > MAX_DECOMPRESSED_SIZE) {
        throw new Error(`Decompressed data too large: ${(decompressed.length / 1024 / 1024).toFixed(2)}MB (max 50MB)`);
      }

      const cache = JSON.parse(decompressed);

      // Parse timeline for this wallet
      const result = parseWalletTimeline(address.trim(), cache);

      if (isMountedRef.current) {
        setData(result);
        if (!result.found) {
          setError(result.error || 'Wallet not found');
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

  return { data, loading, error };
}
