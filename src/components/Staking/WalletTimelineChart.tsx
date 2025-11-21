import React, { useMemo, useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
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
  set_vesting: { color: '#EC4899', symbol: 'hexagram', name: 'Set Vesting' },
};

export default function WalletTimelineChart({ data }: WalletTimelineChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  // Mobile detection
  // Initialize with actual window size to prevent hydration mismatch
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 996 : false
  );
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 996);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

   // Helper function to truncate wallet address for display
  function truncateAddress(address: string, startChars: number = 5, endChars: number = 5): string {
    if (!address || address.length <= startChars + endChars) {
      return address;
    }
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Wallet Timeline',
    trackClick: true,
    trackZoom: true,
  });

  // Measure container width for dynamic legend sizing
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (plotRef.current) {
      const updateWidth = () => {
        setContainerWidth(plotRef.current?.offsetWidth || 0);
      };
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data.timeline || !data.operations) return null;

    const timeline = data.timeline;
    const operations = data.operations;

    // Timeline arrays
    const dates = timeline.map(p => p.date);
    const staked = timeline.map(p => p.staked);
    const locked = timeline.map(p => p.locked);
    // Check if wallet has any vesting (any non-zero locked amount)
    const hasVesting = locked.some(v => v > 0);
    // Unlocked staked = staked - locked (locked is a subset of staked)
    const unlockedStaked = timeline.map(p => Math.max(0, p.staked - p.locked));
    const unstaked = timeline.map(p => p.unstaked);
    const rewards = timeline.map(p => p.realized_rewards);

    // Group operations by type
    const opsByType: Record<string, { dates: string[]; amounts: number[]; signatures: string[]; y_positions: number[] }> = {};

    // Vertical offset multipliers per operation type to avoid overlap
    // Using smaller multipliers (closer to 1.0) to keep markers near the line
    const typeOffsets: Record<string, number> = {
      initialize: 1.000,  // On the line
      stake: 0.980,       // 2% below
      unstake: 1.020,     // 2% above
      withdraw: 0.965,    // 3.5% below
      compound: 1.010,    // 1% above
      claim: 1.015,       // 1.5% above
      set_vesting: 0.950, // 5% below
    };

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

      // Position marker at current staked balance with slight relative offset
      const baseY = timeline[idx]?.staked || 0;
      const offset = typeOffsets[op.type] || 1.0;
      opsByType[op.type].y_positions.push(baseY * offset);
    });

    return { dates, staked, locked, hasVesting, unlockedStaked, unstaked, rewards, opsByType };
  }, [data]);

  if (!chartData) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ifm-color-secondary)' }}>
        No chart data available
      </div>
    );
  }

  const { dates, staked, locked, hasVesting, unlockedStaked, unstaked, rewards, opsByType } = chartData;

  // Dynamic legend sizing calculations
  // Count legend items: 3 area traces + 1 reward line + operation types
  const numLegendItems = 3 + 1 + Object.keys(opsByType).length;

  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = isMobile ? 150 : 200;
  const availableWidth = effectiveWidth - (isMobile ? 50 : 80);
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;

  // Legend positioning and margins (close to chart - no bottom annotations)
  const legendY = isMobile ? -0.1 : -0.2;
  const bottomMargin = isMobile ? legendHeight + 10 : 100;

  // Chart height calculation
  const plotAreaBase = isMobile ? 350 : 500;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 600;

  // Build Plotly traces
  // Stack order: Locked/Vested (pink) -> Unlocked Staked (teal) -> Unstaked (gray)
  // Total = locked + unlockedStaked + unstaked = staked + unstaked
  const traces: any[] = [];

  // Only add vesting trace if wallet has vesting
  if (hasVesting) {
    traces.push({
      name: 'Staked TUNA (Vesting)',
      x: dates,
      y: locked,
      fill: 'tozeroy',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#EC4899', width: 0, shape: 'hv' },
      fillcolor: 'rgba(236, 72, 153, 0.3)',
      stackgroup: 'one',
      hovertemplate: '<b>%{x}</b><br>Staked (Vesting): %{y:,.2f} TUNA<extra></extra>',
    });
  }

  traces.push(
    // Unlocked staked area (middle) - staked TUNA that is freely available
    {
      name: 'Staked TUNA (Unlocked)',
      x: dates,
      y: unlockedStaked,
      fill: hasVesting ? 'tonexty' : 'tozeroy',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#14B8A6', width: 0, shape: 'hv' },
      fillcolor: 'rgba(20, 184, 166, 0.3)',
      stackgroup: 'one',
      hovertemplate: '<b>%{x}</b><br>Staked (Unlocked): %{y:,.2f} TUNA<extra></extra>',
    },
    // Unstaked area (top) - TUNA pending withdrawal or already withdrawn
    {
      name: 'Unstaked TUNA',
      x: dates,
      y: unstaked,
      fill: 'tonexty',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#9CA3AF', width: 0, shape: 'hv' },
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
    }
  );

  // Add operation markers (one trace per type)
  Object.entries(opsByType).forEach(([opType, opData]) => {
    const style = OPERATION_STYLES[opType] || { color: '#6B7280', symbol: 'circle', name: opType };

    // Determine units (SOL for compound/claim, TUNA for stake/unstake/withdraw/vesting)
    const unit = (opType === 'compound' || opType === 'claim') ? 'SOL' : 'TUNA';
    const decimals = (opType === 'compound' || opType === 'claim') ? 4 : 2;

    // Custom hover template - date on top line for consistency
    let hoverTemplate = `<b>%{x}</b><br>${style.name}: %{customdata:,.${decimals}f} ${unit}<extra></extra>`;
    if (opType === 'set_vesting') {
      hoverTemplate = `<b>%{x}</b><br>${style.name}<br>Locked: %{customdata:,.${decimals}f} ${unit}<extra></extra>`;
    }

    traces.push({
      name: style.name,
      x: opData.dates,
      y: opData.y_positions,
      type: 'scatter',
      mode: 'markers',
      marker: {
        color: style.color,
        size: opType === 'set_vesting' ? 12 : 10, // Slightly larger for vesting
        symbol: style.symbol,
        opacity: 0.8, // Slight transparency for overlapping markers
        line: { color: 'white', width: 2 },
      },
      customdata: opData.amounts,
      hovertemplate: hoverTemplate,
    });
  });

  const layout: any = {
    ...template.layout,
    title: {
      text: `Wallet Staking Timeline for ${truncateAddress(data.wallet)}`,
      font: { size: isMobile ? 15 : 18, weight: 600 },
    },
    xaxis: {
      ...template.layout.xaxis,
      title: isMobile ? '' : {
        text: 'Date',
        font: { size: 14 },
      },
      type: 'date',
      tickfont: { size: isMobile ? 9 : 12 },
    },
    yaxis: {
      ...template.layout.yaxis,
      title: isMobile ? '' : {
        text: 'TUNA Balance',
        font: { size: 14 },
      },
      side: 'left',
      rangemode: 'tozero',
      tickfont: { size: isMobile ? 8 : 12 },
      showgrid: true,  // Show primary grid
    },
    yaxis2: {
      title: isMobile ? '' : {
        text: 'Realized Rewards (SOL)',
        font: { size: 14, color: '#F59E0B' },
      },
      side: 'right',
      overlaying: 'y',
      rangemode: 'tozero',
      showgrid: true,  // Show yellowish grid
      gridcolor: 'rgba(245, 158, 11, 0.15)',  // Yellowish, very transparent
      gridwidth: 1,
      showline: true,
      linecolor: 'rgba(245, 158, 11, 0.3)',  // Yellowish axis line
      linewidth: 1,
      tickfont: { size: isMobile ? 8 : 12, color: '#F59E0B' },
    },
    hovermode: 'closest',
    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'top',
      y: legendY,
      xanchor: 'center',
      x: 0.5,
      font: { size: isMobile ? 10 : 12 },
    },
    ...(isMobile ? {
      margin: {
        l: 25,
        r: 25,  // Need space for secondary y-axis ticks
        t: 30,
        b: bottomMargin,
      },
    } : {
      margin: {
        l: 80,
        r: 80,
        t: 60,
        b: 100,
      },
    }),
  };

  return (
    <div
      ref={plotRef}
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: isMobile ? '16px 0px 16px 0px' : '16px',
        marginBottom: '24px',
      }}
    >
      <Plot
        data={traces}
        layout={layout}
        config={getResponsivePlotlyConfig()}
        style={{ width: '100%', height: `${chartHeight}px` }}
        useResizeHandler={true}
      />
      {isMobile && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: '0px',
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>↑ TUNA Balance (left) / Realized Rewards SOL (right)</div>
          <div>→ Date</div>
        </div>
      )}
    </div>
  );
}
