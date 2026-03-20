import React, { useMemo } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import MetricCard from '@site/src/components/common/MetricCard';
import { useSolsticeData } from '@site/src/hooks/useSolsticeData';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';

function computeRollingApy(
  yieldData: { harvs_distribute_yield_usx: number }[],
  tvlData: { vault_usx_balance: number }[],
  windowDays: number,
  endIdx: number,
): number | null {
  if (endIdx < windowDays || tvlData.length < windowDays + 1) return null;
  let sumRate = 0;
  let validDays = 0;
  for (let i = endIdx - windowDays + 1; i <= endIdx; i++) {
    if (i < 1) continue;
    const vaultBalance = tvlData[i - 1]?.vault_usx_balance ?? 0;
    if (vaultBalance <= 0) continue;
    const dailyYield = yieldData[i]?.harvs_distribute_yield_usx ?? 0;
    sumRate += dailyYield / vaultBalance;
    validDays++;
  }
  if (validDays === 0) return null;
  return (sumRate / validDays) * 365 * 100;
}

export default function OverviewMetrics(): React.ReactElement {
  const { tvl, yieldPipeline, adoption, cooldownLedger, loading, error } = useSolsticeData();
  const base = useBaseUrl('/analysis/solstice/');

  const metrics = useMemo(() => {
    if (tvl.length < 8 || adoption.length < 8) return null;

    const n = tvl.length;
    const last = tvl[n - 1];
    const prev7 = tvl[n - 8];

    // USX Supply + 7d change
    const usxSupply = last.usx_supply;
    const usxChange = prev7.usx_supply > 0
      ? ((usxSupply - prev7.usx_supply) / prev7.usx_supply) * 100
      : null;

    // eUSX Supply + 7d change
    const eusxSupply = last.eusx_supply;
    const eusxChange = prev7.eusx_supply > 0
      ? ((eusxSupply - prev7.eusx_supply) / prev7.eusx_supply) * 100
      : null;

    // 30d APY + change vs prior 30d
    const apy30d = computeRollingApy(yieldPipeline, tvl, 30, n - 1);
    const apy30dPrev = n >= 61
      ? computeRollingApy(yieldPipeline, tvl, 30, n - 31)
      : null;
    const apyChange = (apy30d != null && apy30dPrev != null) ? apy30d - apy30dPrev : null;

    // Weekly active wallets + 7d vs prior 7d
    const an = adoption.length;
    let weeklyActive = 0;
    let prevWeeklyActive = 0;
    for (let i = Math.max(0, an - 7); i < an; i++) {
      weeklyActive += adoption[i].unique_active_wallets;
    }
    if (an >= 14) {
      for (let i = Math.max(0, an - 14); i < an - 7; i++) {
        prevWeeklyActive += adoption[i].unique_active_wallets;
      }
    }
    const weeklyChange = prevWeeklyActive > 0
      ? ((weeklyActive - prevWeeklyActive) / prevWeeklyActive) * 100
      : null;

    // Withdrawal queue share + 7d change
    const cn = cooldownLedger.length;
    const lastCd = cn > 0 ? cooldownLedger[cn - 1] : null;
    const prevCd = cn > 7 ? cooldownLedger[cn - 8] : null;
    const qTotal = lastCd
      ? (lastCd.cooldown_total_outstanding + lastCd.matured_not_withdrawn)
      : 0;
    const vaultUsx = last.vault_usx_balance;
    const queueShare = vaultUsx > 0 ? (qTotal / (vaultUsx + qTotal)) * 100 : null;

    const prevQTotal = prevCd
      ? (prevCd.cooldown_total_outstanding + prevCd.matured_not_withdrawn)
      : 0;
    const prevVaultUsx = prev7.vault_usx_balance;
    const prevQueueShare = prevVaultUsx > 0 ? (prevQTotal / (prevVaultUsx + prevQTotal)) * 100 : null;
    const queueChange = (queueShare != null && prevQueueShare != null)
      ? queueShare - prevQueueShare
      : null;

    return {
      usxSupply, usxChange,
      eusxSupply, eusxChange,
      apy30d, apyChange,
      weeklyActive, weeklyChange,
      queueShare, queueChange,
    };
  }, [tvl, yieldPipeline, adoption, cooldownLedger]);

  if (loading) {
    return (
      <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ifm-color-emphasis-600)' }}>
        Data not yet available. Check back after cache reload.
      </div>
    );
  }

  return (
    <div className="usage-summary-grid">
      <MetricCard
        title="USX Supply"
        value={metrics.usxSupply / 1_000_000}
        format="number"
        decimals={1}
        suffix="M"
        change={metrics.usxChange}
        tooltip={"Total USX stablecoin supply. USX is minted by depositing USDC collateral and redeemed back to USDC.\nChange shows the 7-day percentage change."}
        link={{ label: 'Supply & Unlock', href: `${base}supply` }}
      />
      <MetricCard
        title="eUSX Supply"
        value={metrics.eusxSupply / 1_000_000}
        format="number"
        decimals={1}
        suffix="M"
        change={metrics.eusxChange}
        tooltip={"Total eUSX tokens in circulation. eUSX represents locked USX positions in the YieldVault, growing in value as yield accrues.\nChange shows the 7-day percentage change."}
        link={{ label: 'Supply & Unlock', href: `${base}supply` }}
      />
      <MetricCard
        title="30d eUSX APY"
        value={metrics.apy30d}
        format="percent"
        decimals={2}
        change={metrics.apyChange}
        changeUnit="pp"
        tooltip={"Annualized yield rate based on 30-day average daily HARVS distributions into the YieldVault.\nChange compares the current 30-day APY to the value 30 days ago."}
        link={{ label: 'Yield Pipeline', href: `${base}yield-pipeline` }}
      />
      <MetricCard
        title="Weekly Active Wallets"
        value={metrics.weeklyActive}
        format="number"
        decimals={0}
        change={metrics.weeklyChange}
        tooltip={"Sum of daily unique YieldVault wallets (depositors, unlockers, withdrawers) over the last 7 days. Wallets active on multiple days are counted each day.\nChange compares to the prior 7-day period."}
        link={{ label: 'Vault Wallet Activity', href: `${base}active-wallets` }}
      />
      <MetricCard
        title="eUSX Withdrawal Queue"
        value={metrics.queueShare}
        format="percent"
        decimals={2}
        change={metrics.queueChange}
        changeUnit="pp"
        tooltip={"Share of eUSX-related USX in the withdrawal queue, combining pending and matured positions.\nChange shows the 7-day shift in percentage points."}
        link={{ label: 'Supply & Unlock', href: `${base}supply` }}
      />
    </div>
  );
}
