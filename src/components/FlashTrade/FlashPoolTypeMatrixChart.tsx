import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import { buildColorMap } from '@site/src/utils/chartColors';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';
import ChartToggle from '@site/src/components/common/ChartToggle';

interface PoolTypeData {
  pool_id: string;
  pool_label: string;
  total_usdc: number;
  share_of_total: number;
  types: Array<{
    type: string;
    usdc_amount: number;
    share_of_pool: number;
    share_of_total: number;
  }>;
}

interface FlashPoolTypeMatrixChartProps {
  onSegmentClick?: (poolId: string, type: string) => void;
  selectedPool?: string | null;
  selectedType?: string | null;
}

type WidthMode = 'proportional' | 'equal';

const WIDTH_OPTIONS = [
  { value: 'proportional' as WidthMode, label: 'Proportional' },
  { value: 'equal' as WidthMode, label: 'Equal' },
];

export default function FlashPoolTypeMatrixChart({
  onSegmentClick,
  selectedPool,
  selectedType
}: FlashPoolTypeMatrixChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  const [data, setData] = useState<PoolTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widthMode, setWidthMode] = useState<WidthMode>('equal');

  // Detect mobile viewport
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
  const [containerWidth, setContainerWidth] = useState(0);

  useChartTracking(plotRef, {
    chartName: 'Flash Pool Type Matrix',
    trackClick: true,
    trackZoom: true,
  });

  // Measure container width for legend layout calculation
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

  // Helper function to format pool labels (swap pair/protocol for better readability)
  const formatPoolLabel = (label: string): string => {
    // Pattern: "Crypto.1" -> keep as-is
    // If more complex labels exist, add formatting logic here
    return label;
  };

  useEffect(() => {
    fetch('/data/flash-trade/pool_type_summary.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load pool-type matrix data: ${response.statusText}`);
        }
        return response.json();
      })
      .then(jsonData => {
        // Handle both array format and {pools: [...]} format
        const poolsArray = Array.isArray(jsonData) ? jsonData : jsonData.pools;
        setData(poolsArray);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading pool-type matrix data:', err);
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

  if (!data || data.length === 0) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-secondary)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        No data available
      </div>
    );
  }

  // Build Marimekko chart data
  // Each pool gets a position on x-axis with width proportional to its share
  // Each type within a pool is a stacked segment

  const traces: Data[] = [];

  // Calculate total revenue for each type to determine top 10
  const typeRevenue = new Map<string, number>();
  data.forEach(pool => {
    pool.types.forEach(t => {
      typeRevenue.set(t.type, (typeRevenue.get(t.type) || 0) + t.usdc_amount);
    });
  });

  // Sort by revenue and get top 10 type names
  const top10Types = Array.from(typeRevenue.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([typeName]) => typeName);

  const top10Set = new Set(top10Types);

  // Assign colors by revenue rank (liquidation types get red)
  const rankedTypeNames = Array.from(typeRevenue.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
  const typeToColor = buildColorMap(rankedTypeNames, 'Others', n => n.startsWith('Liquidate'));

  // Calculate cumulative x positions for pools
  const equalWidth = 1 / data.length;
  let cumulativeX = 0;
  const poolPositions: Array<{ pool: string; xStart: number; xEnd: number; width: number }> = [];

  data.forEach(pool => {
    const width = widthMode === 'equal' ? equalWidth : pool.share_of_total;
    poolPositions.push({
      pool: formatPoolLabel(pool.pool_label),
      xStart: cumulativeX,
      xEnd: cumulativeX + width,
      width: width,
    });
    cumulativeX += width;
  });

  // Calculate the actual range needed to show all bars fully
  const maxX = cumulativeX;

  // Create annotations for all pools (90° rotated on mobile, 45° on desktop)
  const annotations = poolPositions.map((poolPos, poolIdx) => {
    const pool = data[poolIdx];
    const pct = (pool.share_of_total * 100).toFixed(1);
    const labelText = widthMode === 'equal'
      ? `${poolPos.pool} (${pct}%)`
      : poolPos.pool.replace(/<br>/g, ' ');
    return {
      x: poolPos.xStart + poolPos.width / 2,
      y: -0.02,
      xref: 'x' as const,
      yref: 'paper' as const,
      text: labelText,
      showarrow: false,
      textangle: isMobile ? -90 : -45,
      font: { size: isMobile ? 9 : 11 },
      xanchor: 'right' as const,
      yanchor: 'top' as const,
    };
  });

  // Calculate dynamic legend positioning
  const numLegendItems = 10;
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = isMobile ? 130 : 250;
  const marginSubtraction = isMobile ? (effectiveWidth < 420 ? 0 : 50) : 80;
  const availableWidth = effectiveWidth - marginSubtraction;
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;
  const legendY = isMobile ? -0.32 : -0.4;
  const bottomMargin = isMobile ? 110 + legendHeight + 10 : 140;
  const plotAreaBase = isMobile ? 350 : 500;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 600;

  // Get unique types across all pools
  const allTypes = Array.from(typeRevenue.keys());

  // Create traces for each type
  allTypes.forEach((typeName) => {
    const xValues: number[] = [];
    const yValues: number[] = [];
    const widths: number[] = [];
    const hoverTexts: string[] = [];
    const textLabels: string[] = [];
    const customData: Array<[string, string]> = [];  // [pool_id, type]

    poolPositions.forEach((poolPos, poolIdx) => {
      const pool = data[poolIdx];
      const typeData = pool.types.find(t => t.type === typeName);

      if (typeData && typeData.usdc_amount > 0) {
        const xCenter = poolPos.xStart + poolPos.width / 2;
        xValues.push(xCenter);
        yValues.push(typeData.share_of_pool * 100);
        widths.push(poolPos.width);
        hoverTexts.push(
          `<b>${pool.pool_label}</b><br>` +
          `Type: ${typeName}<br>` +
          `$${typeData.usdc_amount.toFixed(2)} USDC<br>` +
          `${(typeData.share_of_pool * 100).toFixed(1)}% of pool<br>` +
          `${(typeData.share_of_total * 100).toFixed(2)}% of total fees`
        );
        textLabels.push('');
        customData.push([pool.pool_id, typeName]);
      }
    });

    if (xValues.length > 0) {
      traces.push({
        type: 'bar',
        x: xValues,
        y: yValues,
        width: widths,
        name: typeName,
        text: textLabels,
        textposition: 'inside',
        marker: {
          color: typeToColor[typeName],
          line: {
            color: isDark ? '#05080D' : '#ffffff',
            width: 1,
          },
        },
        hovertemplate: '%{hovertext}<extra></extra>',
        hovertext: hoverTexts,
        customdata: customData,
        showlegend: top10Set.has(typeName),
      });
    }
  });

  return (
    <div ref={plotRef} style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: isMobile ? '16px 0px 16px 0px' : '16px',
      marginBottom: '24px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        padding: isMobile ? '0 12px 8px' : '0 0 8px',
      }}>
        <span style={{ fontWeight: 600, fontSize: isMobile ? 15 : 18 }}>
          Fee Distribution: Pools & Transaction Types
        </span>
        <div style={{ flexShrink: 0 }}>
          <ChartToggle
            value={widthMode}
            onChange={setWidthMode}
            options={WIDTH_OPTIONS}
            variant="secondary"
          />
        </div>
      </div>
      <Plot
        data={traces}
        layout={{
          ...template.layout,
          title: undefined,
          xaxis: {
            ...template.layout.xaxis,
            title: isMobile ? '' : {
              text: widthMode === 'proportional'
                ? 'Liquidity Pools (width = share of fees)'
                : 'Liquidity Pools',
              standoff: 120,
              font: { size: 14 },
            },
            showticklabels: false,
            range: [0, maxX],
          },
          yaxis: {
            ...template.layout.yaxis,
            title: isMobile ? '' : {
              text: 'Share of Pool Fees (%)',
              font: { size: 14 },
            },
            range: [0, 105],
            ticksuffix: '%',
            tickangle: 0,
            tickfont: { size: isMobile ? 8 : 12 },
          },
          barmode: 'stack',
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
            } : {
              tracegroupgap: 5,
            }),
          },
          hovermode: 'closest',
          annotations: annotations,
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: {
              l: 25,
              r: 5,
              t: 30,
              b: bottomMargin,
            },
          } : {
            margin: {
              l: 60,
              r: 10,
              t: 30,
              b: 140,
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
        onClick={(event: any) => {
          if (event.points && event.points.length > 0 && onSegmentClick) {
            const point = event.points[0];
            const [poolId, typeName] = point.customdata;
            onSegmentClick(poolId, typeName);
          }
        }}
      />
      {isMobile && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: `-${Math.round(legendHeight * 0.6)}px`,
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>&#8593; Share of pool fees</div>
          <div>&#8594; {widthMode === 'proportional' ? 'Liquidity pools (width = share of fees)' : 'Liquidity pools (equal width)'}</div>
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
        Click a segment to filter the table by pool-type combination. Legend: click to hide/show
      </div>
    </div>
  );
}
