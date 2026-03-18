import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { buildColorMap } from '@site/src/utils/chartColors';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';
import ChartToggle from '@site/src/components/common/ChartToggle';
import ChartHeader from '@site/src/components/common/ChartHeader';

interface DailyIntegratorData {
  date: string;
  programs?: Record<string, number>;
  lp_programs?: Record<string, number>;
}

interface IntegratorDataResponse {
  days: DailyIntegratorData[];
  summary?: {
    total_cpi_fees: number;
    total_direct_fees: number;
    cpi_share_pct: number;
    total_cpi_txs: number;
    total_direct_txs: number;
    programs: Record<string, {
      total_fees: number;
      tx_count: number;
      first_seen: string;
      last_seen: string;
    }>;
  };
  metadata?: {
    protocol: string;
    currency: string;
  };
}

const PROTOCOL_CONFIG: Record<string, { currency: string; tickformat: string; prefix: string }> = {
  'flash-trade': { currency: 'USDC', tickformat: '$.2s', prefix: '$' },
  'defituna': { currency: 'SOL', tickformat: '.4s', prefix: '' },
};

interface IntegratorStackedChartProps {
  protocol: 'flash-trade' | 'defituna';
  visiblePrograms?: string[] | null;
  onVisibilityChange?: (visible: string[] | null) => void;
  onColorsComputed?: (colorMap: Record<string, string>) => void;
  onFeeCategoryChange?: (category: 'trading' | 'lp') => void;
}

type ViewMode = 'daily' | 'cumulative';
type FeeCategory = 'trading' | 'lp';

const VIEW_OPTIONS = [
  { value: 'daily' as ViewMode, label: 'Daily' },
  { value: 'cumulative' as ViewMode, label: 'Cumulative' },
];

const FEE_CATEGORY_OPTIONS = [
  { value: 'trading' as FeeCategory, label: 'Trading' },
  { value: 'lp' as FeeCategory, label: 'LP' },
];

export default function IntegratorStackedChart({
  protocol,
  visiblePrograms = null,
  onVisibilityChange,
  onColorsComputed,
  onFeeCategoryChange,
}: IntegratorStackedChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);
  const config = PROTOCOL_CONFIG[protocol] || PROTOCOL_CONFIG['flash-trade'];

  const [data, setData] = useState<IntegratorDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('daily');
  const [feeCategory, setFeeCategory] = useState<FeeCategory>('trading');

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
  const colorMapRef = useRef<Record<string, string>>({});

  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (plotRef.current) {
      const updateWidth = () => setContainerWidth(plotRef.current?.offsetWidth || 0);
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  useEffect(() => {
    fetch(`/data/${protocol}/daily_by_integrator.json`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load integrator data');
        return res.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [protocol]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div style={{
        padding: '48px', textAlign: 'center',
        color: 'var(--ifm-color-danger)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        Error loading data: {error}
      </div>
    );
  }

  if (!data || data.days.length === 0) {
    return (
      <div style={{
        padding: '48px', textAlign: 'center',
        color: 'var(--ifm-color-secondary)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        No integrator data available
      </div>
    );
  }

  const dates = data.days.map(d => d.date);

  const categoryLabel = feeCategory === 'lp' ? 'LP' : 'Trading';
  const feesField = feeCategory === 'lp' ? 'lp_programs' : 'programs';
  const getFees = (day: DailyIntegratorData) => day[feesField] || {};

  const handleFeeCategoryChange = (cat: FeeCategory) => {
    setFeeCategory(cat);
    if (onVisibilityChange) onVisibilityChange(null);
    if (onFeeCategoryChange) onFeeCategoryChange(cat);
  };

  // Get unique program names sorted by total fees descending
  const programTotals: Record<string, number> = {};
  data.days.forEach(day => {
    Object.entries(getFees(day)).forEach(([name, value]) => {
      programTotals[name] = (programTotals[name] || 0) + value;
    });
  });
  const programNames = Object.entries(programTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  if (programNames.length === 0) {
    return (
      <div ref={plotRef} style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <ChartHeader
          title={`Integrator ${categoryLabel} Fees (${config.currency})`}
          plotRef={plotRef}
          isMobile={isMobile}
          toggle={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <ChartToggle value={feeCategory} onChange={handleFeeCategoryChange} options={FEE_CATEGORY_OPTIONS} variant="secondary" />
              <ChartToggle value={view} onChange={setView} options={VIEW_OPTIONS} variant="primary" />
            </div>
          }
        />
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ifm-color-secondary)' }}>
          No {feeCategory === 'lp' ? 'LP' : 'trading'} fee data available for this category.
        </div>
      </div>
    );
  }

  const colorMap = buildColorMap(programNames);

  if (JSON.stringify(colorMapRef.current) !== JSON.stringify(colorMap)) {
    colorMapRef.current = colorMap;
    if (onColorsComputed) onColorsComputed(colorMap);
  }

  const hiddenSet = new Set(
    visiblePrograms ? programNames.filter(p => !visiblePrograms.includes(p)) : []
  );

  const displayData = view === 'cumulative'
    ? data.days.reduce((acc, day, idx) => {
        const cumDay: DailyIntegratorData = { date: day.date, [feesField]: {} };
        programNames.forEach(name => {
          const prevFees = idx > 0 ? getFees(acc[idx - 1]) : {};
          const prevSum = prevFees[name] || 0;
          getFees(cumDay)[name] = prevSum + (getFees(day)[name] || 0);
        });
        acc.push(cumDay);
        return acc;
      }, [] as DailyIntegratorData[])
    : data.days;

  const dailyTotals = displayData.map(day => {
    const fees = getFees(day);
    let total = 0;
    for (const name of programNames) {
      if (!hiddenSet.has(name)) total += (fees[name] || 0);
    }
    return total;
  });

  const hoverFmt = config.prefix
    ? `%{customdata}: ${config.prefix}%{y:,.2f}<extra></extra>`
    : `%{customdata}: %{y:,.4f} ${config.currency}<extra></extra>`;

  const traces: Data[] = programNames.map((name) => {
    const yValues = displayData.map(day => getFees(day)[name] || 0);
    const color = colorMap[name] || '#888888';

    if (view === 'daily') {
      return {
        x: dates,
        y: yValues,
        name: name,
        type: 'bar',
        visible: hiddenSet.has(name) ? ('legendonly' as const) : true,
        marker: { color },
        hovertemplate: hoverFmt.replace('%{customdata}', name),
        customdata: Array(dates.length).fill(name),
      };
    } else {
      return {
        x: dates,
        y: yValues,
        name: name,
        type: 'scatter',
        mode: 'none',
        stackgroup: 'one',
        visible: hiddenSet.has(name) ? ('legendonly' as const) : true,
        fillcolor: color,
        line: { width: 0, color },
        hovertemplate: hoverFmt.replace('%{customdata}', name),
        customdata: Array(dates.length).fill(name),
      };
    }
  });

  const totalHoverFmt = config.prefix
    ? `<b>Total: ${config.prefix}%{y:,.2f}</b><extra></extra>`
    : `<b>Total: %{y:,.4f} ${config.currency}</b><extra></extra>`;

  traces.push({
    x: dates,
    y: dailyTotals,
    name: 'Total',
    type: 'scatter',
    mode: 'none',
    hovertemplate: totalHoverFmt,
    showlegend: false,
  } as Data);

  const handleChartClick = (event: any) => {
    if (event.points && event.points.length > 0 && onVisibilityChange) {
      const clickedProgram = event.points[0].customdata;
      if (clickedProgram && clickedProgram !== 'Total') {
        const currentVisible = visiblePrograms || programNames;
        if (currentVisible.length === 1 && currentVisible[0] === clickedProgram) {
          onVisibilityChange(null);
        } else {
          onVisibilityChange([clickedProgram]);
        }
      }
    }
  };

  const handleRestyle = (restyleData: any) => {
    if (!onVisibilityChange || !Array.isArray(restyleData) || restyleData.length < 2) return;
    const updates = restyleData[0];
    const indices: number[] = restyleData[1];
    if (!('visible' in updates)) return;

    const currentVisible = new Set(visiblePrograms || [...programNames]);
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (idx >= programNames.length) continue;
      const val = Array.isArray(updates.visible) ? updates.visible[i] : updates.visible;
      if (val === 'legendonly' || val === false) {
        currentVisible.delete(programNames[idx]);
      } else {
        currentVisible.add(programNames[idx]);
      }
    }

    const newVisible = currentVisible.size === programNames.length ? null : [...currentVisible];
    const oldSet = new Set(visiblePrograms || programNames);
    if (currentVisible.size === oldSet.size && [...currentVisible].every(p => oldSet.has(p))) return;
    onVisibilityChange(newVisible);
  };

  // Dynamic legend sizing
  const numLegendItems = programNames.length;
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = isMobile ? 150 : 200;
  const availableWidth = effectiveWidth - (isMobile ? 50 : 80);
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;
  const bottomMargin = isMobile ? legendHeight + 10 : 140;
  const plotAreaBase = isMobile ? 350 : 450;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 500;

  const chartTitle = view === 'daily'
    ? `Daily Integrator ${categoryLabel} Fees (${config.currency})`
    : `Cumulative Integrator ${categoryLabel} Fees (${config.currency})`;

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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <ChartToggle value={feeCategory} onChange={handleFeeCategoryChange} options={FEE_CATEGORY_OPTIONS} variant="secondary" />
            <ChartToggle value={view} onChange={setView} options={VIEW_OPTIONS} variant="primary" />
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
            title: isMobile ? '' : { text: 'Date (UTC)', font: { size: 14 } },
            type: 'date',
            tickfont: { size: isMobile ? 9 : 12 },
          },
          yaxis: {
            ...template.layout.yaxis,
            title: isMobile ? '' : {
              text: `Fees (${config.currency})`,
              font: { size: 14 },
              standoff: 20,
            },
            tickfont: { size: isMobile ? 8 : 12 },
            tickformat: config.tickformat,
            rangemode: 'tozero',
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            y: isMobile ? -0.15 : -0.16,
            yanchor: 'top',
            x: 0.5,
            xanchor: 'center',
            font: { size: isMobile ? 9 : 11 },
          },
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: { l: 25, r: 5, t: 20, b: bottomMargin },
          } : {
            margin: { l: 80, r: 40, t: 20, b: 80 },
          }),
          uirevision: `${feeCategory}-${view}`,
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
          <div>&#8593; Fees ({config.currency})</div>
          <div>&#8594; Date (UTC)</div>
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
        Click a legend item to hide; double-click to isolate
      </div>
    </div>
  );
}
