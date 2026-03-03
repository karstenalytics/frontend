import React from 'react';
import type { ConvictionSummary, ConvictionChanges } from '@site/src/hooks/useStakerConviction';
import MetricCard from '../common/MetricCard';

interface ConvictionStatsProps {
  summary: ConvictionSummary;
  changes?: ConvictionChanges;
}

export default function ConvictionStats({ summary, changes }: ConvictionStatsProps): React.ReactElement {
  return (
    <div className="usage-summary-grid">
      <MetricCard
        title="Compound-Only Rate"
        value={summary.loyalty_score}
        format="percent"
        decimals={1}
        change={changes?.loyalty_score_pct}
        tooltip={"Percentage of reward-active stakers who have only compounded and never claimed. Higher values indicate stronger protocol conviction.\nChange shows the percentage point difference vs. 30 days ago."}
      />
      <MetricCard
        title="Reinvestment Rate"
        value={summary.compound_rate}
        format="percent"
        decimals={1}
        change={changes?.compound_rate_pct}
        tooltip={"Share of total SOL rewards reinvested via CompoundReward. This is amount-weighted: large claimers (whales) dominate total SOL volume, so this rate is much lower than the wallet-count-based Compound-Only Rate.\nChange shows the percentage point difference vs. 30 days ago."}
      />
    </div>
  );
}
