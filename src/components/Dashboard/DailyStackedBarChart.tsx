import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import ChartToggle from '@site/src/components/common/ChartToggle';
import type { DailyTypeDataPoint } from './types';

interface DailyStackedBarChartProps {
  data: DailyTypeDataPoint[];
}

type ViewMode = 'daily' | 'cumulative';

const VIEW_OPTIONS = [
  { value: 'daily' as ViewMode, label: 'Daily' },
  { value: 'cumulative' as ViewMode, label: 'Cumulative' },
];

// Type name mapping - technical to display names
const TYPE_DISPLAY_NAMES: Record<string, string> = {
  'liquidate_position_orca_liquidation': 'Liquidate LP Position (Orca)',
  'tuna_liquidatetunalppositionorca': 'Liquidate LP Position (Orca)',
  'fusion_collectprotocolfees': 'Collect Protocol Fees (Fusion)',
  'openpositionwithliquidity': 'Open Position w. Liq. (Orca)',
  'tuna_liquidatepositionfusion': 'Liquidate LP Position (Fusion)',
  'tuna_liquidatetunalppositionfusion': 'Liquidate LP Position (Fusion)',
  'token_transfer': 'Token Transfer',
  'compound_fees_tuna': 'Collect & Compound (Orca)',
  'tuna_collectandcompoundfeesfusion': 'Collect & Compound (Fusion)',
  'liquidate_position_orca_sl_tp': 'Liquidate SL/TP (Orca)',
  'tuna_increasetunalppositionfusion': 'Increase LP Position (Fusion)',
  'tuna_openandincreasetunalppositionfusion': 'Open & Increase LP (Fusion)',
  'tuna_increasetunalppositionorca': 'Increase LP Position (Orca)',
  'tuna_openandincreasetunalppositionorca': 'Open & Increase LP (Orca)',
  'liquidity_add_tuna': 'Add Liquidity (Tuna)',
  'tuna_addliquidityfusion': 'Add Liquidity (Fusion)',
  'tuna_addliquidityorca': 'Add Liquidity (Orca)',
  'tuna_openpositionwithliquidityfusion': 'Open Position w. Liq. (Fusion)',
  'TunaIncreasetunaspotpositionfusion': 'Increase Spot Position (Fusion)',
  'TunaOpenandincreasetunaspotpositionfusion': 'Open & Increase Spot (Fusion)',
  'TunaDecreasetunaspotpositionfusion': 'Decrease Spot Position (Fusion)',
  'TunaLiquidatetunaspotpositionfusion': 'Liquidate Spot Position (Fusion)',
  'TunaModifytunaspotpositionfusion': 'Modify Spot Position (Fusion)',
  'TunaOpentunaspotposition': 'Open Spot Position',
  'TunaOpentunaspotpositionfusion': 'Open Spot Position (Fusion)',
  'StakingInitializeposition': 'Staking Initialize Position',
  'ExcludedNonRevenue': 'Non-Revenue',
  'Unattributed': 'Unattributed',
};

// Types that should always be folded into the "Other" bucket
const FORCE_OTHER_TYPES = new Set(['token_transfer']);

function getDisplayName(technicalType: string): string {
  return TYPE_DISPLAY_NAMES[technicalType] || technicalType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function cumulativeSum(values: number[]): number[] {
  const result: number[] = [];
  let total = 0;
  for (const v of values) {
    total += v;
    result.push(total);
  }
  return result;
}

export default function DailyStackedBarChart({
  data,
}: DailyStackedBarChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);
  const [view, setView] = useState<ViewMode>('daily');

  // Detect mobile viewport
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
    chartName: 'Daily Revenue Bar',
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

  if (!data || data.length === 0) {
    return <div>No daily data available</div>;
  }

  // Data comes in "long format": [{date, type, sol_equivalent}, ...]
  // Need to transform to get unique dates and types

  // Filter out data points with zero or near-zero SOL values
  const filteredData = data.filter(item => Number(item.sol_equivalent) > 0.001);

  // Get unique dates in sorted order
  const uniqueDates = Array.from(new Set(filteredData.map(d => d.date))).sort();

  // Calculate total SOL per type across all days
  const typeTotals = new Map<string, number>();
  filteredData.forEach(item => {
    const type = String(item.type || 'Unknown');
    const sol = Number(item.sol_equivalent) || 0;
    typeTotals.set(type, (typeTotals.get(type) || 0) + sol);
  });

  // Group types by display name to combine them
  const displayNameTotals = new Map<string, { displayName: string; types: string[]; total: number }>();

  Array.from(typeTotals.entries()).forEach(([type, total]) => {
    const displayName = getDisplayName(type);
    if (displayNameTotals.has(displayName)) {
      const existing = displayNameTotals.get(displayName)!;
      existing.types.push(type);
      existing.total += total;
    } else {
      displayNameTotals.set(displayName, { displayName, types: [type], total });
    }
  });

  // Separate forced-other groups from normal groups
  const allGroups = Array.from(displayNameTotals.values()).filter(g => g.total > 0);
  const normalGroups = allGroups
    .filter(g => !g.types.every(t => FORCE_OTHER_TYPES.has(t)))
    .sort((a, b) => b.total - a.total);
  const forcedOtherGroups = allGroups.filter(g => g.types.every(t => FORCE_OTHER_TYPES.has(t)));

  // Show top 9 + "Other" = 10 total traces (if there are more than 10 types)
  // Or show all types if 10 or fewer
  const hasOverflow = normalGroups.length > 10;
  const top10Groups = hasOverflow ? normalGroups.slice(0, 9) : normalGroups.slice(0, 10);
  const overflowGroups = hasOverflow ? normalGroups.slice(9) : [];
  const otherGroups = [...overflowGroups, ...forcedOtherGroups];
  const hasOther = otherGroups.length > 0;

  // Build a map for quick lookup: date -> type -> sol_equivalent
  const dataMap = new Map<string, Map<string, number>>();
  filteredData.forEach(item => {
    const date = String(item.date);
    const type = String(item.type || 'Unknown');
    const sol = Number(item.sol_equivalent) || 0;

    if (!dataMap.has(date)) {
      dataMap.set(date, new Map());
    }
    dataMap.get(date)!.set(type, sol);
  });

  // Color palette - liquidations in red shades, others in design palette colors
  const nonRedPalette = [
    'rgba(0, 163, 180, 0.8)',    // teal (accent)
    'rgba(40, 95, 126, 0.8)',    // dark blue
    'rgba(26, 188, 156, 0.8)',   // turquoise
    'rgba(142, 68, 173, 0.8)',   // purple
    'rgba(44, 62, 80, 0.8)',     // dark gray
    'rgba(39, 174, 96, 0.8)',    // green
    'rgba(22, 160, 133, 0.8)',   // dark turquoise
    'rgba(41, 128, 185, 0.8)',   // blue
  ];

  const redPalette = [
    'rgba(239, 68, 68, 0.8)',   // red-500
    'rgba(220, 38, 38, 0.8)',   // red-600
    'rgba(185, 28, 28, 0.8)',   // red-700
  ];

  const getColor = (displayName: string, index: number): string => {
    // Only types that START with "Liquidate" get red
    if (displayName.startsWith('Liquidate')) {
      return redPalette[index % redPalette.length];
    }
    // Non-red colors from design palette (exclude orange/red-ish colors)
    return nonRedPalette[index % nonRedPalette.length];
  };

  // Calculate dynamic legend positioning based on number of items and container width
  const numLegendItems = hasOther ? top10Groups.length + 1 : top10Groups.length;

  // Use viewport width as fallback if container not yet measured
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);

  // Estimate columns based on container width and average legend item width
  // Mobile: ~130px per item (with 9px font + tight spacing), Desktop: ~250px per item
  const avgItemWidth = isMobile ? 130 : 250;
  // Progressive margin reduction for narrow viewports
  const marginSubtraction = isMobile
    ? (effectiveWidth < 420 ? 0 : 50)  // Less margin on very narrow phones
    : 80;
  const availableWidth = effectiveWidth - marginSubtraction; // Account for margins
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);

  // Each row is ~20-25px tall
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;

  // Position legend close to chart (no bottom annotations in this chart)
  const legendY = isMobile ? -0.1 : -0.2;

  // Bottom margin needs space for legend
  const bottomMargin = isMobile ? legendHeight + 10 : 80;

  // Calculate total chart height
  // Mobile: top margin + plot area + bottom margin (which includes legend)
  const plotAreaBase = isMobile ? 350 : 450;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 500;

  // Create traces for top groups + "Other"
  const traces: Data[] = [];

  // Build daily values per group first (needed for both modes)
  const groupDailyValues: { group: typeof top10Groups[0]; values: number[] }[] = [];

  top10Groups.forEach((group) => {
    const values = uniqueDates.map(date => {
      const dayData = dataMap.get(date);
      return group.types.reduce((sum, typeKey) => {
        return sum + (dayData?.get(typeKey) || 0);
      }, 0);
    });
    groupDailyValues.push({ group, values });
  });

  // Other daily values
  let otherDailyValues: number[] | null = null;
  if (hasOther) {
    otherDailyValues = uniqueDates.map(date => {
      const dayData = dataMap.get(date);
      return otherGroups.reduce((sum, group) => {
        return sum + group.types.reduce((typeSum, typeKey) => {
          return typeSum + (dayData?.get(typeKey) || 0);
        }, 0);
      }, 0);
    });
  }

  // Build traces with view-mode branching
  groupDailyValues.forEach(({ group, values }, index) => {
    const color = getColor(group.displayName, index);
    const displayValues = view === 'cumulative' ? cumulativeSum(values) : values;

    if (view === 'daily') {
      traces.push({
        x: uniqueDates,
        y: displayValues,
        name: group.displayName,
        type: 'bar',
        marker: { color },
        hovertemplate: `${group.displayName}: %{y:,.4f} SOL<extra></extra>`,
      });
    } else {
      traces.push({
        x: uniqueDates,
        y: displayValues,
        name: group.displayName,
        type: 'scatter',
        mode: 'none',
        stackgroup: 'one',
        fillcolor: color,
        line: { width: 0, color },
        hovertemplate: `${group.displayName}: %{y:,.4f} SOL<extra></extra>`,
      });
    }
  });

  // Add "Other" category
  if (hasOther && otherDailyValues) {
    const displayValues = view === 'cumulative' ? cumulativeSum(otherDailyValues) : otherDailyValues;
    const otherColor = 'rgba(156, 163, 175, 0.8)'; // gray

    if (view === 'daily') {
      traces.push({
        x: uniqueDates,
        y: displayValues,
        name: 'Other',
        type: 'bar',
        marker: { color: otherColor },
        hovertemplate: 'Other: %{y:,.4f} SOL<extra></extra>',
      });
    } else {
      traces.push({
        x: uniqueDates,
        y: displayValues,
        name: 'Other',
        type: 'scatter',
        mode: 'none',
        stackgroup: 'one',
        fillcolor: otherColor,
        line: { width: 0, color: otherColor },
        hovertemplate: 'Other: %{y:,.4f} SOL<extra></extra>',
      });
    }
  }

  // Compute max y for range scaling
  const dailyTotals = uniqueDates.map((_, i) => {
    let total = 0;
    for (const { values } of groupDailyValues) {
      total += values[i];
    }
    if (otherDailyValues) total += otherDailyValues[i];
    return total;
  });

  // Compute display totals for the tooltip total trace
  const displayTotals = view === 'cumulative' ? cumulativeSum(dailyTotals) : dailyTotals;

  // Invisible total trace for unified hover
  traces.push({
    x: uniqueDates,
    y: displayTotals,
    name: 'Total',
    type: 'scatter',
    mode: 'none',
    hovertemplate: '<b>Total: %{y:,.4f} SOL</b><extra></extra>',
    showlegend: false,
  } as Data);

  const maxY = view === 'cumulative'
    ? dailyTotals.reduce((a, b) => a + b, 0)  // total cumulative at end
    : Math.max(...dailyTotals);

  const chartTitle = view === 'daily'
    ? 'Daily Revenue by Type'
    : 'Cumulative Revenue by Type';

  const yAxisLabel = view === 'daily'
    ? 'Daily Revenue (SOL)'
    : 'Cumulative Revenue (SOL)';

  return (
    <div ref={plotRef} style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: isMobile ? '16px 0px 16px 0px' : '16px',
      marginBottom: '24px',
    }}>
      {/* Title and Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: isMobile ? '16px' : '0px',
        paddingRight: isMobile ? '16px' : '0px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: isMobile ? '15px' : '18px',
          fontWeight: 600,
        }}>
          {chartTitle}
        </h3>
        <ChartToggle value={view} onChange={setView} options={VIEW_OPTIONS} variant="primary" />
      </div>

      <Plot
        data={traces}
        layout={{
          ...template.layout,
          title: undefined,
          ...(view === 'daily' ? { barmode: 'stack' } : {}),
          xaxis: {
            ...template.layout.xaxis,
            type: 'date',
            tickangle: 0,
            title: isMobile ? '' : {
              text: 'Date (UTC)',
              font: { size: 14 },
            },
            tickfont: { size: isMobile ? 9 : 12 },
          },
          yaxis: {
            ...template.layout.yaxis,
            title: isMobile ? '' : {
              text: yAxisLabel,
              font: { size: 14 },
            },
            tickfont: { size: isMobile ? 8 : 12 },
            range: [0, maxY * 1.05],
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            yanchor: 'top',
            y: legendY,
            xanchor: 'center',
            x: 0.5,
            font: { size: isMobile ? 8 : 12 },
            ...(isMobile ? {
              tracegroupgap: 0,
              itemwidth: 20,
            } : {}),
          },
          hovermode: 'x unified',
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: {
              l: 25,
              r: 5,
              t: 10,
              b: bottomMargin,
            },
          } : {
            margin: {
              l: 60,
              r: 20,
              t: 10,
              b: 80,
            },
          }),
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
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>{'\u2191'} {yAxisLabel}</div>
          <div>{'\u2192'} Date (UTC)</div>
        </div>
      )}
    </div>
  );
}
