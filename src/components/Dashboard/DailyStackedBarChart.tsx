import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import { buildColorMap } from '@site/src/utils/chartColors';
import ChartToggle from '@site/src/components/common/ChartToggle';
import type { DailyTypeDataPoint } from './types';

interface GroupInfo {
  displayName: string;
  types: string[];
  color: string;
}

interface DailyStackedBarChartProps {
  data: DailyTypeDataPoint[];
  visibleTypes?: string[] | null;
  onVisibilityChange?: (types: string[] | null) => void;
  onGroupInfo?: (groups: GroupInfo[]) => void;
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
  'liquidate_position_orca_sl_tp': 'Position SL/TP (Orca)',
  'tuna_increasetunalppositionfusion': 'Increase LP Position (Fusion)',
  'tuna_openandincreasetunalppositionfusion': 'Open/Increase LP (Fusion)',
  'tuna_increasetunalppositionorca': 'Increase LP Position (Orca)',
  'tuna_openandincreasetunalppositionorca': 'Open & Increase LP (Orca)',
  'liquidity_add_tuna': 'Add Liquidity (Tuna)',
  'tuna_addliquidityfusion': 'Add Liquidity (Fusion)',
  'tuna_addliquidityorca': 'Add Liquidity (Orca)',
  'tuna_openpositionwithliquidityfusion': 'Open/Increase LP (Fusion)',
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
  visibleTypes = null,
  onVisibilityChange,
  onGroupInfo,
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

  // Build all display names list (needed for visibility tracking)
  const allDisplayNames = [...top10Groups.map(g => g.displayName), ...(hasOther ? ['Other'] : [])];

  // Derive hidden set from visibility prop
  const hiddenSet = new Set(
    visibleTypes ? allDisplayNames.filter(n => !visibleTypes.includes(n)) : []
  );

  // Emit group info to parent (display name -> technical types + color mapping)
  const groupInfoRef = useRef<string>('');
  useEffect(() => {
    if (!onGroupInfo) return;
    const infos: GroupInfo[] = top10Groups.map((g) => ({
      displayName: g.displayName,
      types: g.types,
      color: typeColorMap[g.displayName] || '#888888',
    }));
    if (hasOther) {
      const otherTypes = otherGroups.flatMap(g => g.types);
      infos.push({ displayName: 'Other', types: otherTypes, color: typeColorMap['Other'] || '#6B7280' });
    }
    const key = infos.map(g => g.displayName).join(',');
    if (key !== groupInfoRef.current) {
      groupInfoRef.current = key;
      onGroupInfo(infos);
    }
  });

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

  // Build color map: liquidation types get red, others from shared palette
  const isLiquidation = (name: string) => name.startsWith('Liquidate');
  const typeColorMap = buildColorMap(
    allDisplayNames,
    'Other',
    isLiquidation,
  );

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
    const color = typeColorMap[group.displayName] || '#888888';
    const displayValues = view === 'cumulative' ? cumulativeSum(values) : values;

    const isHidden = hiddenSet.has(group.displayName);
    if (view === 'daily') {
      traces.push({
        x: uniqueDates,
        y: displayValues,
        name: group.displayName,
        type: 'bar',
        visible: isHidden ? ('legendonly' as const) : true,
        marker: { color },
        hovertemplate: `${group.displayName}: %{y:,.4f} SOL<extra></extra>`,
        customdata: Array(uniqueDates.length).fill(group.displayName),
      });
    } else {
      traces.push({
        x: uniqueDates,
        y: displayValues,
        name: group.displayName,
        type: 'scatter',
        mode: 'none',
        stackgroup: 'one',
        visible: isHidden ? ('legendonly' as const) : true,
        fillcolor: color,
        line: { width: 0, color },
        hovertemplate: `${group.displayName}: %{y:,.4f} SOL<extra></extra>`,
        customdata: Array(uniqueDates.length).fill(group.displayName),
      });
    }
  });

  // Add "Other" category
  if (hasOther && otherDailyValues) {
    const displayValues = view === 'cumulative' ? cumulativeSum(otherDailyValues) : otherDailyValues;
    const otherColor = typeColorMap['Other'] || '#6B7280';
    const otherHidden = hiddenSet.has('Other');

    if (view === 'daily') {
      traces.push({
        x: uniqueDates,
        y: displayValues,
        name: 'Other',
        type: 'bar',
        visible: otherHidden ? ('legendonly' as const) : true,
        marker: { color: otherColor },
        hovertemplate: 'Other: %{y:,.4f} SOL<extra></extra>',
        customdata: Array(uniqueDates.length).fill('Other'),
      });
    } else {
      traces.push({
        x: uniqueDates,
        y: displayValues,
        name: 'Other',
        type: 'scatter',
        mode: 'none',
        stackgroup: 'one',
        visible: otherHidden ? ('legendonly' as const) : true,
        fillcolor: otherColor,
        line: { width: 0, color: otherColor },
        hovertemplate: 'Other: %{y:,.4f} SOL<extra></extra>',
        customdata: Array(uniqueDates.length).fill('Other'),
      });
    }
  }

  // Compute max y for range scaling (only visible traces)
  const dailyTotals = uniqueDates.map((_, i) => {
    let total = 0;
    for (const { group, values } of groupDailyValues) {
      if (!hiddenSet.has(group.displayName)) total += values[i];
    }
    if (otherDailyValues && !hiddenSet.has('Other')) total += otherDailyValues[i];
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

  // Click handler: isolate type or restore all
  const handleChartClick = (event: any) => {
    if (event.points && event.points.length > 0 && onVisibilityChange) {
      const point = event.points[0];
      const clickedType = point.customdata;
      if (clickedType && clickedType !== 'Total') {
        const currentVisible = visibleTypes || allDisplayNames;
        if (currentVisible.length === 1 && currentVisible[0] === clickedType) {
          onVisibilityChange(null);
        } else {
          onVisibilityChange([clickedType]);
        }
      }
    }
  };

  // Sync legend toggle with visibility state
  const handleRestyle = (restyleData: any) => {
    if (!onVisibilityChange || !Array.isArray(restyleData) || restyleData.length < 2) return;
    const updates = restyleData[0];
    const indices: number[] = restyleData[1];
    if (!('visible' in updates)) return;

    const currentVisible = new Set(visibleTypes || [...allDisplayNames]);
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (idx >= allDisplayNames.length) continue; // skip Total trace
      const val = Array.isArray(updates.visible) ? updates.visible[i] : updates.visible;
      if (val === 'legendonly' || val === false) {
        currentVisible.delete(allDisplayNames[idx]);
      } else {
        currentVisible.add(allDisplayNames[idx]);
      }
    }

    const newVisible = currentVisible.size === allDisplayNames.length ? null : [...currentVisible];
    const oldSet = new Set(visibleTypes || allDisplayNames);
    if (currentVisible.size === oldSet.size && [...currentVisible].every(n => oldSet.has(n))) return;
    onVisibilityChange(newVisible);
  };

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
        <div style={{ flexShrink: 0 }}>
          <ChartToggle value={view} onChange={setView} options={VIEW_OPTIONS} variant="primary" />
        </div>
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
        onClick={handleChartClick}
        onRestyle={handleRestyle}
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
        Legend also filters the table: click to hide, double-click to isolate
      </div>
    </div>
  );
}
