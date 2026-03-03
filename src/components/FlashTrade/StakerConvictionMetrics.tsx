import React, { useEffect, useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import LoadingSpinner from '../common/LoadingSpinner';
import MetricCard from '../common/MetricCard';

interface ConvictionData {
  compound_rate: number;
  compound_rate_faf: number;
  total_claimed_faf: number;
  changes?: {
    compound_rate_pct: number | null;
    compound_rate_faf_pct: number | null;
    claimed_faf_30d: number | null;
  };
}

export default function StakerConvictionMetrics(): React.ReactElement {
  const [data, setData] = useState<ConvictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataUrl = useBaseUrl('/data/flash-trade/staker_conviction.json');

  useEffect(() => {
    fetch(dataUrl)
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [dataUrl]);

  if (loading) {
    return (
      <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  return (
    <div className="usage-summary-grid">
      <MetricCard
        title="Compound Rate (by wallets)"
        value={data.compound_rate}
        format="percent"
        decimals={1}
        change={data.changes?.compound_rate_pct}
        tooltip={"Share of staker-epoch pairs where the wallet re-staked FAF within 7 days of claiming epoch rewards. Aggregated across all epochs.\nChange shows the percentage point difference between the latest two complete epochs."}
      />
      <MetricCard
        title="FAF Compound Rate (by amount)"
        value={data.compound_rate_faf}
        format="percent"
        decimals={1}
        change={data.changes?.compound_rate_faf_pct}
        tooltip={"Share of total distributed FAF that was re-staked within 7 days of claiming, weighted by amount rather than wallet count.\nChange shows the percentage point difference between the latest two complete epochs."}
      />
      <MetricCard
        title="FAF Claimed by Stakers"
        value={data.total_claimed_faf}
        format="number"
        change={data.changes?.claimed_faf_30d}
        changeUnit="number"
        tooltip={"Cumulative FAF claimed by stakers through monthly epoch token rewards (CollectTokenReward events) since protocol launch. Does not include USDC revenue share.\nChange shows the absolute FAF claimed in the last 30 days."}
      />
    </div>
  );
}
