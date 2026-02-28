import React, { useEffect, useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import LoadingSpinner from '../common/LoadingSpinner';
import MetricCard from '../common/MetricCard';

interface KeyMetricsData {
  revenue_30d: {
    sol: number;
    usdc: number;
    annualized_sol: number;
    annualized_usdc: number;
  };
  market_data: {
    fdv_usd: number | null;
    tuna_price_usd: number | null;
    sol_price_usd: number | null;
  };
  metrics: {
    mcap_to_revenue_ratio: number;
    staking_apr_percent: number;
    weekly_active_wallets: number;
    percent_staked: number;
    total_staked_tuna: number;
    staking_wallets: number;
  };
  changes?: {
    revenue_30d_pct: number | null;
    annualized_revenue_pct: number | null;
    fdv_pct: number | null;
    mcap_to_revenue_pct: number | null;
    staking_apr_pct: number | null;
    weekly_active_wallets_pct: number | null;
    staking_wallets_pct: number | null;
    percent_staked_pct: number | null;
  };
}

export default function KeyMetricsOverview(): React.ReactElement {
  const [data, setData] = useState<KeyMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataUrl = useBaseUrl('/data/defituna/key_metrics.json');
  const base = useBaseUrl('/analysis/defituna/');

  useEffect(() => {
    fetch(dataUrl)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [dataUrl]);

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
        tooltip={"Total protocol revenue earned over the last 30 days. Each day's SOL revenue is converted to USD at that day's SOL price, then summed (latest SOL price: $" + (data.market_data?.sol_price_usd?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '-') + ").\nChange compares the current 30-day window to the previous 30 days."}
        link={{ label: 'Revenue by type', href: `${base}fees-revenue/tx-type-per-day` }}
      />
      <MetricCard
        title="Annualized Revenue"
        value={data.revenue_30d?.annualized_usdc}
        format="currency"
        change={data.changes?.annualized_revenue_pct}
        tooltip={"Protocol revenue projected to a full year based on the last 30 days. Each day's SOL revenue is converted at that day's SOL price, summed, then multiplied by 12 (latest SOL price: $" + (data.market_data?.sol_price_usd?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '-') + ").\nChange compares the current 30-day window to the previous 30 days."}
        link={{ label: 'Revenue by type', href: `${base}fees-revenue/tx-type-per-day` }}
      />
      <MetricCard
        title="FDV Market Cap"
        value={data.market_data?.fdv_usd}
        format="currency"
        change={data.changes?.fdv_pct}
        tooltip={"Fully diluted valuation based on total TUNA token supply at current market price. TUNA currently trades at $" + (data.market_data?.tuna_price_usd?.toFixed(4) || '-') + " per token.\nChange compares the current TUNA price to the price 30 days ago."}
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
        title="Staking APR"
        value={metrics?.staking_apr_percent}
        format="percent"
        decimals={2}
        change={data.changes?.staking_apr_pct}
        tooltip={"Estimated yearly return for staking TUNA. Calculated by annualizing the last 30 days of SOL rewards per staked TUNA divided by the current TUNA price.\nChange shows the percentage point difference vs. 30 days ago."}
        link={{ label: 'Staking APR', href: `${base}staking/staking-apr` }}
      />
      <MetricCard
        title="Active Stakers"
        value={metrics?.staking_wallets}
        format="number"
        change={data.changes?.staking_wallets_pct}
        tooltip={"Wallets currently holding staked TUNA. The count includes all addresses with an active stake position in the staking program.\nChange compares the current count to the count 30 days ago."}
        link={{ label: 'Active stakers', href: `${base}adoption/active-stakers` }}
      />
      <MetricCard
        title="TUNA Supply Staked"
        value={metrics?.percent_staked}
        format="percent"
        decimals={2}
        change={data.changes?.percent_staked_pct}
        tooltip={"Share of the total 1B TUNA token supply that is currently staked. A higher percentage indicates stronger holder conviction and reduces circulating supply.\nChange shows the percentage point difference vs. 30 days ago."}
        link={{ label: 'Staking overview', href: `${base}staking/staked-tuna` }}
      />
      <MetricCard
        title="Weekly Active Wallets"
        value={metrics?.weekly_active_wallets}
        format="number"
        change={data.changes?.weekly_active_wallets_pct}
        tooltip={"Unique wallets that interacted with the DefiTuna treasury in the last 7 days. Measures short-term protocol engagement and user activity.\nChange compares the current count to the value 30 days ago."}
        link={{ label: 'Wallet usage', href: `${base}adoption/wallet-usage` }}
      />
    </div>
  );
}
