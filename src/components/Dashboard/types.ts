/**
 * Type definitions for Treasury Analytics Dashboard
 */

export type GroupMode = 'token' | 'type' | 'pool';

export interface DailyDataPoint {
  date: string;
  daily_total: number;
  orca_sol?: number;
  fusion_sol?: number;
  other_sol?: number;
  [key: string]: string | number | undefined;
}

export interface Transaction {
  signature: string;
  timestamp: number;
  amount: number;
  label: string;
  type: string;
  mint: string;
  token_name?: string;  // Readable token name (e.g., "PUMP" instead of mint address)
  pool_id: string;
  pool_label: string;
}

export interface TopTransactionsData {
  [mintOrTypeOrPool: string]: Transaction[];
}

export interface SummaryData {
  date_range: {
    start: string;
    end: string;
    days: number;
  };
  totals: {
    wsol_direct: number;
    total_token_records: number;
    total_pool_records: number;
    total_pool_type_records: number;
    total_type_records: number;
    unique_mints: number;
    unique_pools: number;
    unique_types: number;
    unique_pool_type_pairs: number;
  };
  top_tokens_by_value: Array<{
    name: string;
    mint: string;
    total_sol: number;
  }>;
  top_pools_by_value: Array<{
    pool_id: string;
    pool_label: string;
    total_sol: number;
  }>;
  top_types_by_value: Array<{
    type: string;           // Display name (primary identifier)
    types?: string[];       // Array of technical types (for filtering)
    label?: string;         // Same as type (for consistency)
    total_sol: number;
  }>;
}

export interface DashboardControls {
  startDate: string;
  endDate: string;
  groupMode: GroupMode;
  fullRange: boolean;
  showRawTypes: boolean;
  clusterThreshold: number;
}

export interface DashboardData {
  summary: SummaryData | null;
  dailyStacked: DailyDataPoint[];
  dailyByToken: DailyDataPoint[];
  dailyByType: DailyDataPoint[];
  dailyByPool: DailyDataPoint[];
  topTransactionsToken: TopTransactionsData;
  topTransactionsType: TopTransactionsData;
  topTransactionsPool: TopTransactionsData;
  topTransactionsPoolType: TopTransactionsData;
  poolTypeSummary: any | null; // Will be defined as needed
  dailyByPoolType: DailyDataPoint[];
  loading: boolean;
  error: string | null;
}
