import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { buildColorMap } from '@site/src/utils/chartColors';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';
import ChartToggle from '@site/src/components/common/ChartToggle';
import ChartHeader from '@site/src/components/common/ChartHeader';

interface DailyPoolRecord {
  date: string;
  pool_id: string;
  pool_label: string;
  sol_equivalent: number;
}

interface SummaryTopPool {
  pool_id: string;
  pool_label: string;
  total_sol: number;
}

interface SummaryData {
  top_pools_by_value: SummaryTopPool[];
}

interface PoolStackedChartProps {
  visiblePools?: string[] | null;
  onVisibilityChange?: (visiblePools: string[] | null) => void;
}

type ViewMode = 'daily' | 'cumulative';

const VIEW_OPTIONS = [
  { value: 'daily' as ViewMode, label: 'Daily' },
  { value: 'cumulative' as ViewMode, label: 'Cumulative' },
];

export default function PoolStackedAreaChart({
  visiblePools = null,
  onVisibilityChange,
}: PoolStackedChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('daily');

  // Processed data: dates array and per-pool daily values
  const [dates, setDates] = useState<string[]>([]);
  const [poolNames, setPoolNames] = useState<string[]>([]);
  const [poolData, setPoolData] = useState<Record<string, number[]>>({});

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 996 : false
  );
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 996);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const plotRef = useRef<HTMLDivElement>(null);

  // Container width for dynamic legend sizing
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (plotRef.current) {
      const updateWidth = () => setContainerWidth(plotRef.current?.offsetWidth || 0);
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  const dailyByPoolUrl = useBaseUrl('/data/defituna/daily_by_pool.json');
  const summaryUrl = useBaseUrl('/data/defituna/summary.json');

  // Fetch and process data
  useEffect(() => {
    Promise.all([
      fetch(dailyByPoolUrl).then(r => {
        if (!r.ok) throw new Error('Failed to load daily pool data');
        return r.json();
      }),
      fetch(summaryUrl).then(r => {
        if (!r.ok) throw new Error('Failed to load summary data');
        return r.json();
      }),
    ])
      .then(([rawRecords, summary]: [DailyPoolRecord[], SummaryData]) => {
        // Get top pool labels from summary (first 8, excluding "Others" aggregate)
        const topPools = summary.top_pools_by_value || [];
        const topLabels = new Set<string>();
        for (const p of topPools) {
          if (p.pool_label === 'Others') continue;
          topLabels.add(p.pool_label);
          if (topLabels.size >= 8) break;
        }

        // Group raw records by date, bucketing non-top pools into "Others"
        const dateMap = new Map<string, Record<string, number>>();
        for (const rec of rawRecords) {
          if (!dateMap.has(rec.date)) {
            dateMap.set(rec.date, {});
          }
          const dayPools = dateMap.get(rec.date)!;
          const label = topLabels.has(rec.pool_label) ? rec.pool_label : 'Others';
          dayPools[label] = (dayPools[label] || 0) + rec.sol_equivalent;
        }

        // Sort dates chronologically
        const sortedDates = Array.from(dateMap.keys()).sort();

        // Build ordered pool name list: top pools in rank order, then Others
        const orderedNames: string[] = [];
        for (const p of topPools) {
          if (p.pool_label !== 'Others' && topLabels.has(p.pool_label)) {
            orderedNames.push(p.pool_label);
          }
        }
        orderedNames.push('Others');

        // Build per-pool arrays aligned with dates
        const perPool: Record<string, number[]> = {};
        for (const name of orderedNames) {
          perPool[name] = sortedDates.map(d => dateMap.get(d)?.[name] || 0);
        }

        setDates(sortedDates);
        setPoolNames(orderedNames);
        setPoolData(perPool);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [dailyByPoolUrl, summaryUrl]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-danger)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        Error loading data: {error}
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-secondary)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        No pool data available
      </div>
    );
  }

  // Derive hidden set from visibility prop
  const hiddenSet = new Set(
    visiblePools ? poolNames.filter(p => !visiblePools.includes(p)) : []
  );

  // Build display data (daily or cumulative)
  const displayData: Record<string, number[]> = {};
  if (view === 'cumulative') {
    for (const name of poolNames) {
      const daily = poolData[name];
      const cum: number[] = [];
      let total = 0;
      for (let i = 0; i < daily.length; i++) {
        total += daily[i];
        cum.push(total);
      }
      displayData[name] = cum;
    }
  } else {
    for (const name of poolNames) {
      displayData[name] = poolData[name];
    }
  }

  // Daily totals for tooltip (visible pools only)
  const dailyTotals = dates.map((_, i) => {
    let total = 0;
    for (const name of poolNames) {
      if (!hiddenSet.has(name)) total += displayData[name][i];
    }
    return total;
  });

  // Assign colors by revenue rank
  const colorMap = buildColorMap(poolNames);

  // Create Plotly traces
  const traces: Data[] = poolNames.map((poolName) => {
    const yValues = displayData[poolName];
    const color = colorMap[poolName] || '#888888';

    if (view === 'daily') {
      return {
        x: dates,
        y: yValues,
        name: poolName,
        type: 'bar',
        visible: hiddenSet.has(poolName) ? ('legendonly' as const) : true,
        marker: { color },
        hovertemplate: `${poolName}: %{y:,.4f} SOL<extra></extra>`,
        customdata: Array(dates.length).fill(poolName),
      };
    } else {
      return {
        x: dates,
        y: yValues,
        name: poolName,
        type: 'scatter',
        mode: 'none',
        stackgroup: 'one',
        visible: hiddenSet.has(poolName) ? ('legendonly' as const) : true,
        fillcolor: color,
        line: { width: 0, color },
        hovertemplate: `${poolName}: %{y:,.4f} SOL<extra></extra>`,
        customdata: Array(dates.length).fill(poolName),
      };
    }
  });

  // Invisible total trace for unified hover
  traces.push({
    x: dates,
    y: dailyTotals,
    name: 'Total',
    type: 'scatter',
    mode: 'none',
    hovertemplate: '<b>Total: %{y:,.4f} SOL</b><extra></extra>',
    showlegend: false,
  } as Data);

  // Click handler: isolate pool or restore all
  const handleChartClick = (event: any) => {
    if (event.points && event.points.length > 0 && onVisibilityChange) {
      const point = event.points[0];
      const clickedPool = point.customdata;
      if (clickedPool && clickedPool !== 'Total') {
        const currentVisible = visiblePools || poolNames;
        if (currentVisible.length === 1 && currentVisible[0] === clickedPool) {
          onVisibilityChange(null);
        } else {
          onVisibilityChange([clickedPool]);
        }
      }
    }
  };

  // Sync legend toggle with visibility state
  const handleRestyle = (data: any) => {
    if (!onVisibilityChange || !Array.isArray(data) || data.length < 2) return;
    const updates = data[0];
    const indices: number[] = data[1];
    if (!('visible' in updates)) return;

    const currentVisible = new Set(visiblePools || [...poolNames]);
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (idx >= poolNames.length) continue;
      const val = Array.isArray(updates.visible) ? updates.visible[i] : updates.visible;
      if (val === 'legendonly' || val === false) {
        currentVisible.delete(poolNames[idx]);
      } else {
        currentVisible.add(poolNames[idx]);
      }
    }

    const newVisible = currentVisible.size === poolNames.length ? null : [...currentVisible];
    const oldSet = new Set(visiblePools || poolNames);
    if (currentVisible.size === oldSet.size && [...currentVisible].every(p => oldSet.has(p))) return;
    onVisibilityChange(newVisible);
  };

  const chartTitle = view === 'daily'
    ? 'Daily Revenue by Pool'
    : 'Cumulative Revenue by Pool';

  // Dynamic legend sizing
  const numLegendItems = poolNames.length;
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = isMobile ? 130 : 250;
  const marginSubtraction = isMobile ? (effectiveWidth < 420 ? 0 : 50) : 80;
  const availableWidth = effectiveWidth - marginSubtraction;
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;
  const legendY = isMobile ? -0.1 : -0.2;
  const bottomMargin = isMobile ? legendHeight + 10 : 80;
  const plotAreaBase = isMobile ? 350 : 450;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 500;

  return (
    <div ref={plotRef} style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: isMobile ? '16px 0px 16px 0px' : '16px',
      marginBottom: '24px',
    }}>
      <ChartHeader
        title={chartTitle}
        plotRef={plotRef}
        isMobile={isMobile}
        toggle={
          <ChartToggle value={view} onChange={setView} options={VIEW_OPTIONS} variant="primary" />
        }
      />

      <Plot
        data={traces}
        layout={{
          ...template.layout,
          title: undefined,
          ...(view === 'daily' ? { barmode: 'stack', bargap: 0 } : {}),
          xaxis: {
            ...template.layout.xaxis,
            title: isMobile ? '' : {
              text: 'Date (UTC)',
              font: { size: 14 },
            },
            type: 'date',
            tickfont: { size: isMobile ? 9 : 12 },
          },
          yaxis: {
            ...template.layout.yaxis,
            title: isMobile ? '' : {
              text: 'Revenue (SOL)',
              font: { size: 14 },
              standoff: 20,
            },
            tickfont: { size: isMobile ? 8 : 12 },
            tickformat: ',.1f',
            range: [0, Math.max(...dailyTotals) * 1.05],
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            y: legendY,
            yanchor: 'top',
            x: 0.5,
            xanchor: 'center',
            font: { size: isMobile ? 8 : 12 },
            ...(isMobile ? {
              tracegroupgap: 0,
              itemwidth: 20,
            } : {}),
          },
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: { l: 25, r: 5, t: 30, b: bottomMargin },
          } : {
            margin: { l: 60, r: 10, t: 50, b: 80 },
          }),
          hovermode: 'x unified',
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
          <div>{'\u2191'} Revenue (SOL)</div>
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
