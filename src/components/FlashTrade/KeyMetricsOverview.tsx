import React, { useEffect, useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import LoadingSpinner from '../common/LoadingSpinner';
import MetricCard from '../common/MetricCard';

interface KeyMetricsData {
  fees_30d: { usdc: number; annualized_usdc: number };
  revenue_30d: {
    usdc: number;
    annualized_usdc: number;
    staker_usdc: number;
    treasury_usdc: number;
  };
  revenue_total: number;
  market_data: { faf_price_usd: number | null; fdv_usd: number | null };
  metrics: {
    active_pools: number;
    unique_traders: number;
    daily_avg_fees_usdc: number;
    staking_apr_percent: number;
    weekly_active_wallets: number;
    mcap_to_revenue_ratio: number | null;
  };
  changes?: {
    fees_30d_pct: number | null;
    revenue_30d_pct: number | null;
    annualized_revenue_pct: number | null;
    fdv_pct: number | null;
    mcap_to_revenue_pct: number | null;
    staking_apr_pct: number | null;
    weekly_active_wallets_pct: number | null;
  };
}

interface StakingMetricsData {
  active_stakers: number;
  staking_wallets: number;
  percent_staked: number;
  total_rewards_usdc: number;
  changes?: {
    active_stakers_pct: number | null;
    percent_staked_pct: number | null;
  };
}

export default function KeyMetricsOverview(): React.ReactElement {
  const [data, setData] = useState<KeyMetricsData | null>(null);
  const [stakingData, setStakingData] = useState<StakingMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const keyMetricsUrl = useBaseUrl('/data/flash-trade/key_metrics.json');
  const stakingMetricsUrl = useBaseUrl('/data/flash-trade/staking_metrics.json');
  const base = useBaseUrl('/analysis/flash-trade/');

  useEffect(() => {
    Promise.all([
      fetch(keyMetricsUrl).then(res => res.json()),
      fetch(stakingMetricsUrl).then(res => res.json()),
    ])
      .then(([keyMetrics, staking]) => {
        setData(keyMetrics);
        setStakingData(staking);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [keyMetricsUrl, stakingMetricsUrl]);

  if (loading) {
    return (
      <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ifm-color-emphasis-600)' }}>
        Data not yet available. Check back after cache reload.
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="usage-summary-grid">
      <MetricCard
        title="30d Protocol Revenue"
        value={data.revenue_30d?.usdc}
        format="currency"
        change={data.changes?.revenue_30d_pct}
        tooltip={"The protocol's share of fees after LP payouts over the last 30 days. Split 50/50 between FAF staker rewards and the protocol treasury.\nChange compares the current 30-day window to the previous 30 days."}
        link={{ label: 'Revenue by pool', href: `${base}fees-revenue/by-pool` }}
      />
      <MetricCard
        title="Annualized Revenue"
        value={data.revenue_30d?.annualized_usdc}
        format="currency"
        change={data.changes?.annualized_revenue_pct}
        tooltip={"Protocol revenue projected to a full year based on the last 30 days. Includes both FAF staker rewards and the protocol treasury.\nChange compares the current 30-day window to the previous 30 days."}
        link={{ label: 'Revenue by pool', href: `${base}fees-revenue/by-pool` }}
      />
      <MetricCard
        title="FDV Market Cap"
        value={data.market_data?.fdv_usd}
        format="currency"
        change={data.changes?.fdv_pct}
        tooltip={"Fully diluted valuation based on total FAF token supply at current market price. FAF currently trades at $" + (data.market_data?.faf_price_usd?.toFixed(4) || '-') + " per token.\nChange compares the current FAF price to the price 30 days ago."}
      />
      <MetricCard
        title="Market Cap / Revenue"
        value={metrics?.mcap_to_revenue_ratio}
        format="number"
        decimals={2}
        suffix="x"
        change={data.changes?.mcap_to_revenue_pct}
        tooltip={"Ratio of fully diluted market cap to annualized protocol revenue. A lower ratio suggests the protocol generates more revenue relative to its valuation.\nChange compares the current ratio to the ratio 30 days ago."}
      />
      <MetricCard
        title="FAF Staking APR"
        value={metrics?.staking_apr_percent}
        format="percent"
        decimals={2}
        change={data.changes?.staking_apr_pct}
        tooltip={"Estimated yearly return for staking FAF. Calculated by annualizing the last 30 days of USDC rewards per staked FAF token, divided by the current FAF market price.\nChange shows the percentage point difference vs. 30 days ago."}
        link={{ label: 'APR details', href: `${base}staking/faf-staking-apr` }}
      />
      <MetricCard
        title="Active Stakers"
        value={stakingData?.active_stakers}
        fallbackValue={stakingData?.staking_wallets}
        format="number"
        change={stakingData?.changes?.active_stakers_pct}
        tooltip={"Number of wallets currently holding staked FAF. The count increases when new wallets stake and decreases when wallets fully unstake.\nChange compares the current count to the count 30 days ago."}
        link={{ label: 'Active stakers', href: `${base}adoption/active-stakers` }}
      />
      <MetricCard
        title="FAF Supply Staked"
        value={stakingData?.percent_staked}
        format="percent"
        change={stakingData?.changes?.percent_staked_pct}
        tooltip={"Share of the total 1B FAF token supply that is currently staked. A higher percentage indicates stronger holder conviction.\nChange shows the percentage point difference vs. 30 days ago."}
        link={{ label: 'Staking overview', href: `${base}staking/stake-pool-overview` }}
      />
      <MetricCard
        title="Weekly Active Wallets"
        value={metrics?.weekly_active_wallets}
        format="number"
        change={data.changes?.weekly_active_wallets_pct}
        tooltip={"Unique wallets that executed a trade or staking action in the last 7 days. Measures short-term protocol engagement.\nChange compares the current count to the value 30 days ago."}
        link={{ label: 'Wallet usage', href: `${base}adoption/wallet-usage` }}
      />
    </div>
  );
}
