/**
 * Data validation utilities using Zod
 * Validates JSON data from API/files to ensure data integrity
 */

import { z } from 'zod';
import type {
  SummaryData,
  DailyStackedData,
  DailyByTokenData,
  DailyByTypeData,
  DailyByPoolData,
  DailyByPoolTypeData,
  PoolTypeSummaryData,
  TopTransactionsByToken,
  TopTransactionsByPool,
  TopTransactionsByType,
} from '@site/src/types/dashboard';

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const DateRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
  days: z.number().optional(),
});

const TokenSummarySchema = z.object({
  name: z.string(),
  mint: z.string(),
  total_sol: z.number(),
});

const PoolSummarySchema = z.object({
  pool_id: z.string(),
  pool_label: z.string(),
  total_sol: z.number(),
});

const TypeSummarySchema = z.object({
  type: z.string(),
  types: z.array(z.string()),
  label: z.string(),
  total_sol: z.number(),
});

const SummaryTotalsSchema = z.object({
  wsol_direct: z.number(),
  total_token_records: z.number(),
  total_pool_records: z.number(),
  total_pool_type_records: z.number(),
  total_type_records: z.number(),
  unique_mints: z.number(),
  unique_pools: z.number(),
  unique_types: z.number(),
  unique_pool_type_pairs: z.number(),
});

const SummaryDataSchema = z.object({
  date_range: DateRangeSchema,
  totals: SummaryTotalsSchema,
  top_tokens_by_value: z.array(TokenSummarySchema),
  top_pools_by_value: z.array(PoolSummarySchema),
  top_types_by_value: z.array(TypeSummarySchema),
});

const DailyStackedDataSchema = z.object({
  date: z.string(),
  daily_total: z.number(),
  orca_sol: z.number(),
  fusion_sol: z.number(),
  other_sol: z.number(),
});

const DailyByTokenDataSchema = z.object({
  date: z.string(),
  mint: z.string(),
  token_name: z.string(),
  sol_equivalent: z.number(),
  usd_equivalent: z.number().optional(),
});

const DailyByTypeDataSchema = z.object({
  date: z.string(),
  type: z.string(),
  label: z.string(),
  sol_equivalent: z.number(),
  usd_equivalent: z.number().optional(),
});

const DailyByPoolDataSchema = z.object({
  date: z.string(),
  pool_id: z.string(),
  pool_label: z.string(),
  sol_equivalent: z.number(),
  usd_equivalent: z.number().optional(),
});

const DailyByPoolTypeDataSchema = z.object({
  date: z.string(),
  pool_id: z.string(),
  pool_label: z.string(),
  type: z.string(),
  sol_equivalent: z.number(),
  usd_equivalent: z.number().optional(),
});

const PoolTypeBreakdownSchema = z.object({
  type: z.string(),
  sol_equivalent: z.number(),
  share_of_pool: z.number(),
  share_of_total: z.number(),
});

const PoolTypeSummaryDataSchema = z.object({
  pool_id: z.string(),
  pool_label: z.string(),
  total_sol: z.number(),
  share_of_total: z.number(),
  types: z.array(PoolTypeBreakdownSchema),
});

const TransactionDataSchema = z.object({
  signature: z.string(),
  timestamp: z.number(),
  amount: z.number(),
  label: z.string(),
  type: z.string(),
  mint: z.string(),
  token_name: z.string(),
  pool_id: z.string(),
  pool_label: z.string(),
});

const TopTransactionsByTokenSchema = z.record(z.string(), z.array(TransactionDataSchema));
const TopTransactionsByPoolSchema = z.record(z.string(), z.array(TransactionDataSchema));
const TopTransactionsByTypeSchema = z.record(z.string(), z.array(TransactionDataSchema));

// ============================================================================
// Validation Utility Function
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic validation function for fetching and validating JSON data
 * @param url - URL to fetch data from
 * @param schema - Zod schema to validate against
 * @returns Validation result with data or error
 */
export async function validateAndFetch<T>(
  url: string,
  schema: z.ZodType<T>
): Promise<ValidationResult<T>> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const rawData = await response.json();
    const parsed = schema.safeParse(rawData);

    if (parsed.success) {
      return {
        success: true,
        data: parsed.data,
      };
    } else {
      console.error(`Validation failed for ${url}:`, parsed.error);
      return {
        success: false,
        error: `Data validation failed: ${parsed.error.message}`,
      };
    }
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Export Schemas for Reuse
// ============================================================================

export const schemas = {
  summaryData: SummaryDataSchema,
  dailyStacked: z.array(DailyStackedDataSchema),
  dailyByToken: z.array(DailyByTokenDataSchema),
  dailyByType: z.array(DailyByTypeDataSchema),
  dailyByPool: z.array(DailyByPoolDataSchema),
  dailyByPoolType: z.array(DailyByPoolTypeDataSchema),
  poolTypeSummary: z.array(PoolTypeSummaryDataSchema),
  topTransactionsByToken: TopTransactionsByTokenSchema,
  topTransactionsByPool: TopTransactionsByPoolSchema,
  topTransactionsByType: TopTransactionsByTypeSchema,
};

// ============================================================================
// Convenience Functions for Common Data Types
// ============================================================================

export async function fetchSummaryData(url: string): Promise<ValidationResult<SummaryData>> {
  return validateAndFetch(url, schemas.summaryData);
}

export async function fetchDailyStackedData(url: string): Promise<ValidationResult<DailyStackedData[]>> {
  return validateAndFetch(url, schemas.dailyStacked);
}

export async function fetchDailyByTokenData(url: string): Promise<ValidationResult<DailyByTokenData[]>> {
  return validateAndFetch(url, schemas.dailyByToken);
}

export async function fetchDailyByTypeData(url: string): Promise<ValidationResult<DailyByTypeData[]>> {
  return validateAndFetch(url, schemas.dailyByType);
}

export async function fetchDailyByPoolData(url: string): Promise<ValidationResult<DailyByPoolData[]>> {
  return validateAndFetch(url, schemas.dailyByPool);
}

export async function fetchDailyByPoolTypeData(url: string): Promise<ValidationResult<DailyByPoolTypeData[]>> {
  return validateAndFetch(url, schemas.dailyByPoolType);
}

export async function fetchPoolTypeSummaryData(url: string): Promise<ValidationResult<PoolTypeSummaryData[]>> {
  return validateAndFetch(url, schemas.poolTypeSummary);
}

export async function fetchTopTransactionsByToken(url: string): Promise<ValidationResult<TopTransactionsByToken>> {
  return validateAndFetch(url, schemas.topTransactionsByToken);
}

export async function fetchTopTransactionsByPool(url: string): Promise<ValidationResult<TopTransactionsByPool>> {
  return validateAndFetch(url, schemas.topTransactionsByPool);
}

export async function fetchTopTransactionsByType(url: string): Promise<ValidationResult<TopTransactionsByType>> {
  return validateAndFetch(url, schemas.topTransactionsByType);
}
