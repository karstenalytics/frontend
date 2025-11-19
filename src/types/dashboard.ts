/**
 * TypeScript type definitions for dashboard data structures
 * Generated based on actual JSON data files in static/data/
 */

// ============================================================================
// Common Types
// ============================================================================

export interface DateRange {
  start: string;
  end: string;
  days?: number;
}

// ============================================================================
// Summary Data (summary.json)
// ============================================================================

export interface TokenSummary {
  name: string;
  mint: string;
  total_sol: number;
}

export interface PoolSummary {
  pool_id: string;
  pool_label: string;
  total_sol: number;
}

export interface TypeSummary {
  type: string;
  types: string[];
  label: string;
  total_sol: number;
}

export interface SummaryTotals {
  wsol_direct: number;
  total_token_records: number;
  total_pool_records: number;
  total_pool_type_records: number;
  total_type_records: number;
  unique_mints: number;
  unique_pools: number;
  unique_types: number;
  unique_pool_type_pairs: number;
}

export interface SummaryData {
  date_range: DateRange;
  totals: SummaryTotals;
  top_tokens_by_value: TokenSummary[];
  top_pools_by_value: PoolSummary[];
  top_types_by_value: TypeSummary[];
}

// ============================================================================
// Daily Time Series Data
// ============================================================================

export interface DailyStackedData {
  date: string;
  daily_total: number;
  orca_sol: number;
  fusion_sol: number;
  other_sol: number;
}

export interface DailyByTokenData {
  date: string;
  mint: string;
  token_name: string;
  sol_equivalent: number;
  usd_equivalent?: number;
}

export interface DailyByTypeData {
  date: string;
  type: string;
  label: string;
  sol_equivalent: number;
  usd_equivalent?: number;
}

export interface DailyByPoolData {
  date: string;
  pool_id: string;
  pool_label: string;
  sol_equivalent: number;
  usd_equivalent?: number;
}

export interface DailyByPoolTypeData {
  date: string;
  pool_id: string;
  pool_label: string;
  type: string;
  sol_equivalent: number;
  usd_equivalent?: number;
}

// ============================================================================
// Pool Type Summary Data (pool_type_summary.json)
// ============================================================================

export interface PoolTypeBreakdown {
  type: string;
  sol_equivalent: number;
  share_of_pool: number;
  share_of_total: number;
}

export interface PoolTypeSummaryData {
  pool_id: string;
  pool_label: string;
  total_sol: number;
  share_of_total: number;
  types: PoolTypeBreakdown[];
}

// ============================================================================
// Top Transactions Data
// ============================================================================

export interface TransactionData {
  signature: string;
  timestamp: number;
  amount: number;
  label: string;
  type: string;
  mint: string;
  token_name: string;
  pool_id: string;
  pool_label: string;
}

export type TopTransactionsByToken = Record<string, TransactionData[]>;
export type TopTransactionsByPool = Record<string, TransactionData[]>;
export type TopTransactionsByType = Record<string, TransactionData[]>;

// ============================================================================
// Key Metrics Data (key_metrics.json)
// ============================================================================

export interface Revenue30d {
  sol: number;
  usdc: number;
  annualized_sol: number;
  annualized_usdc: number;
  period: string;
}

export interface MarketData {
  fdv_usd: number;
  tuna_price_sol: number;
  tuna_price_usd: number;
  sol_price_usd: number;
}

export interface Metrics {
  mcap_to_revenue_ratio: number;
  staking_apr_percent: number;
  weekly_active_wallets: number;
  percent_staked: number;
  total_staked_tuna: number;
  staking_wallets: number;
}

export interface KeyMetricsData {
  revenue_30d: Revenue30d;
  market_data: MarketData;
  metrics: Metrics;
  generated_at: string;
  date_range: DateRange;
}

// ============================================================================
// Usage Metrics Data (usage_metrics.json)
// ============================================================================

export interface UsageSummary {
  transactions_scanned: number;
  staker_unique_addresses: number;
  daily_active_unique_addresses: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface TopWallet {
  address: string;
  tx_count: number;
  days_active: number;
  first_seen: string;
  last_seen: string;
  active_weeks?: number;
}

export interface StakersData {
  daily_counts: DailyCount[];
  top_wallets: TopWallet[];
}

export interface DailyUsersData {
  daily_counts: DailyCount[];
  top_wallets: TopWallet[];
}

export interface WeeklyUsersData {
  rolling_counts: DailyCount[];
  top_wallets: TopWallet[];
}

export interface UsageMetricsData {
  generated_at: string;
  date_range: DateRange;
  summary: UsageSummary;
  stakers: StakersData;
  daily_users: DailyUsersData;
  weekly_users: WeeklyUsersData;
}

// ============================================================================
// Staker Loyalty Data (staker_loyalty.json)
// ============================================================================

export interface LoyaltySummary {
  total_users: number;
  compound_only_users: number;
  claim_only_users: number;
  mixed_users: number;
  avg_actions_per_user: number;
  median_actions_per_user: number;
}

export interface SegmentData {
  count: number;
  percentage: number;
  avg_actions?: number;
}

export interface UserSegments {
  by_behavior: Record<string, SegmentData>;
  by_reward_size: Record<string, SegmentData>;
  by_stake_size?: Record<string, SegmentData>;
}

export interface WeeklyTrend {
  week_start: string;
  week_end: string;
  compound_count: number;
  claim_count: number;
  unique_users: number;
}

export interface StakerLoyaltyData {
  generated_at: string;
  date_range: DateRange;
  summary: LoyaltySummary;
  user_segments: UserSegments;
  weekly_trends: WeeklyTrend[];
}

// ============================================================================
// APR Data (apr_data.json)
// ============================================================================

export interface AprDataPoint {
  date: string;
  reference_apr_percent: number;
  your_apr_percent: number;
  rolling_days: number;
  rolling_revenue_sol: number;
  rolling_revenue_usdc: number;
  annualized_revenue_sol: number;
  annualized_revenue_usdc: number;
  tuna_price_usd: number;
  tuna_price_source: string;
  revenue_per_tuna_usdc: number;
  daily_revenue_sol: number;
  daily_revenue_usdc: number;
  usd_sol_rate: number;
}

export interface AprSummary {
  thirty_day_average_reference_apr: number;
  thirty_day_average_your_apr: number;
  historical_average_reference_apr: number;
  historical_average_your_apr: number;
  current_reference_apr: number;
  current_your_apr: number;
}

export interface AprData {
  date_range: DateRange;
  daily_apr: AprDataPoint[];
  summary: AprSummary;
}

// ============================================================================
// Staking Balance Data (staking_tuna.json)
// ============================================================================

export interface StakingDataPoint {
  date: string;
  staked: number;
  unstaked: number;
  total: number;
  staked_delta: number;
  total_delta: number;
}

export interface TopStaker {
  address: string;
  amount: number;
  tx_count: number;
}

export interface ActiveStakersData {
  daily_counts: DailyCount[];
  top_wallets: Array<{
    address: string;
    tx_count: number;
    days_active: number;
    first_seen: string;
    last_seen: string;
  }>;
}

export interface StakingData {
  generated_at: string;
  date_range: DateRange;
  supply: {
    total: number;
    staked: number;
    unstaked: number;
    percent_staked: number;
  };
  daily: StakingDataPoint[];
  top_stakers_7d: TopStaker[];
  top_withdrawers_7d: TopStaker[];
  active_stakers?: ActiveStakersData;
}

// ============================================================================
// Wallet Timeline Data (from compressed staker_cache.json.gz)
// ============================================================================

export interface WalletActivity {
  date: string;
  balance: number;
  action?: string;
  amount?: number;
}

export interface WalletTimelineData {
  wallet_address: string;
  first_seen: string;
  last_seen: string;
  current_balance: number;
  activity: WalletActivity[];
}

// ============================================================================
// Main Dashboard Data Interface (used by useDashboardData hook)
// ============================================================================

export interface DashboardData {
  summary: SummaryData;
  dailyStacked: DailyStackedData[];
  dailyByToken: DailyByTokenData[];
  dailyByType: DailyByTypeData[];
  dailyByPool: DailyByPoolData[];
  dailyByPoolType: DailyByPoolTypeData[];
  poolTypeSummary: PoolTypeSummaryData[];
  topTokenByMint: TopTransactionsByToken;
  topPoolById: TopTransactionsByPool;
  topTypeByLabel: TopTransactionsByType;
}
