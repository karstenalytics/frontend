import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig} from '@site/src/utils/plotlyTheme';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';
import ChartToggle from '@site/src/components/common/ChartToggle';

interface DailyTypeData {
  date: string;
  instructions: Record<string, number>;
}

interface TypeDataResponse {
  days: DailyTypeData[];
}

interface TypeStackedAreaChartProps {
  visibleTypes?: string[] | null;
  onVisibilityChange?: (visibleTypes: string[] | null) => void;
}

type ViewMode = 'daily' | 'cumulative';

// Instruction type colors - consistent across charts and tables
export const TYPE_COLORS: Record<string, string> = {
  'SwapAndOpen': '#00A3B4',       // Teal (accent)
  'CloseAndSwap': '#FF6B6B',      // Red
  'OpenPosition': '#4ECDC4',      // Cyan
  'ClosePosition': '#FFEAA7',     // Yellow
  'IncreaseSize': '#DDA0DD',      // Plum
  'DecreaseSize': '#98D8C8',      // Mint
  'Liquidate': '#F39C12',         // Orange
  'ExecuteTriggerWithSwap': '#9B59B6', // Purple
  'ExecuteTriggerOrder': '#3498DB',    // Blue
  'ExecuteLimitWithSwap': '#E74C3C',   // Dark Red
  'ExecuteLimitOrder': '#2ECC71',      // Green
  'AddCollateral': '#1ABC9C',          // Turquoise
  'RemoveCollateral': '#E67E22',       // Dark Orange
};

// Toggle options
const VIEW_OPTIONS = [
  { value: 'daily' as ViewMode, label: 'Daily' },
  { value: 'cumulative' as ViewMode, label: 'Cumulative' }
];

export default function TypeStackedAreaChart({
  visibleTypes = null,
  onVisibilityChange,
}: TypeStackedAreaChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  const [data, setData] = useState<TypeDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('daily');

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

  // Fetch data
  useEffect(() => {
    fetch('/data/flash-trade/daily_by_instruction.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load type data');
        return res.json();
      })
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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

  if (!data || data.days.length === 0) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-secondary)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        No type data available
      </div>
    );
  }

  // Extract dates
  const dates = data.days.map(d => d.date);

  // Get unique type names sorted by total revenue (descending)
  const typeTotals: Record<string, number> = {};
  data.days.forEach(day => {
    Object.entries(day.instructions).forEach(([typeName, value]) => {
      typeTotals[typeName] = (typeTotals[typeName] || 0) + value;
    });
  });
  const typeNames = Object.entries(typeTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  // Derive which types are hidden from visibility prop
  const hiddenSet = new Set(
    visibleTypes ? typeNames.filter(t => !visibleTypes.includes(t)) : []
  );

  // Calculate cumulative data if needed
  const displayData = view === 'cumulative'
    ? data.days.reduce((acc, day, idx) => {
        const cumDay: DailyTypeData = { date: day.date, instructions: {} };
        // Iterate over ALL type names to ensure cumulative values carry forward
        typeNames.forEach(typeName => {
          const prevSum = idx > 0 ? acc[idx - 1].instructions[typeName] || 0 : 0;
          cumDay.instructions[typeName] = prevSum + (day.instructions[typeName] || 0);
        });
        acc.push(cumDay);
        return acc;
      }, [] as DailyTypeData[])
    : data.days;

  // Calculate daily totals for tooltips (only visible types)
  const dailyTotals = displayData.map(day => {
    let total = 0;
    for (const typeName of typeNames) {
      if (!hiddenSet.has(typeName)) total += (day.instructions[typeName] || 0);
    }
    return total;
  });

  // Create traces for each type
  // Daily view: stacked bar chart
  // Cumulative view: stacked area chart
  const traces: Data[] = typeNames.map((typeName, index) => {
    const yValues = displayData.map(day => day.instructions[typeName] || 0);
    const color = TYPE_COLORS[typeName] || template.layout.colorway[index % template.layout.colorway.length];

    if (view === 'daily') {
      // Stacked bar chart for daily
      return {
        x: dates,
        y: yValues,
        name: typeName,
        type: 'bar',
        visible: hiddenSet.has(typeName) ? ('legendonly' as const) : true,
        marker: {
          color: color,
        },
        hovertemplate: `${typeName}: $%{y:,.2f}<extra></extra>`,
        customdata: Array(dates.length).fill(typeName),
      };
    } else {
      // Stacked area chart for cumulative
      return {
        x: dates,
        y: yValues,
        name: typeName,
        type: 'scatter',
        mode: 'none',
        stackgroup: 'one',
        visible: hiddenSet.has(typeName) ? ('legendonly' as const) : true,
        fillcolor: color,
        line: { width: 0, color: color },
        hovertemplate: `${typeName}: $%{y:,.2f}<extra></extra>`,
        customdata: Array(dates.length).fill(typeName),
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

  // Handle chart click - isolate clicked type (or restore all if already isolated)
  const handleChartClick = (event: any) => {
    if (event.points && event.points.length > 0 && onVisibilityChange) {
      const point = event.points[0];
      const clickedType = point.customdata;
      if (clickedType && clickedType !== 'Total') {
        const currentVisible = visibleTypes || typeNames;
        if (currentVisible.length === 1 && currentVisible[0] === clickedType) {
          onVisibilityChange(null);
        } else {
          onVisibilityChange([clickedType]);
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

    const currentVisible = new Set(visibleTypes || [...typeNames]);
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (idx >= typeNames.length) continue;
      const val = Array.isArray(updates.visible) ? updates.visible[i] : updates.visible;
      if (val === 'legendonly' || val === false) {
        currentVisible.delete(typeNames[idx]);
      } else {
        currentVisible.add(typeNames[idx]);
      }
    }

    const newVisible = currentVisible.size === typeNames.length ? null : [...currentVisible];
    // Avoid no-op updates
    const oldSet = new Set(visibleTypes || typeNames);
    if (currentVisible.size === oldSet.size && [...currentVisible].every(t => oldSet.has(t))) return;
    onVisibilityChange(newVisible);
  };

  // Dynamic legend sizing
  const numLegendItems = typeNames.length;
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

  const chartTitle = view === 'daily' ? 'Daily Fees by Type' : 'Cumulative Fees by Type';

  return (
    <div ref={plotRef} style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: isMobile ? '16px 0px 16px 0px' : '16px',
      marginBottom: '24px',
    }}>
      {/* Title and Toggle Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        paddingLeft: isMobile ? '16px' : '0px',
        paddingRight: isMobile ? '16px' : '0px',
        marginBottom: '16px',
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
              text: 'Fees (USDC)',
              font: { size: 14 },
              standoff: 20,
            },
            tickfont: { size: isMobile ? 8 : 12 },
            tickformat: '$.2s',
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            y: isMobile ? -0.25 : -0.3,
            yanchor: 'top',
            x: 0.5,
            xanchor: 'center',
            font: { size: isMobile ? 9 : 11 },
          },
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: {
              l: 25,
              r: 5,
              t: 20,
              b: bottomMargin,
            },
          } : {
            margin: {
              l: 80,
              r: 40,
              t: 20,
              b: 140,
            },
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
          <div>&#8593; Fees (USDC)</div>
          <div>&#8594; Date (UTC)</div>
        </div>
      )}
    </div>
  );
}
