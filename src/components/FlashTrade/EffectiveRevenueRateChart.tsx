import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { buildColorMap } from '@site/src/utils/chartColors';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';
import ChartToggle from '@site/src/components/common/ChartToggle';
import ChartHeader from '@site/src/components/common/ChartHeader';

interface WeeklyPoolEntry {
  fees_usdc: number;
  revenue_usdc: number;
  ratio: number | null;
}

interface WeeklyMetricsWeek {
  week_start: string;
  week_end: string;
  iso_week: string;
  is_partial: boolean;
  pools: Record<string, WeeklyPoolEntry>;
  totals: WeeklyPoolEntry;
}

interface WeeklyPoolMetrics {
  weeks: WeeklyMetricsWeek[];
}

type WindowSize = 1 | 2 | 4 | 8 | 0;

const WINDOW_OPTIONS = [
  { value: 1 as WindowSize, label: '1-Week' },
  { value: 4 as WindowSize, label: '4-Week' },
];

// Compute Wednesday midpoint for a week starting on Monday
function weekMidpoint(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 2);
  return d.toISOString().slice(0, 10);
}

// Compute trailing rolling ratio: sum(revenue over window) / sum(fees over window)
// windowSize=0 means cumulative (all preceding weeks)
function computeRollingRatios(
  weeks: WeeklyMetricsWeek[],
  poolNames: string[],
  windowSize: number,
): { poolRatios: Record<string, (number | null)[]>; overallRatios: (number | null)[] } {
  const poolRatios: Record<string, (number | null)[]> = {};
  for (const pn of poolNames) poolRatios[pn] = [];
  const overallRatios: (number | null)[] = [];

  for (let i = 0; i < weeks.length; i++) {
    const start = windowSize > 0 ? Math.max(0, i - windowSize + 1) : 0;

    // Accumulate sums over the window
    let totalFees = 0;
    let totalRev = 0;
    const poolFees: Record<string, number> = {};
    const poolRev: Record<string, number> = {};
    for (const pn of poolNames) { poolFees[pn] = 0; poolRev[pn] = 0; }

    for (let j = start; j <= i; j++) {
      const w = weeks[j];
      totalFees += w.totals.fees_usdc;
      totalRev += w.totals.revenue_usdc;
      for (const pn of poolNames) {
        const entry = w.pools[pn];
        if (entry) {
          poolFees[pn] += entry.fees_usdc;
          poolRev[pn] += entry.revenue_usdc;
        }
      }
    }

    // Compute ratios
    overallRatios.push(totalFees > 0 ? totalRev / totalFees : null);
    for (const pn of poolNames) {
      poolRatios[pn].push(poolFees[pn] > 0 ? poolRev[pn] / poolFees[pn] : null);
    }
  }

  return { poolRatios, overallRatios };
}

export default function EffectiveRevenueRateChart(): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeeklyPoolMetrics | null>(null);
  const [windowSize, setWindowSize] = useState<WindowSize>(4);

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

  useEffect(() => {
    fetch('/data/flash-trade/weekly_pool_metrics.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load weekly metrics');
        return res.json();
      })
      .then((json: WeeklyPoolMetrics) => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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

  if (!data || data.weeks.length === 0) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-secondary)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        No weekly metrics available
      </div>
    );
  }

  // Filter out partial weeks, then trim leading weeks with no revenue data
  const nonPartial = data.weeks.filter(w => !w.is_partial);
  const firstRevenueIdx = nonPartial.findIndex(w => w.totals.revenue_usdc > 0);
  const fullWeeks = firstRevenueIdx >= 0 ? nonPartial.slice(firstRevenueIdx) : nonPartial;

  // Collect pool totals across all weeks and sort by total fees (descending)
  const poolFeesTotals: Record<string, number> = {};
  for (const week of fullWeeks) {
    for (const [name, entry] of Object.entries(week.pools)) {
      poolFeesTotals[name] = (poolFeesTotals[name] || 0) + entry.fees_usdc;
    }
  }
  const poolNames = Object.entries(poolFeesTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  // Assign colors by revenue rank
  const colorMap = buildColorMap(poolNames);

  const xDates = fullWeeks.map(w => weekMidpoint(w.week_start));

  // Compute rolling ratios
  const { poolRatios, overallRatios } = computeRollingRatios(fullWeeks, poolNames, windowSize);

  // Per-pool traces
  const traces: Data[] = poolNames.map((poolName) => {
    const color = colorMap[poolName] || '#888888';

    return {
      x: xDates,
      y: poolRatios[poolName],
      name: poolName,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color, width: 1.5 },
      marker: { size: 3, color },
      hovertemplate: `${poolName}: %{y:.1%}<extra></extra>`,
      connectgaps: false,
    };
  });

  // Overall trace (bold, on top)
  const overallColor = isDark ? '#FFFFFF' : '#111111';
  traces.push({
    x: xDates,
    y: overallRatios,
    name: 'Overall',
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: overallColor, width: 3 },
    marker: { size: 5, color: overallColor },
    hovertemplate: 'Overall: %{y:.1%}<extra></extra>',
    connectgaps: false,
  } as Data);

  const windowLabel = windowSize === 0 ? 'Cumulative' : `${windowSize}-Week Rolling`;

  return (
    <div ref={plotRef} style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      padding: isMobile ? '16px 0px 16px 0px' : '16px',
      marginBottom: '24px',
    }}>
      <ChartHeader
        title={`${windowLabel} Effective Take Rate by Pool`}
        plotRef={plotRef}
        isMobile={isMobile}
        toggle={<ChartToggle value={windowSize} onChange={setWindowSize} options={WINDOW_OPTIONS} variant="primary" />}
      />

      <Plot
        data={traces}
        layout={{
          ...template.layout,
          title: undefined,
          xaxis: {
            ...template.layout.xaxis,
            title: isMobile ? '' : { text: 'Week (midpoint)', font: { size: 14 } },
            type: 'date',
            tickfont: { size: isMobile ? 9 : 12 },
            range: xDates.length >= 2 ? [xDates[0], xDates[xDates.length - 1]] : undefined,
          },
          yaxis: {
            ...template.layout.yaxis,
            title: isMobile ? '' : { text: 'Take Rate', font: { size: 14 }, standoff: 20 },
            tickfont: { size: isMobile ? 8 : 12 },
            tickformat: '.0%',
            range: [0, 0.5],
            dtick: 0.1,
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            y: isMobile ? -0.15 : -0.2,
            yanchor: 'top',
            x: 0.5,
            xanchor: 'center',
            font: { size: isMobile ? 10 : 12 },
          },
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: { l: 25, r: 5, t: 20, b: 100 },
          } : {
            margin: { l: 80, r: 40, t: 20, b: 100 },
          }),
          hovermode: 'x unified',
        }}
        config={{
          ...getResponsivePlotlyConfig(),
          staticPlot: false,
          scrollZoom: !isMobile,
        }}
        style={{ width: '100%', height: isMobile ? '350px' : '400px' }}
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
          <div>{'\u2191'} Take Rate (%)</div>
          <div>{'\u2192'} Week</div>
        </div>
      )}
    </div>
  );
}
