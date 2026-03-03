import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { UserSegments } from '@site/src/hooks/useStakerConviction';

interface BehaviorPieChartProps {
  userSegments: UserSegments;
  totalUsers: number;
  currentActiveStakers?: number;
}

export default function BehaviorPieChart({
  userSegments,
  totalUsers,
  currentActiveStakers,
}: BehaviorPieChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const template = getPlotlyTemplate(colorMode === 'dark');

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
    chartName: 'Staker Reward Behavior Waterfall',
    trackClick: true,
    trackZoom: true,
  });

  const { by_behavior } = userSegments;
  const compoundOnly = by_behavior.compound_only.count;
  const mixed = by_behavior.mixed.count;
  const claimOnly = by_behavior.claim_only.count;

  const hasActiveStakers = currentActiveStakers != null && currentActiveStakers > 0;
  const withoutRewardActivity = hasActiveStakers ? currentActiveStakers - totalUsers : 0;

  const tealColor = '#00A3B4';
  const grayColor = '#9CA3AF';
  const greenColor = '#22C55E';
  const amberColor = '#F59E0B';
  const redColor = '#EF4444';

  const pctOf = (value: number, total: number): string => {
    if (total === 0) return '';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const traces: Plotly.Data[] = [];

  if (hasActiveStakers) {
    const xLabels = [
      isMobile ? 'All Active' : 'All Active\nStakers',
      isMobile ? 'No Rewards' : 'Without Reward\nActivity',
      isMobile ? 'With Rewards' : 'With Reward\nActivity',
      isMobile ? 'Compound' : 'Compound-\nonly',
      isMobile ? 'Mixed' : 'Mixed\nBehavior',
      isMobile ? 'Claim' : 'Claim-\nonly',
    ];

    // Bar heights (all positive)
    const yValues = [
      currentActiveStakers,    // pos 1: full height
      withoutRewardActivity,   // pos 2: floats at top
      totalUsers,              // pos 3: anchored to 0
      compoundOnly,            // pos 4: floats at top of bar 3
      mixed,                   // pos 5: floats below bar 4
      claimOnly,               // pos 6: anchored to 0
    ];

    // Base positions (where each bar starts)
    const baseValues = [
      0,                                          // pos 1: starts at 0
      totalUsers,                                 // pos 2: starts at totalUsers, reaches currentActiveStakers
      0,                                          // pos 3: starts at 0
      totalUsers - compoundOnly,                  // pos 4: top slice of bar 3
      totalUsers - compoundOnly - mixed,          // pos 5: below bar 4
      0,                                          // pos 6: bottom slice, anchored to 0
    ];

    const barColors = [
      tealColor, grayColor, tealColor,
      greenColor, amberColor, redColor,
    ];

    const textLabels = [
      currentActiveStakers.toLocaleString(),
      `${withoutRewardActivity.toLocaleString()} (${pctOf(withoutRewardActivity, currentActiveStakers)})`,
      totalUsers.toLocaleString(),
      `${compoundOnly.toLocaleString()} (${pctOf(compoundOnly, totalUsers)})`,
      `${mixed.toLocaleString()} (${pctOf(mixed, totalUsers)})`,
      `${claimOnly.toLocaleString()} (${pctOf(claimOnly, totalUsers)})`,
    ];

    const hoverTexts = [
      `<b>All Active Stakers</b><br>${currentActiveStakers.toLocaleString()} stakers`,
      `<b>Without Reward Activity</b><br>${withoutRewardActivity.toLocaleString()} stakers (${pctOf(withoutRewardActivity, currentActiveStakers)} of all active)`,
      `<b>With Reward Activity</b><br>${totalUsers.toLocaleString()} stakers (${pctOf(totalUsers, currentActiveStakers)} of all active)`,
      `<b>Compound-only</b><br>${compoundOnly.toLocaleString()} stakers (${pctOf(compoundOnly, totalUsers)} of reward-active)`,
      `<b>Mixed Behavior</b><br>${mixed.toLocaleString()} stakers (${pctOf(mixed, totalUsers)} of reward-active)`,
      `<b>Claim-only</b><br>${claimOnly.toLocaleString()} stakers (${pctOf(claimOnly, totalUsers)} of reward-active)`,
    ];

    traces.push({
      type: 'bar',
      x: xLabels,
      y: yValues,
      base: baseValues,
      marker: { color: barColors },
      text: textLabels,
      textposition: 'auto',
      textfont: { size: isMobile ? 10 : 12 },
      hovertemplate: '%{customdata}<extra></extra>',
      customdata: hoverTexts,
      showlegend: false,
    });
  } else {
    // Fallback: simple bar chart with just behavior breakdown
    const xLabels = [
      isMobile ? 'Compound' : 'Compound-\nonly',
      isMobile ? 'Mixed' : 'Mixed\nBehavior',
      isMobile ? 'Claim' : 'Claim-\nonly',
    ];

    traces.push({
      type: 'bar',
      x: xLabels,
      y: [compoundOnly, mixed, claimOnly],
      marker: { color: [greenColor, amberColor, redColor] },
      text: [
        `${compoundOnly.toLocaleString()} (${pctOf(compoundOnly, totalUsers)})`,
        `${mixed.toLocaleString()} (${pctOf(mixed, totalUsers)})`,
        `${claimOnly.toLocaleString()} (${pctOf(claimOnly, totalUsers)})`,
      ],
      textposition: 'auto',
      textfont: { size: isMobile ? 10 : 12 },
      hovertemplate: '<b>%{x}</b><br>%{y:,} stakers<br><extra></extra>',
      showlegend: false,
    });
  }

  // Connector lines between bars 1→2 and 1→3
  // Categorical axis maps labels to integers 0,1,2... ; bars ~0.8 wide
  const shapes: Partial<Plotly.Shape>[] = [];
  if (hasActiveStakers) {
    const connectorStyle = {
      color: 'var(--ifm-color-emphasis-400)',
      width: 1,
      dash: 'dot' as const,
    };
    // Bar 1 → Bar 2 (y = currentActiveStakers)
    shapes.push({
      type: 'line',
      x0: 0.4, x1: 0.6,
      y0: currentActiveStakers, y1: currentActiveStakers,
      xref: 'x', yref: 'y',
      line: connectorStyle,
    });
    // Bar 2 → Bar 3 (y = totalUsers, bar 2 base = bar 3 top)
    shapes.push({
      type: 'line',
      x0: 1.4, x1: 1.6,
      y0: totalUsers, y1: totalUsers,
      xref: 'x', yref: 'y',
      line: connectorStyle,
    });
    // Bar 3 → Bar 4 (y = totalUsers, bar 3 top = bar 4 top)
    shapes.push({
      type: 'line',
      x0: 2.4, x1: 2.6,
      y0: totalUsers, y1: totalUsers,
      xref: 'x', yref: 'y',
      line: connectorStyle,
    });
    // Bar 4 → Bar 5 (y = totalUsers - compoundOnly, bar 4 base = bar 5 top)
    shapes.push({
      type: 'line',
      x0: 3.4, x1: 3.6,
      y0: totalUsers - compoundOnly, y1: totalUsers - compoundOnly,
      xref: 'x', yref: 'y',
      line: connectorStyle,
    });
    // Bar 5 → Bar 6 (y = claimOnly, bar 5 base = bar 6 top)
    shapes.push({
      type: 'line',
      x0: 4.4, x1: 4.6,
      y0: totalUsers - compoundOnly - mixed, y1: totalUsers - compoundOnly - mixed,
      xref: 'x', yref: 'y',
      line: connectorStyle,
    });
  }

  const chartHeight = isMobile ? 380 : 450;

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
      <Plot
        data={traces}
        layout={{
          ...template.layout,
          title: {
            text: 'How Stakers Manage Their Rewards',
            font: { size: isMobile ? 15 : 18, weight: 600 },
          },
          hovermode: 'closest',
          xaxis: {
            ...template.layout.xaxis,
            title: '',
            tickfont: { size: isMobile ? 9 : 12 },
            showspikes: false,
          },
          yaxis: {
            ...template.layout.yaxis,
            title: isMobile ? '' : {
              text: 'Number of Stakers',
              font: { size: 14 },
            },
            tickfont: { size: isMobile ? 9 : 12 },
            showspikes: false,
            rangemode: 'tozero',
          },
          showlegend: false,
          shapes,
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: { l: 45, r: 10, t: 40, b: 70 },
          } : {
            margin: { l: 70, r: 24, t: 50, b: 80 },
          }),
          height: chartHeight,
          autosize: true,
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
          marginLeft: '16px',
          lineHeight: '1.6',
        }}>
          <div>{'\u2191'} Stakers</div>
        </div>
      )}
      {hasActiveStakers && (
        <p style={{
          color: 'var(--ifm-color-emphasis-700)',
          marginTop: '16px',
          marginBottom: 0,
          textAlign: 'center',
          marginLeft: isMobile ? '16px' : 0,
          marginRight: isMobile ? '16px' : 0,
        }}>
          <strong>{totalUsers.toLocaleString()}</strong> of <strong>{currentActiveStakers.toLocaleString()}</strong> active stakers
          ({pctOf(totalUsers, currentActiveStakers)}) actively managed rewards during the analysis period
        </p>
      )}
      {!hasActiveStakers && (
        <p style={{
          color: 'var(--ifm-color-emphasis-700)',
          marginTop: '16px',
          marginBottom: 0,
          textAlign: 'center',
          marginLeft: isMobile ? '16px' : 0,
          marginRight: isMobile ? '16px' : 0,
        }}>
          Based on <strong>{totalUsers.toLocaleString()}</strong> unique stakers
        </p>
      )}
    </div>
  );
}
