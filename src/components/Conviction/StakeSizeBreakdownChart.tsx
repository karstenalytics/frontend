import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import ChartHeader from '@site/src/components/common/ChartHeader';
import type { UserSegments } from '@site/src/hooks/useStakerConviction';

interface StakeSizeBreakdownChartProps {
  userSegments: UserSegments;
}

export default function StakeSizeBreakdownChart({
  userSegments,
}: StakeSizeBreakdownChartProps): React.ReactElement | null {
  const { colorMode } = useColorMode();
  const template = getPlotlyTemplate(colorMode === 'dark');

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

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Conviction by Stake Size',
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

  const { by_stake_size } = userSegments;

  // If by_stake_size is not available, return null or show error
  if (!by_stake_size) {
    return null;
  }

  // Combine tier8 (>50M) and tier7 (10-50M) into a single ≥10M tier
  const combinedByStakeSize: typeof by_stake_size = { ...by_stake_size };

  if (combinedByStakeSize.tier8 && combinedByStakeSize.tier7) {
    const tier8 = combinedByStakeSize.tier8;
    const tier7 = combinedByStakeSize.tier7;

    // Create combined tier with summed values
    combinedByStakeSize.tier8 = {
      label: '≥10M',
      user_count: tier8.user_count + tier7.user_count,
      avg_compound_rate:
        tier8.user_count + tier7.user_count > 0
          ? ((tier8.avg_compound_rate * tier8.user_count + tier7.avg_compound_rate * tier7.user_count) /
             (tier8.user_count + tier7.user_count))
          : 0,
      total_staked_tuna: tier8.total_staked_tuna + tier7.total_staked_tuna,
      total_rewards: tier8.total_rewards + tier7.total_rewards,
      compound_only_users: tier8.compound_only_users + tier7.compound_only_users,
      claim_only_users: tier8.claim_only_users + tier7.claim_only_users,
      mixed_users: tier8.mixed_users + tier7.mixed_users,
    };

    // Remove tier7 since it's now combined with tier8
    delete combinedByStakeSize.tier7;
  }

  // Combine tier6 (5-10M) and tier5 (1-5M) into a single 1-10M tier
  if (combinedByStakeSize.tier6 && combinedByStakeSize.tier5) {
    const tier6 = combinedByStakeSize.tier6;
    const tier5 = combinedByStakeSize.tier5;

    // Create combined tier with summed values
    combinedByStakeSize.tier6 = {
      label: '1-10M',
      user_count: tier6.user_count + tier5.user_count,
      avg_compound_rate:
        tier6.user_count + tier5.user_count > 0
          ? ((tier6.avg_compound_rate * tier6.user_count + tier5.avg_compound_rate * tier5.user_count) /
             (tier6.user_count + tier5.user_count))
          : 0,
      total_staked_tuna: tier6.total_staked_tuna + tier5.total_staked_tuna,
      total_rewards: tier6.total_rewards + tier5.total_rewards,
      compound_only_users: tier6.compound_only_users + tier5.compound_only_users,
      claim_only_users: tier6.claim_only_users + tier5.claim_only_users,
      mixed_users: tier6.mixed_users + tier5.mixed_users,
    };

    // Remove tier5 since it's now combined with tier6
    delete combinedByStakeSize.tier5;
  }

  // Strip " TUNA" from remaining labels (chart title already shows the unit)
  for (const tier of Object.values(combinedByStakeSize)) {
    tier.label = tier.label.replace(/ ?TUNA$/, '').trim();
  }

  // Sort tiers ascending so Plotly renders tier1 (smallest) at bottom, tier8 (largest) at top
  const sortedEntries = Object.entries(combinedByStakeSize).sort((a, b) => {
    const tierA = parseInt(a[0].replace('tier', '')) || 0;
    const tierB = parseInt(b[0].replace('tier', '')) || 0;
    return tierA - tierB; // Ascending order
  });

  const labels = sortedEntries.map(([_, data]) => data.label);
  const totalRewards = sortedEntries.map(([_, data]) => data.total_rewards || 0);
  const totalStakedTuna = sortedEntries.map(([_, data]) => data.total_staked_tuna || 0);

  // Calculate percentages for each behavior type
  const compoundOnlyPct = sortedEntries.map(([_, data]) =>
    data.user_count > 0 ? (data.compound_only_users / data.user_count) * 100 : 0
  );
  const mixedPct = sortedEntries.map(([_, data]) =>
    data.user_count > 0 ? (data.mixed_users / data.user_count) * 100 : 0
  );
  const claimOnlyPct = sortedEntries.map(([_, data]) =>
    data.user_count > 0 ? (data.claim_only_users / data.user_count) * 100 : 0
  );

  // Behavior counts for hover info
  const compoundOnlyCounts = sortedEntries.map(([_, data]) => data.compound_only_users);
  const mixedCounts = sortedEntries.map(([_, data]) => data.mixed_users);
  const claimOnlyCounts = sortedEntries.map(([_, data]) => data.claim_only_users);
  const totalUsers = sortedEntries.map(([_, data]) => data.user_count);

  // Helper to format TUNA amounts
  const formatTuna = (amount: number): string => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(0)}M`;
    } else if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(0)}K`;
    }
    return amount.toFixed(0);
  };

  // Colors: green for compound, yellow for mixed, red for claim
  const compoundColor = '#22C55E';
  const mixedColor = '#F59E0B';
  const claimColor = '#EF4444';

  // Dynamic legend sizing calculations
  const numLegendItems = 3; // Compound-only, Mixed Behavior, Claim-only
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = isMobile ? 150 : 200;
  const availableWidth = effectiveWidth - (isMobile ? 50 : 80);
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;

  // Legend positioning and margins (close to chart - no bottom annotations)
  const legendY = isMobile ? -0.1 : -0.15;
  const bottomMargin = isMobile ? legendHeight + 10 : 60;

  // Chart height calculation
  // Horizontal bar chart needs height based on number of bars
  const barHeight = labels.length * (isMobile ? 50 : 60);
  const plotAreaBase = Math.max(350, barHeight);
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : Math.max(400, barHeight);

  return (
    <div
      ref={plotRef}
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: isMobile ? '16px 0px 16px 0px' : '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      <ChartHeader title="Compound Rate by Stake Size (TUNA)" plotRef={plotRef} isMobile={isMobile} />
      <Plot
        data={[
          {
            type: 'bar',
            name: 'Compound-only',
            x: compoundOnlyPct,
            y: labels,
            orientation: 'h',
            marker: {
              color: compoundColor,
            },
            text: compoundOnlyPct.map(pct => pct > 5 ? `${pct.toFixed(0)}%` : ''),
            textposition: 'inside',
            insidetextanchor: 'end',
            hovertemplate:
              '<b>Stake Tier: %{customdata.tier}</b><br>' +
              '─────────────────────<br>' +
              '<b style="color: #22C55E">●</b> Compound-only: %{customdata.count} stakers (%{x:.1f}%)<br>' +
              '<br>' +
              'Tier total: %{customdata.totalUsers} stakers<br>' +
              'Tier rewards: %{customdata.rewards} SOL<br>' +
              'Tier staked: %{customdata.staked} TUNA<br>' +
              '<extra></extra>',
            customdata: compoundOnlyPct.map((_, idx) => ({
              tier: labels[idx],
              count: compoundOnlyCounts[idx],
              totalUsers: totalUsers[idx],
              rewards: totalRewards[idx].toLocaleString(undefined, { maximumFractionDigits: 0 }),
              staked: formatTuna(totalStakedTuna[idx]),
            })),
          },
          {
            type: 'bar',
            name: 'Mixed Behavior',
            x: mixedPct,
            y: labels,
            orientation: 'h',
            marker: {
              color: mixedColor,
            },
            text: mixedPct.map(pct => pct > 5 ? `${pct.toFixed(0)}%` : ''),
            textposition: 'inside',
            insidetextanchor: 'end',
            hovertemplate:
              '<b>Stake Tier: %{customdata.tier}</b><br>' +
              '─────────────────────<br>' +
              '<b style="color: #F59E0B">●</b> Mixed Behavior: %{customdata.count} stakers (%{x:.1f}%)<br>' +
              '<br>' +
              'Tier total: %{customdata.totalUsers} stakers<br>' +
              'Tier rewards: %{customdata.rewards} SOL<br>' +
              'Tier staked: %{customdata.staked} TUNA<br>' +
              '<extra></extra>',
            customdata: mixedPct.map((_, idx) => ({
              tier: labels[idx],
              count: mixedCounts[idx],
              totalUsers: totalUsers[idx],
              rewards: totalRewards[idx].toLocaleString(undefined, { maximumFractionDigits: 0 }),
              staked: formatTuna(totalStakedTuna[idx]),
            })),
          },
          {
            type: 'bar',
            name: 'Claim-only',
            x: claimOnlyPct,
            y: labels,
            orientation: 'h',
            marker: {
              color: claimColor,
            },
            text: claimOnlyPct.map(pct => pct > 5 ? `${pct.toFixed(0)}%` : ''),
            textposition: 'inside',
            insidetextanchor: 'end',
            hovertemplate:
              '<b>Stake Tier: %{customdata.tier}</b><br>' +
              '─────────────────────<br>' +
              '<b style="color: #EF4444">●</b> Claim-only: %{customdata.count} stakers (%{x:.1f}%)<br>' +
              '<br>' +
              'Tier total: %{customdata.totalUsers} stakers<br>' +
              'Tier rewards: %{customdata.rewards} SOL<br>' +
              'Tier staked: %{customdata.staked} TUNA<br>' +
              '<extra></extra>',
            customdata: claimOnlyPct.map((_, idx) => ({
              tier: labels[idx],
              count: claimOnlyCounts[idx],
              totalUsers: totalUsers[idx],
              rewards: totalRewards[idx].toLocaleString(undefined, { maximumFractionDigits: 0 }),
              staked: formatTuna(totalStakedTuna[idx]),
            })),
          },
        ]}
        layout={{
          ...template.layout,
          title: undefined,
          barmode: 'stack',
          hovermode: 'closest',
          xaxis: {
            ...template.layout.xaxis,
            title: isMobile ? '' : {
              text: 'Wallet Distribution (%)',
              font: { size: 14 },
              standoff: 1,
            },
            range: [0, 100],
            ticksuffix: '%',
            tickfont: { size: isMobile ? 9 : 12 },
          },
          yaxis: {
            ...template.layout.yaxis,
            title: '',
            automargin: true,
            tickfont: {
              size: isMobile ? 10 : 12,
            },
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            yanchor: 'top',
            y: legendY,
            xanchor: 'center',
            x: 0.5,
            font: { size: isMobile ? 10 : 12 },
            traceorder: 'normal',
          },
          ...(isMobile ? {
            margin: {
              l: 80,
              r: 20,
              t: 10,
              b: bottomMargin,
            },
          } : {
            margin: {
              l: 160,
              r: 20,
              t: 16,
              b: bottomMargin,
            },
          }),
          height: chartHeight,
          dragmode: isMobile ? false : 'zoom',
          annotations: totalRewards.map((reward, idx) => ({
            x: 102,
            y: labels[idx],
            xref: 'x',
            yref: 'y',
            text: `${reward.toFixed(1)} SOL<br>(${totalUsers[idx]} stakers)`,
            showarrow: false,
            xanchor: 'left',
            font: {
              size: isMobile ? 9 : 10,
              color: 'var(--ifm-color-emphasis-700)',
            },
          })),
        }}
        config={{
          ...getResponsivePlotlyConfig(),
          staticPlot: false,
          scrollZoom: !isMobile,
        }}
        style={{ width: '100%', height: `${chartHeight}px` }}
        useResizeHandler={true}
      />
      {isMobile && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: '0px',
          marginLeft: '80px',
          lineHeight: '1.6',
        }}>
          <div>↑ Stake Size Tiers</div>
          <div>→ Wallet Distribution (%)</div>
        </div>
      )}
    </div>
  );
}
