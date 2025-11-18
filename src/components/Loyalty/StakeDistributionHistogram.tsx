import React, { useRef } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { Visualizations } from '@site/src/hooks/useStakerLoyalty';

interface StakeDistributionHistogramProps {
  visualizations: Visualizations;
}

export default function StakeDistributionHistogram({
  visualizations,
}: StakeDistributionHistogramProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const template = getPlotlyTemplate(colorMode === 'dark');

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Stake Distribution',
    trackClick: true,
    trackZoom: true,
  });

  const { stake_distribution } = visualizations;

  // Prepare data for chart
  const labels = stake_distribution.map((bucket) => bucket.label);
  const counts = stake_distribution.map((bucket) => bucket.count);
  const totals = stake_distribution.map((bucket) => bucket.total_tuna);

  // Calculate total wallets and total TUNA
  const totalWallets = counts.reduce((sum, count) => sum + count, 0);
  const totalTuna = totals.reduce((sum, total) => sum + total, 0);

  // Format numbers with commas
  const formatNumber = (num: number) => num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const formatTuna = (num: number) =>
    num >= 1_000_000
      ? `${(num / 1_000_000).toFixed(1)}M`
      : num >= 1_000
        ? `${(num / 1_000).toFixed(1)}K`
        : formatNumber(num);

  // Find the largest bucket for key finding
  const largestBucket = stake_distribution.reduce(
    (max, bucket) => (bucket.count > max.count ? bucket : max),
    stake_distribution[0]
  );

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
      <h3 style={{ marginTop: 0 }}>Stake Size Distribution - Power Law Revealed</h3>

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
          <span style={{ fontSize: '24px' }}>📊</span>
          <div>
            <strong style={{ color: 'var(--accent)' }}>Distribution Pattern</strong>
            <p style={{ margin: '8px 0 0 0', color: 'var(--ifm-color-emphasis-800)' }}>
              The largest concentration is in the <strong>{largestBucket.label} TUNA</strong> range
              with <strong>{formatNumber(largestBucket.count)} wallets</strong> (
              {((largestBucket.count / totalWallets) * 100).toFixed(1)}% of total). This classic
              power law distribution shows most users hold smaller positions while a few whales
              control significant capital.
            </p>
          </div>
        </div>
      </div>

      <Plot
        data={[
          {
            type: 'bar',
            x: labels,
            y: counts,
            marker: {
              color: '#00A3B4',
              line: {
                width: 0,
              },
            },
            text: counts.map((count, idx) => {
              const percentage = ((count / totalWallets) * 100).toFixed(1);
              return `${formatNumber(count)} (${percentage}%)`;
            }),
            textposition: 'outside',
            hovertemplate:
              '<b>%{x}</b><br>' +
              'Wallets: %{y:,.0f}<br>' +
              'Total TUNA: %{customdata}<br>' +
              '<extra></extra>',
            customdata: totals.map((total) => formatTuna(total)),
          },
        ]}
        layout={{
          ...template.layout,
          xaxis: {
            ...template.layout.xaxis,
            title: 'Stake Size Range (TUNA)',
            tickangle: -45,
          },
          yaxis: {
            ...template.layout.yaxis,
            title: 'Number of Wallets',
            type: 'log',
          },
          margin: { l: 80, r: 40, t: 20, b: 120 },
          height: 500,
        }}
        config={defaultPlotlyConfig}
        style={{ width: '100%' }}
      />

      <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--ifm-color-emphasis-700)' }}>
        <strong>Total:</strong> {formatNumber(totalWallets)} wallets holding{' '}
        {formatTuna(totalTuna)} TUNA
      </div>
    </div>
  );
}
