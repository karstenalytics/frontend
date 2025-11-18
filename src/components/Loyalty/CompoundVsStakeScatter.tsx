import React, { useRef } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { Visualizations } from '@site/src/hooks/useStakerLoyalty';

interface CompoundVsStakeScatterProps {
  visualizations: Visualizations;
}

export default function CompoundVsStakeScatter({
  visualizations,
}: CompoundVsStakeScatterProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const template = getPlotlyTemplate(colorMode === 'dark');

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Compound vs Stake Scatter',
    trackClick: true,
    trackZoom: true,
  });

  const { compound_vs_stake } = visualizations;

  // Group data by behavior type
  const compoundOnly = compound_vs_stake.filter((p) => p.behavior === 'compound_only');
  const claimOnly = compound_vs_stake.filter((p) => p.behavior === 'claim_only');
  const mixed = compound_vs_stake.filter((p) => p.behavior === 'mixed');

  // Behavior color mapping
  const behaviorColors = {
    compound_only: '#00A3B4', // Teal (accent)
    mixed: '#F59E0B', // Amber
    claim_only: '#EF4444', // Red
  };

  // Behavior labels
  const behaviorLabels = {
    compound_only: 'Compound Only',
    mixed: 'Mixed',
    claim_only: 'Claim Only',
  };

  // Helper to create trace for each behavior
  const createTrace = (
    data: typeof compoundOnly,
    behavior: keyof typeof behaviorColors,
    name: string
  ) => ({
    type: 'scatter' as const,
    mode: 'markers' as const,
    name,
    x: data.map((p) => p.compound_rate),
    y: data.map((p) => p.stake_tuna),
    marker: {
      size: data.map((p) => Math.max(8, Math.min(40, Math.sqrt(p.total_rewards_sol) * 3))),
      color: behaviorColors[behavior],
      opacity: 0.7,
      line: {
        width: 1,
        color: colorMode === 'dark' ? '#1F2A35' : '#FFFFFF',
      },
    },
    text: data.map((p) => p.address_short),
    customdata: data.map((p) => [
      p.stake_tuna.toLocaleString('en-US', { maximumFractionDigits: 0 }),
      p.compound_rate.toFixed(1),
      p.total_rewards_sol.toFixed(4),
    ]),
    hovertemplate:
      '<b>%{text}</b><br>' +
      'Stake: %{customdata[0]} TUNA<br>' +
      'Compound Rate: %{customdata[1]}%<br>' +
      'Total Rewards: %{customdata[2]} SOL<br>' +
      '<extra></extra>',
  });

  // Calculate median values for quadrant lines
  const allStakes = compound_vs_stake.map((p) => p.stake_tuna);
  const allRates = compound_vs_stake.map((p) => p.compound_rate);
  const medianStake = allStakes.sort((a, b) => a - b)[Math.floor(allStakes.length / 2)];
  const medianRate = allRates.sort((a, b) => a - b)[Math.floor(allRates.length / 2)];

  // Count whales with low compound rate (top-right quadrant - "at risk capital")
  const whales = compound_vs_stake.filter((p) => p.stake_tuna > medianStake);
  const lowCompoundWhales = whales.filter((p) => p.compound_rate < medianRate);
  const whaleCapitalAtRisk = lowCompoundWhales.reduce((sum, p) => sum + p.stake_tuna, 0);

  return (
    <div
      ref={plotRef}
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-color-emphasis-200)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: '24px',
        marginBottom: '32px',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Compound Rate vs Stake Size - The Inverse Whale Effect</h3>

      <div
        style={{
          background: 'rgba(0, 163, 180, 0.1)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--ifm-global-radius)',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <strong style={{ color: 'var(--accent)' }}>Capital at Risk</strong>
            <p style={{ margin: '8px 0 0 0', color: 'var(--ifm-color-emphasis-800)' }}>
              Large position holders (above median stake) with low compound rates represent{' '}
              <strong>
                {whaleCapitalAtRisk.toLocaleString('en-US', { maximumFractionDigits: 0 })} TUNA
              </strong>{' '}
              at risk of exit. These {lowCompoundWhales.length} wallets show weak protocol
              conviction despite significant holdings.
            </p>
          </div>
        </div>
      </div>

      <Plot
        data={[
          createTrace(compoundOnly, 'compound_only', behaviorLabels.compound_only),
          createTrace(mixed, 'mixed', behaviorLabels.mixed),
          createTrace(claimOnly, 'claim_only', behaviorLabels.claim_only),
        ]}
        layout={{
          ...template.layout,
          xaxis: {
            ...template.layout.xaxis,
            title: 'Compound Rate (%)',
            range: [-5, 105],
          },
          yaxis: {
            ...template.layout.yaxis,
            title: 'Stake Size (TUNA, log scale)',
            type: 'log',
          },
          legend: {
            ...template.layout.legend,
            orientation: 'h',
            y: -0.15,
            yanchor: 'top',
            x: 0.5,
            xanchor: 'center',
          },
          shapes: [
            // Median stake line (horizontal)
            {
              type: 'line',
              x0: -5,
              x1: 105,
              y0: medianStake,
              y1: medianStake,
              line: {
                color: colorMode === 'dark' ? '#4B5563' : '#9CA3AF',
                width: 1,
                dash: 'dot',
              },
            },
            // Median compound rate line (vertical)
            {
              type: 'line',
              x0: medianRate,
              x1: medianRate,
              y0: Math.log10(Math.min(...allStakes)),
              y1: Math.log10(Math.max(...allStakes)),
              yref: 'y',
              line: {
                color: colorMode === 'dark' ? '#4B5563' : '#9CA3AF',
                width: 1,
                dash: 'dot',
              },
            },
          ],
          annotations: [
            // Quadrant labels
            {
              x: 75,
              y: Math.log10(Math.max(...allStakes)) * 0.95,
              yref: 'y',
              text: '🐋 At-Risk Capital',
              showarrow: false,
              font: {
                size: 11,
                color: colorMode === 'dark' ? '#9CA3AF' : '#6B7280',
              },
            },
            {
              x: 25,
              y: Math.log10(Math.max(...allStakes)) * 0.95,
              yref: 'y',
              text: '💎 True Believers',
              showarrow: false,
              font: {
                size: 11,
                color: colorMode === 'dark' ? '#9CA3AF' : '#6B7280',
              },
            },
            {
              x: 25,
              y: Math.log10(Math.min(...allStakes)) * 1.05,
              yref: 'y',
              text: '🌱 Engaged Retail',
              showarrow: false,
              font: {
                size: 11,
                color: colorMode === 'dark' ? '#9CA3AF' : '#6B7280',
              },
            },
            {
              x: 75,
              y: Math.log10(Math.min(...allStakes)) * 1.05,
              yref: 'y',
              text: '📊 Yield Farmers',
              showarrow: false,
              font: {
                size: 11,
                color: colorMode === 'dark' ? '#9CA3AF' : '#6B7280',
              },
            },
          ],
          margin: { l: 80, r: 40, t: 20, b: 100 },
          height: 600,
        }}
        config={defaultPlotlyConfig}
        style={{ width: '100%' }}
      />

      <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--ifm-color-emphasis-700)' }}>
        <strong>Bubble size</strong> represents total rewards earned (SOL). Each point is an
        individual wallet with both staking position and reward activity.
      </div>
    </div>
  );
}
