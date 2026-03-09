import React, { useMemo, useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import ChartHeader from '@site/src/components/common/ChartHeader';
import type { WalletTimelineData } from '@site/src/hooks/useWalletTimeline';

interface WalletTimelineChartProps {
  data: WalletTimelineData;
  stakeToken?: string;  // Default: 'TUNA'
  rewardToken?: string; // Default: 'SOL'
  supportsVesting?: boolean; // Default: true (DefiTuna has vesting, Flash.Trade doesn't)
  onZoomChange?: (range: [string, string] | null) => void; // Reports visible date range; null = full range
  zoomRange?: [string, string] | null; // Controlled zoom range from parent (e.g. reset button)
}

// Operation colors and symbols
export const OPERATION_STYLES: Record<string, { color: string; symbol: string; name: string }> = {
  initialize: { color: '#8B5CF6', symbol: 'diamond', name: 'Initialize' },
  stake: { color: '#10B981', symbol: 'circle', name: 'Stake' },
  unstake: { color: '#EF4444', symbol: 'circle', name: 'Unstake' },
  unstake_instant: { color: '#F87171', symbol: 'x', name: 'Unstake Instant' },
  compound: { color: '#3B82F6', symbol: 'triangle-up', name: 'Compound' },
  claim: { color: '#F59E0B', symbol: 'star', name: 'Claim Rewards' },  // DefiTuna: SOL rewards
  claim_usdc: { color: '#F59E0B', symbol: 'star', name: 'Claim USDC Rewards' },  // Flash.Trade: USDC rewards
  claim_faf: { color: '#A855F7', symbol: 'star', name: 'Claim FAF Rewards' },  // Flash.Trade: FAF rewards
  collect_revenue: { color: '#F59E0B', symbol: 'star', name: 'Collect Revenue' },  // Flash.Trade: USDC revenue share
  collect_token_reward: { color: '#8B5CF6', symbol: 'star', name: 'Collect Token Reward' },  // Flash.Trade: FAF token rewards
  withdraw: { color: '#F97316', symbol: 'square', name: 'Withdraw' },
  set_vesting: { color: '#EC4899', symbol: 'hexagram', name: 'Set Vesting' },
  burn_and_stake: { color: '#10B981', symbol: 'diamond', name: 'Burn & Stake' },  // TGE: burn LP + stake FAF
  burn_and_claim: { color: '#6366F1', symbol: 'diamond', name: 'Burn & Claim' },  // TGE: burn LP + claim FAF
  withdraw_unclaimed: { color: '#6B7280', symbol: 'square', name: 'Withdraw Unclaimed' },  // Protocol: sweep unclaimed reserve
  cancel_unstake: { color: '#06B6D4', symbol: 'circle', name: 'Cancel Unstake' },  // Returns FAF from queue to staked
};

export default function WalletTimelineChart({
  data,
  stakeToken = 'TUNA',
  rewardToken = 'SOL',
  supportsVesting = true,
  onZoomChange,
  zoomRange: controlledZoomRange,
}: WalletTimelineChartProps): React.ReactElement {
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

  // Track visibility of Realized Rewards (secondary axis trace)
  const [showRewards, setShowRewards] = useState(true);

  // Track current zoom range so layout stays in sync with Plotly's internal state
  const [xRange, setXRange] = useState<[string, string] | null>(null);

  // Changing uirevision forces Plotly to reset all axes (zoom, pan)
  const [uiRevision, setUiRevision] = useState(0);

  // Sync with parent-controlled zoom range (e.g. reset button)
  useEffect(() => {
    if (controlledZoomRange === null || controlledZoomRange === undefined) {
      setXRange(null);
      setUiRevision(r => r + 1);
    }
  }, [controlledZoomRange]);

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
      unstake_instant: 1.025,  // 2.5% above
      withdraw: 0.965,    // 3.5% below
      compound: 1.010,    // 1% above
      claim: 1.015,       // 1.5% above
      claim_usdc: 1.015,  // 1.5% above (same as claim)
      claim_faf: 1.025,   // 2.5% above (offset from claim_usdc)
      collect_revenue: 1.015,        // 1.5% above (same as claim)
      collect_token_reward: 1.025,   // 2.5% above
      set_vesting: 0.950, // 5% below
      burn_and_stake: 0.975, // 2.5% below (similar to stake)
      burn_and_claim: 0.960, // 4% below
      withdraw_unclaimed: 0.955, // 4.5% below
      cancel_unstake: 0.985, // 1.5% below (similar to stake)
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
  const avgItemWidth = isMobile ? 130 : 200;  // Reduced from 150 to 130 for tighter wrapping
  // Progressive margin reduction for narrow viewports
  const marginSubtraction = isMobile
    ? (effectiveWidth < 420 ? 0 : 50)  // Less margin on very narrow phones
    : 80;
  const availableWidth = effectiveWidth - marginSubtraction;
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

  // Compute aligned tick intervals so both axes share the same grid lines.
  // Uses the same niceFor() approach as wallet-usage chart.
  const axisAlignment = useMemo(() => {
    if (!chartData) return null;
    const { staked, unstaked, rewards } = chartData;

    // Primary axis max: stacked total = staked + unstaked
    const maxPrimary = Math.max(...staked.map((s, i) => s + (unstaked[i] || 0)), 0);
    // Secondary axis max: cumulative rewards
    const maxSecondary = Math.max(...rewards, 0);

    if (maxPrimary === 0 || maxSecondary === 0) return null;

    // Find the "nice" dtick for a given number of intervals
    const niceFor = (max: number, n: number) => {
      const raw = max / n;
      const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
      return ([1, 2, 2.5, 5, 10].find(v => v * mag >= raw) || 10) * mag;
    };

    // Try 4 and 5 intervals, pick the one with least wasted headroom
    const opt4p = niceFor(maxPrimary, 4);
    const opt5p = niceFor(maxPrimary, 5);
    const opt4 = { n: 4, primaryDtick: opt4p, primaryRange: opt4p * 4 };
    const opt5 = { n: 5, primaryDtick: opt5p, primaryRange: opt5p * 5 };
    const best = opt4.primaryRange <= opt5.primaryRange ? opt4 : opt5;

    const secondaryDtick = niceFor(maxSecondary, best.n);
    const secondaryRange = secondaryDtick * best.n;

    return {
      primaryDtick: best.primaryDtick,
      primaryRange: [0, best.primaryRange],
      secondaryDtick,
      secondaryRange: [0, secondaryRange],
    };
  }, [chartData]);

  // Build Plotly traces
  // Stack order: Locked/Vested (pink) -> Unlocked Staked (teal) -> Unstaked (gray)
  // Total = locked + unlockedStaked + unstaked = staked + unstaked
  const traces: any[] = [];

  // Only show vesting trace if protocol supports vesting AND wallet has locked tokens
  const showVesting = supportsVesting && hasVesting;

  if (showVesting) {
    traces.push({
      name: `Staked ${stakeToken} (Vesting)`,
      x: dates,
      y: locked,
      fill: 'tozeroy',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#EC4899', width: 0, shape: 'hv' },
      fillcolor: 'rgba(236, 72, 153, 0.3)',
      stackgroup: 'one',
      hovertemplate: `<b>%{x}</b><br>Staked (Vesting): %{y:,.2f} ${stakeToken}<extra></extra>`,
    });
  }

  // Staked area - show "(Unlocked)" suffix only if protocol supports vesting
  const stakedLabel = supportsVesting ? `Staked ${stakeToken} (Unlocked)` : `Staked ${stakeToken}`;
  const stakedHover = supportsVesting
    ? `<b>%{x}</b><br>Staked (Unlocked): %{y:,.2f} ${stakeToken}<extra></extra>`
    : `<b>%{x}</b><br>Staked: %{y:,.2f} ${stakeToken}<extra></extra>`;

  traces.push(
    // Staked area - unlocked staked tokens (or all staked if no vesting)
    {
      name: stakedLabel,
      x: dates,
      y: supportsVesting ? unlockedStaked : staked,
      fill: showVesting ? 'tonexty' : 'tozeroy',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#14B8A6', width: 0, shape: 'hv' },
      fillcolor: 'rgba(20, 184, 166, 0.3)',
      stackgroup: 'one',
      hovertemplate: stakedHover,
    },
    // Unstaked area (top) - tokens in unstake queue pending withdrawal
    {
      name: `Pending Unstake (Queued)`,
      x: dates,
      y: unstaked,
      fill: 'tonexty',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#9CA3AF', width: 0, shape: 'hv' },
      fillcolor: 'rgba(156, 163, 175, 0.3)',
      stackgroup: 'one',
      hovertemplate: `<b>%{x}</b><br>Pending Unstake (Queued): %{y:,.2f} ${stakeToken}<extra></extra>`,
    },
    // Realized rewards line (secondary Y-axis)
    {
      name: 'Realized Rewards',
      x: dates,
      y: rewards,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#F59E0B', width: 2, dash: 'dash', shape: 'hv' },
      yaxis: 'y2',
      hovertemplate: `<b>%{x}</b><br>Realized Rewards: %{y:,.4f} ${rewardToken}<br><i>(Claimed + Compounded)</i><extra></extra>`,
      visible: showRewards ? true : 'legendonly',
    }
  );

  // Add operation markers (one trace per type)
  Object.entries(opsByType).forEach(([opType, opData]) => {
    const style = OPERATION_STYLES[opType] || { color: '#6B7280', symbol: 'circle', name: opType };

    // Determine units based on operation type
    // - compound/claim/claim_usdc: reward token (SOL for DefiTuna, USDC for Flash.Trade)
    // - claim_faf: stake token (FAF) - Flash.Trade FAF rewards
    // - stake/unstake/withdraw/vesting: stake token
    const isRewardOp = opType === 'compound' || opType === 'claim' || opType === 'claim_usdc' || opType === 'collect_revenue';
    const unit = isRewardOp ? rewardToken : stakeToken;
    const decimals = isRewardOp ? 4 : 2;

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

  // Handle legend clicks to toggle Realized Rewards visibility
  // Realized Rewards is at index 2 (no vesting) or 3 (with vesting)
  const rewardsTraceIndex = showVesting ? 3 : 2;
  const handleLegendClick = (event: Readonly<any>) => {
    if (typeof event?.curveNumber === 'number' && event.curveNumber === rewardsTraceIndex) {
      setShowRewards(prev => !prev);
      return false;
    }
    return true;
  };

  const layout: any = {
    ...template.layout,
    uirevision: uiRevision,
    title: undefined,
    xaxis: {
      ...template.layout.xaxis,
      title: isMobile ? '' : {
        text: 'Date (UTC)',
        font: { size: 14 },
      },
      type: 'date',
      range: xRange || [dates[0], dates[dates.length - 1]],
      tickfont: { size: isMobile ? 9 : 12 },
    },
    yaxis: {
      ...template.layout.yaxis,
      title: isMobile ? '' : {
        text: `${stakeToken} Balance`,
        font: { size: 14 },
      },
      side: 'left',
      ...(axisAlignment ? { range: axisAlignment.primaryRange, dtick: axisAlignment.primaryDtick, tick0: 0 } : { rangemode: 'tozero' }),
      tickfont: { size: isMobile ? 8 : 12 },
      showgrid: true,
    },
    yaxis2: {
      title: showRewards && !isMobile ? {
        text: `Realized Rewards (${rewardToken})`,
        font: { size: 14, color: '#F59E0B' },
      } : '',
      side: 'right',
      overlaying: 'y',
      ...(axisAlignment ? { range: axisAlignment.secondaryRange, dtick: axisAlignment.secondaryDtick, tick0: 0 } : { rangemode: 'tozero' }),
      showgrid: false,
      showline: true,
      linecolor: 'rgba(245, 158, 11, 0.3)',
      linewidth: 1,
      tickfont: { size: isMobile ? 8 : 12, color: '#F59E0B' },
      showticklabels: showRewards,
      visible: showRewards,
    },
    hovermode: 'closest',
    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'top',
      y: legendY,
      xanchor: 'center',
      x: 0.5,
      font: { size: isMobile ? 8 : 12 },  // Reduced from 10 to 8 on mobile
      ...(isMobile ? {
        tracegroupgap: 0,  // No gap between items
        itemwidth: 20,  // Narrow icons to encourage wrapping
      } : {}),
    },
    dragmode: isMobile ? false : 'zoom',
    ...(isMobile ? {
      margin: {
        l: 25,
        r: showRewards ? 25 : 5,  // Space for secondary y-axis ticks when visible, 5px otherwise
        t: 10,
        b: bottomMargin,
      },
    } : {
      margin: {
        l: 80,
        r: showRewards ? 80 : 40,
        t: 10,
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
      <ChartHeader title={`Wallet Staking Timeline for ${truncateAddress(data.wallet)}`} plotRef={plotRef} isMobile={isMobile} />
      <Plot
        data={traces}
        layout={layout}
        config={{
          ...getResponsivePlotlyConfig(),
          staticPlot: false,
          scrollZoom: !isMobile,
        }}
        style={{ width: '100%', height: `${chartHeight}px` }}
        useResizeHandler={true}
        onLegendClick={handleLegendClick}
        onRelayout={(e) => {
          if (e['xaxis.autorange']) {
            setXRange(null);
            if (onZoomChange) onZoomChange(null);
          } else if (e['xaxis.range[0]'] && e['xaxis.range[1]']) {
            const range: [string, string] = [e['xaxis.range[0]'], e['xaxis.range[1]']];
            setXRange(range);
            if (onZoomChange) onZoomChange(range);
          }
        }}
      />
      {isMobile && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: '0px',
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>{stakeToken} Balance (left){showRewards && ` / Realized Rewards ${rewardToken} (right)`}</div>
          <div>→ Date (UTC)</div>
        </div>
      )}
      <div style={{
        fontSize: '12px',
        color: 'var(--ifm-color-secondary)',
        marginTop: '8px',
        paddingLeft: isMobile ? '16px' : '0px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '14px', height: '14px', borderRadius: '50%',
          border: '1.5px solid var(--ifm-color-secondary)',
          fontSize: '9px', fontWeight: 700, fontStyle: 'italic', lineHeight: 1, flexShrink: 0,
        }}>i</span>
        Zoom into a date range to filter the transaction table below by date
      </div>
    </div>
  );
}
