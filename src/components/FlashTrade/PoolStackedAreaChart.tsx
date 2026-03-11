import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig} from '@site/src/utils/plotlyTheme';
import { buildColorMap } from '@site/src/utils/chartColors';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';
import ChartToggle from '@site/src/components/common/ChartToggle';
import ChartHeader from '@site/src/components/common/ChartHeader';

// Per-pool bucket breakdown (new three-bucket format)
interface PoolBuckets {
  trading_fees_usdc: number;
  non_trading_fees_usdc: number;
  lp_fees_usdc: number;
  gross_fees_usdc: number;
  total_fees_usdc: number;
}

interface NewDailyPoolData {
  date: string;
  pools: Record<string, PoolBuckets>;
  totals: PoolBuckets;
  revenue?: Record<string, number>;
}

interface LegacyDailyPoolData {
  date: string;
  fees?: Record<string, number>;
  pools?: Record<string, number>;
  revenue?: Record<string, number>;
}

// Normalized internal format used for all rendering
// revenue is always present after normalization (source optional, normalize fills with {})
interface NormalizedDayData {
  date: string;
  pools: Record<string, PoolBuckets>;
  revenue: Record<string, number>;
}

interface PoolStackedAreaChartProps {
  visiblePools?: string[] | null;
  onVisibilityChange?: (visiblePools: string[] | null) => void;
  onColorsComputed?: (colorMap: Record<string, string>) => void;
}

type ViewMode = 'daily' | 'cumulative';
type MetricType = 'fees' | 'lp' | 'revenue';

// Helper to consolidate pools by removing version suffix
// Matches backend normalize_pool_name(): strips (V1/V2), (V3), (V1), (V2)
function consolidatePoolName(poolName: string): string {
  return poolName.replace(/ \(V[0-9](?:\/V[0-9])?\)$/, '');
}

// Toggle options
const VIEW_OPTIONS = [
  { value: 'daily' as ViewMode, label: 'Daily' },
  { value: 'cumulative' as ViewMode, label: 'Cumulative' }
];

const FULL_METRIC_OPTIONS = [
  { value: 'fees' as MetricType, label: 'Fees' },
  // LP Fees toggle disabled for now - bucket is hard to interpret in isolation
  // { value: 'lp' as MetricType, label: 'LP Fees' },
  { value: 'revenue' as MetricType, label: 'Revenue' },
];

const LEGACY_METRIC_OPTIONS = [
  { value: 'fees' as MetricType, label: 'Fees' },
  { value: 'revenue' as MetricType, label: 'Revenue' },
];

const METRIC_LABELS: Record<MetricType, string> = {
  fees: 'Fees',
  lp: 'LP Fees',
  revenue: 'Revenue',
};

// Format detection
function isNewFormat(day: any): day is NewDailyPoolData {
  if (!day.pools) return false;
  const firstValue = Object.values(day.pools)[0];
  return firstValue !== undefined && typeof firstValue === 'object';
}

function normalizeLegacyDay(day: LegacyDailyPoolData): NormalizedDayData {
  // Support both old "fees" key and intermediate "pools" key (flat numbers)
  const sourceData = day.fees || day.pools || {};
  const pools: Record<string, PoolBuckets> = {};
  for (const [name, value] of Object.entries(sourceData)) {
    const v = value as number;
    pools[name] = {
      trading_fees_usdc: v,
      non_trading_fees_usdc: 0,
      lp_fees_usdc: 0,
      gross_fees_usdc: v,
      total_fees_usdc: v,
    };
  }
  return {
    date: day.date,
    pools,
    revenue: day.revenue || {},
  };
}

function normalizeNewDay(day: NewDailyPoolData): NormalizedDayData {
  return {
    date: day.date,
    pools: day.pools,
    revenue: day.revenue || {},
  };
}

function getPoolMetricValue(bucket: PoolBuckets, metric: MetricType): number {
  switch (metric) {
    case 'fees': return bucket.gross_fees_usdc;
    case 'lp': return bucket.lp_fees_usdc;
    default: return 0; // revenue handled separately
  }
}

export default function PoolStackedAreaChart({
  visiblePools = null,
  onVisibilityChange,
  onColorsComputed,
}: PoolStackedAreaChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('daily');
  const [metric, setMetric] = useState<MetricType>('fees');
  const [hasThreeBuckets, setHasThreeBuckets] = useState(false);
  const [normalizedDays, setNormalizedDays] = useState<NormalizedDayData[]>([]);

  // Mobile detection
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
  const colorMapRef = useRef<Record<string, string>>({});

  // Container width measurement for dynamic legend sizing
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

  // Fetch and normalize data
  useEffect(() => {
    fetch('/data/flash-trade/daily_by_pool.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load pool data');
        return res.json();
      })
      .then(data => {
        const days: any[] = data.days || [];
        if (days.length === 0) {
          setNormalizedDays([]);
          setHasThreeBuckets(false);
          setLoading(false);
          return;
        }

        const threeBucket = isNewFormat(days[0]);
        setHasThreeBuckets(threeBucket);

        const normalized = days.map((day: any) =>
          threeBucket ? normalizeNewDay(day) : normalizeLegacyDay(day)
        );
        setNormalizedDays(normalized);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Reset metric to 'fees' if three-bucket data is unavailable and a bucket metric is selected
  useEffect(() => {
    if (!hasThreeBuckets && metric === 'lp') {
      setMetric('fees');
    }
  }, [hasThreeBuckets, metric]);

  if (loading) {
    return <LoadingSpinner />;
  }

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

  if (normalizedDays.length === 0) {
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

  // Extract dates
  const dates = normalizedDays.map(d => d.date);

  // Consolidate pools by base name (merge V1/V2 with base) using metric-aware extraction
  const consolidatedData = normalizedDays.map(day => {
    const consolidated: Record<string, number> = {};
    if (metric === 'revenue') {
      Object.entries(day.revenue).forEach(([poolName, value]) => {
        const baseName = consolidatePoolName(poolName);
        consolidated[baseName] = (consolidated[baseName] || 0) + value;
      });
    } else {
      Object.entries(day.pools).forEach(([poolName, bucket]) => {
        const baseName = consolidatePoolName(poolName);
        consolidated[baseName] = (consolidated[baseName] || 0) + getPoolMetricValue(bucket, metric);
      });
    }
    return { date: day.date, pools: consolidated };
  });

  // Get unique pool names sorted by total value (descending)
  const poolTotals: Record<string, number> = {};
  consolidatedData.forEach(day => {
    Object.entries(day.pools).forEach(([pool, value]) => {
      poolTotals[pool] = (poolTotals[pool] || 0) + value;
    });
  });
  const poolNames = Object.entries(poolTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  // Assign colors by revenue rank
  const colorMap = buildColorMap(poolNames);

  // Publish color map to parent (e.g., for table chip colors)
  if (JSON.stringify(colorMapRef.current) !== JSON.stringify(colorMap)) {
    colorMapRef.current = colorMap;
    if (onColorsComputed) onColorsComputed(colorMap);
  }

  // Derive which pools are hidden from visibility prop
  const hiddenSet = new Set(
    visiblePools ? poolNames.filter(p => !visiblePools.includes(p)) : []
  );

  // Calculate cumulative data if needed
  type ConsolidatedDay = { date: string; pools: Record<string, number> };
  const displayData = view === 'cumulative'
    ? consolidatedData.reduce((acc, day, idx) => {
        const cumDay: ConsolidatedDay = { date: day.date, pools: {} };
        // Iterate over ALL pool names, not just current day's pools
        // This ensures pools with $0 on a day still carry forward their cumulative value
        poolNames.forEach(pool => {
          const prevSum = idx > 0 ? acc[idx - 1].pools[pool] || 0 : 0;
          cumDay.pools[pool] = prevSum + (day.pools[pool] || 0);
        });
        acc.push(cumDay);
        return acc;
      }, [] as ConsolidatedDay[])
    : consolidatedData;

  // Calculate daily totals for tooltips (only visible pools)
  const dailyTotals = displayData.map(day => {
    let total = 0;
    for (const pool of poolNames) {
      if (!hiddenSet.has(pool)) total += (day.pools[pool] || 0);
    }
    return total;
  });

  // Create traces for each pool
  // Daily view: stacked bar chart
  // Cumulative view: stacked area chart
  const traces: Data[] = poolNames.map((poolName) => {
    const yValues = displayData.map(day => day.pools[poolName] || 0);
    const color = colorMap[poolName] || '#888888';

    if (view === 'daily') {
      // Stacked bar chart for daily
      return {
        x: dates,
        y: yValues,
        name: poolName,
        type: 'bar',
        visible: hiddenSet.has(poolName) ? ('legendonly' as const) : true,
        marker: {
          color: color,
        },
        hovertemplate: `${poolName}: $%{y:,.2f}<extra></extra>`,
        customdata: Array(dates.length).fill(poolName),
      };
    } else {
      // Stacked area chart for cumulative
      return {
        x: dates,
        y: yValues,
        name: poolName,
        type: 'scatter',
        mode: 'none',
        stackgroup: 'one',
        visible: hiddenSet.has(poolName) ? ('legendonly' as const) : true,
        fillcolor: color,
        line: { width: 0, color: color },
        hovertemplate: `${poolName}: $%{y:,.2f}<extra></extra>`,
        customdata: Array(dates.length).fill(poolName),
      };
    }
  });

  // Add invisible trace for total (shows once in unified hover)
  traces.push({
    x: dates,
    y: dailyTotals,
    name: 'Total',
    type: 'scatter',
    mode: 'none',
    hovertemplate: `<b>Total: $%{y:,.2f}</b><extra></extra>`,
    showlegend: false,
  } as Data);

  // Handle chart click - isolate clicked pool (or restore all if already isolated)
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

  // Observe Plotly restyle events (fired by native legend click/double-click)
  // and sync the table filter to match trace visibility
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
    // Avoid no-op updates
    const oldSet = new Set(visiblePools || poolNames);
    if (currentVisible.size === oldSet.size && [...currentVisible].every(p => oldSet.has(p))) return;
    onVisibilityChange(newVisible);
  };

  const metricLabel = METRIC_LABELS[metric];
  const chartTitle = view === 'daily'
    ? `Daily ${metricLabel} by Pool`
    : `Cumulative ${metricLabel} by Pool`;

  const metricOptions = hasThreeBuckets ? FULL_METRIC_OPTIONS : LEGACY_METRIC_OPTIONS;

  // Dynamic legend sizing (9 pool items)
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <ChartToggle value={view} onChange={setView} options={VIEW_OPTIONS} variant="primary" />
            <ChartToggle value={metric} onChange={setMetric} options={metricOptions} variant="secondary" />
          </div>
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
              text: `${metricLabel} (USDC)`,
              font: { size: 14 },
              standoff: 20,
            },
            tickfont: { size: isMobile ? 8 : 12 },
            tickformat: '$.2s',
            // Auto-scale y-axis to the currently displayed metric
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
          <div>{'\u2191'} {metricLabel} (USDC)</div>
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
