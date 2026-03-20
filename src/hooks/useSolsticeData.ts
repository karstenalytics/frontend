import { useState, useEffect } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export interface SolsticeYieldDay {
  date: string;
  harvs_add_yield_usx: number;
  harvs_distribute_yield_usx: number;
  eusx_transfer_in_yield_usx: number;
  cumulative_yield_usx: number;
}

export interface SolsticeTvlDay {
  date: string;
  vault_usx_balance: number;
  eusx_supply: number;
  usx_supply: number;
  usx_per_eusx: number;
  vault_usx_net_flow: number;
  eusx_supply_delta: number;
  usx_supply_delta: number;
  usx_gross_minted: number;
  usx_gross_redeemed: number;
}

export interface SolsticeKeyMetrics {
  date: string;
  daily_yield_distributed_usx: number;
  cumulative_yield_distributed_usx: number;
  vault_usx_balance: number;
  eusx_supply: number;
  usx_supply: number;
  usx_per_eusx: number;
  total_unique_depositors: number;
  total_unique_minters: number;
  daily_active_wallets: number;
  total_days_tracked: number;
}

export interface SolsticeSummary {
  protocol: string;
  address: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_transactions: number;
  cumulative_yield_distributed_usx: number;
  cumulative_lock_usx: number;
  cumulative_mint_count: number;
  vault_usx_balance: number;
  eusx_supply: number;
  usx_supply: number;
  usx_per_eusx: number;
  total_unique_depositors: number;
  total_unique_minters: number;
  total_unique_active_wallets: number;
}

export interface SolsticeCooldownDay {
  date: string;
  cooldown_1d_outstanding: number;
  cooldown_7d_outstanding: number;
  cooldown_total_outstanding: number;
  matured_not_withdrawn: number;
  eusx_supply: number;
  usx_supply: number;
}

export interface SolsticeAdoptionDay {
  date: string;
  unique_depositors: number;
  unique_unlockers: number;
  unique_withdrawers: number;
  unique_minters: number;
  unique_redeemers: number;
  unique_active_wallets: number;
  new_depositors: number;
  new_unlockers: number;
  new_withdrawers: number;
  new_minters: number;
  new_redeemers: number;
  cumulative_unique_depositors: number;
  cumulative_unique_unlockers: number;
  cumulative_unique_withdrawers: number;
  cumulative_unique_minters: number;
  cumulative_unique_redeemers: number;
  cumulative_unique_active: number;
}

export interface SolsticeWeeklyAdoption {
  date: string;
  depositors: number;
  unlockers: number;
  withdrawers: number;
  new_depositors: number;
  new_unlockers: number;
  new_withdrawers: number;
}

export interface SolsticeActiveCooldown {
  wallet: string;
  usx: number;
  duration: '1d' | '7d';
  unlock_date: string;
  maturity_ts: number;
  maturity_date: string;
  signature: string;
}

export interface SolsticeData {
  yieldPipeline: SolsticeYieldDay[];
  tvl: SolsticeTvlDay[];
  cooldownLedger: SolsticeCooldownDay[];
  activeCooldowns: SolsticeActiveCooldown[];
  adoption: SolsticeAdoptionDay[];
  weeklyAdoption: SolsticeWeeklyAdoption[];
  keyMetrics: SolsticeKeyMetrics | null;
  summary: SolsticeSummary | null;
  loading: boolean;
  error: string | null;
}

// Module-level cache
let cachedData: SolsticeData | null = null;
let loadPromise: Promise<void> | null = null;

const emptyData: SolsticeData = {
  yieldPipeline: [],
  tvl: [],
  cooldownLedger: [],
  activeCooldowns: [],
  adoption: [],
  weeklyAdoption: [],
  keyMetrics: null,
  summary: null,
  loading: true,
  error: null,
};

export function useSolsticeData(): SolsticeData {
  const basePath = useBaseUrl('/data/solstice');

  const [data, setData] = useState<SolsticeData>(() => {
    if (cachedData) return cachedData;
    return { ...emptyData };
  });

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      return;
    }

    if (loadPromise) {
      loadPromise.then(() => {
        if (cachedData) setData(cachedData);
      });
      return;
    }

    async function loadData() {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        const [yieldPipeline, tvl, cooldownLedger, activeCooldowns, adoption, weeklyAdoption, keyMetrics, summary] = await Promise.all([
          fetch(`${basePath}/daily_yield_pipeline.json`).then(r => r.json()),
          fetch(`${basePath}/daily_tvl.json`).then(r => r.json()),
          fetch(`${basePath}/daily_cooldown_ledger.json`).then(r => r.json()),
          fetch(`${basePath}/active_cooldowns.json`).then(r => r.json()),
          fetch(`${basePath}/daily_adoption.json`).then(r => r.json()),
          fetch(`${basePath}/weekly_adoption.json`).then(r => r.json()),
          fetch(`${basePath}/key_metrics.json`).then(r => r.json()),
          fetch(`${basePath}/summary.json`).then(r => r.json()),
        ]);

        const loaded: SolsticeData = {
          yieldPipeline,
          tvl,
          cooldownLedger,
          activeCooldowns,
          adoption,
          weeklyAdoption,
          keyMetrics,
          summary,
          loading: false,
          error: null,
        };

        cachedData = loaded;
        setData(loaded);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load Solstice data';
        setData(prev => ({ ...prev, loading: false, error: msg }));
      }
    }

    loadPromise = loadData().finally(() => { loadPromise = null; });
  }, [basePath]);

  return data;
}
