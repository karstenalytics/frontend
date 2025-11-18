import React, { useMemo, useRef } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { WalletTimelineData } from '@site/src/hooks/useWalletTimeline';

interface WalletTimelineChartProps {
  data: WalletTimelineData;
}

// Operation colors and symbols
const OPERATION_STYLES: Record<string, { color: string; symbol: string; name: string }> = {
  initialize: { color: '#8B5CF6', symbol: 'diamond', name: 'Initialize' },
  stake: { color: '#10B981', symbol: 'circle', name: 'Stake' },
  unstake: { color: '#EF4444', symbol: 'circle', name: 'Unstake' },
  compound: { color: '#3B82F6', symbol: 'triangle-up', name: 'Compound' },
  claim: { color: '#F59E0B', symbol: 'star', name: 'Claim Rewards' },
  withdraw: { color: '#F97316', symbol: 'square', name: 'Withdraw' },
};

export default function WalletTimelineChart({ data }: WalletTimelineChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Wallet Timeline',
    trackClick: true,
    trackZoom: true,
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data.timeline || !data.operations) return null;

    const timeline = data.timeline;
    const operations = data.operations;

    // Timeline arrays
    const dates = timeline.map(p => p.date);
    const staked = timeline.map(p => p.staked);
    const unstaked = timeline.map(p => p.unstaked);
    const rewards = timeline.map(p => p.realized_rewards);

    // Group operations by type
    const opsByType: Record<string, { dates: string[]; amounts: number[]; signatures: string[]; y_positions: number[] }> = {};

    operations.forEach((op, idx) => {
      if (!opsByType[op.type]) {
        opsByType[op.type] = {
          dates: [],
          amounts: [],
          signatures: [],
          y_positions: [],
        };
      }

      opsByType[op.type].dates.push(op.date);
      opsByType[op.type].amounts.push(op.amount);
      opsByType[op.type].signatures.push(op.signature);

      // Position marker at current staked balance for that timestamp
      const y_pos = timeline[idx]?.staked || 0;
      opsByType[op.type].y_positions.push(y_pos);
    });

    return { dates, staked, unstaked, rewards, opsByType };
  }, [data]);

  if (!chartData) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ifm-color-secondary)' }}>
        No chart data available
      </div>
    );
  }

  const { dates, staked, unstaked, rewards, opsByType } = chartData;

  // Build Plotly traces
  const traces: any[] = [
    // Staked area (bottom)
    {
      name: 'Staked TUNA',
      x: dates,
      y: staked,
      fill: 'tozeroy',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#14B8A6', width: 0 },
      fillcolor: 'rgba(20, 184, 166, 0.3)',
      stackgroup: 'one',
      hovertemplate: '<b>%{x}</b><br>Staked: %{y:,.2f} TUNA<extra></extra>',
    },
    // Unstaked area (stacked on top)
    {
      name: 'Unstaked TUNA',
      x: dates,
      y: unstaked,
      fill: 'tonexty',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#9CA3AF', width: 0 },
      fillcolor: 'rgba(156, 163, 175, 0.3)',
      stackgroup: 'one',
      hovertemplate: '<b>%{x}</b><br>Unstaked: %{y:,.2f} TUNA<extra></extra>',
    },
    // Realized rewards line (secondary Y-axis)
    {
      name: 'Realized Rewards',
      x: dates,
      y: rewards,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#F59E0B', width: 2, dash: 'dash' },
      yaxis: 'y2',
      hovertemplate: '<b>%{x}</b><br>Realized Rewards: %{y:,.4f} SOL<br><i>(Claimed + Compounded)</i><extra></extra>',
    },
  ];

  // Add operation markers (one trace per type)
  Object.entries(opsByType).forEach(([opType, opData]) => {
    const style = OPERATION_STYLES[opType] || { color: '#6B7280', symbol: 'circle', name: opType };

    // Determine units (SOL for compound/claim, TUNA for stake/unstake/withdraw)
    const unit = (opType === 'compound' || opType === 'claim') ? 'SOL' : 'TUNA';
    const decimals = (opType === 'compound' || opType === 'claim') ? 4 : 2;

    traces.push({
      name: style.name,
      x: opData.dates,
      y: opData.y_positions,
      type: 'scatter',
      mode: 'markers',
      marker: {
        color: style.color,
        size: 10,
        symbol: style.symbol,
        line: { color: 'white', width: 2 },
      },
      customdata: opData.amounts,
      hovertemplate: `<b>${style.name}</b><br>%{customdata:,.${decimals}f} ${unit}<extra></extra>`,
    });
  });

  const layout: any = {
    ...template.layout,
    title: {
      text: `Wallet Staking Timeline`,
      font: { size: 18, weight: 600 },
    },
    xaxis: {
      ...template.layout.xaxis,
      title: 'Date',
      type: 'date',
    },
    yaxis: {
      ...template.layout.yaxis,
      title: 'TUNA Balance',
      side: 'left',
      rangemode: 'tozero',
    },
    yaxis2: {
      title: 'Realized Rewards (SOL)',
      side: 'right',
      overlaying: 'y',
      rangemode: 'tozero',
      showgrid: false,
      titlefont: { color: '#F59E0B' },
      tickfont: { color: '#F59E0B' },
    },
    hovermode: 'closest',
    showlegend: true,
    legend: {
      orientation: 'h',
      y: -0.2,
      x: 0,
      xanchor: 'left',
    },
    margin: {
      l: 80,
      r: 80,
      t: 60,
      b: 100,
    },
  };

  return (
    <div
      ref={plotRef}
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: '16px',
        marginBottom: '24px',
      }}
    >
      <Plot
        data={traces}
        layout={layout}
        config={defaultPlotlyConfig}
        style={{ width: '100%', height: '600px' }}
        useResizeHandler={true}
      />
    </div>
  );
}
