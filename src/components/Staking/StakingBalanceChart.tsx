import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { StakingDailyRecord } from '@site/src/hooks/useStakingMetrics';

interface StakingBalanceChartProps {
  data: StakingDailyRecord[];
  maxSupply?: number;
}

export default function StakingBalanceChart({
  data,
  maxSupply,
}: StakingBalanceChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const template = getPlotlyTemplate(colorMode === 'dark');
  const isDark = colorMode === 'dark';

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

  // Plotly doesn't support CSS variables, use actual hex values
  const accentColor = isDark ? '#14BCCD' : '#00A3B4';
  const accentTransparent = isDark ? 'rgba(20, 188, 205, 0.2)' : 'rgba(0, 163, 180, 0.2)';
  // Very subtle spike (crosshair) color
  const spikeColor = isDark ? '#1a2832' : '#cbd5e0';

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Staking Balance',
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

  const sorted = [...(data || [])].sort((a, b) => a.date.localeCompare(b.date));
  const x = sorted.map((point) => point.date);
  const staked = sorted.map((point) => point.staked);
  const unstaked = sorted.map((point) => point.unstaked);
  const totals = sorted.map((point) => point.total ?? point.staked + point.unstaked);
  const hasData = sorted.length > 0;
  const [minStaked, maxTotal] = hasData
    ? [Math.min(...staked), Math.max(...totals)]
    : [0, 0];
  // Calculate maximum staked amount and current deviation
  const maxStaked = hasData ? Math.max(...staked) : 0;
  // Dynamic buffer: subtract 50M from lowest staked value for better visibility
  const lowerBound = hasData ? Math.max(0, minStaked - 10_000_000) : 0;
  // Upper buffer: 10% padding above max total
  const upperBound = hasData ? maxTotal + Math.max(1, maxTotal * 0.01) : 0;
  const yRange = hasData ? [lowerBound, upperBound] : undefined;
  const latest = hasData ? sorted[sorted.length - 1] : null;
  const deviation = latest ? ((latest.staked - maxStaked) / maxStaked) * 100 : 0;

  // Dynamic legend sizing calculations
  const numLegendItems = 3; // Staked TUNA, Unstaked TUNA, Max Staked
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = isMobile ? 150 : 200;
  const availableWidth = effectiveWidth - (isMobile ? 50 : 80);
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;

  // Legend positioning and margins (close to chart - no bottom annotations)
  const legendY = isMobile ? -0.1 : -0.15;
  const bottomMargin = isMobile ? legendHeight + 10 : 32;

  // Chart height calculation
  const plotAreaBase = isMobile ? 350 : 370;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 420;

  return (
    <div
      ref={plotRef}
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: isMobile ? '16px 0px 16px 0px' : '24px',
        marginBottom: '24px',
      }}
    >
      <h3 style={{ marginTop: 0, marginLeft: isMobile ? '16px' : 0 }}>Treasury TUNA Allocation</h3>
      {maxSupply != null && (
        <p style={{ color: 'var(--ifm-color-emphasis-700)', marginLeft: isMobile ? '16px' : 0 }}>
          Maximum TUNA supply: {maxSupply.toLocaleString()}
          {latest && (
            <>
              {' | '}
              {Math.abs(deviation) < 0.01 ? (
                <span style={{ color: '#10B981', fontWeight: 500 }}>
                  ✓ Staked TUNA currently at ATH
                </span>
              ) : (
                <span style={{ color: '#EF4444', fontWeight: 500 }}>
                  ↓ Staked TUNA {Math.abs(deviation).toFixed(2)}% below ATH
                </span>
              )}
            </>
          )}
        </p>
      )}
      {latest && (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px',
            flexWrap: 'wrap',
            marginLeft: isMobile ? '16px' : 0,
          }}
        >
          <div className="badge badge--primary" style={{ padding: '12px 16px', fontSize: '14px' }}>
            <strong>{latest.staked.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> staked TUNA
          </div>
          <div className="badge badge--info" style={{ padding: '12px 16px', fontSize: '14px' }}>
            <strong>{latest.unstaked.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> unstaked TUNA
          </div>
          <div className="badge badge--secondary" style={{ padding: '12px 16px', fontSize: '14px', color: 'white' }}>
            <strong>{latest.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> total TUNA
          </div>
        </div>
      )}
      {!hasData ? (
        <div style={{ padding: '24px', color: 'var(--ifm-color-emphasis-600)' }}>
          No TUNA activity recorded for the selected period.
        </div>
      ) : (
        <Plot
          data={[
            {
              x,
              y: staked,
              type: 'scatter',
              mode: 'lines',
              name: 'Staked TUNA',
              stackgroup: 'one',
              line: { color: accentColor },
              fillcolor: accentTransparent,
              hovertemplate: '%{x}<br><b>%{y:,.2f}</b> staked<extra></extra>',
            },
            {
              x,
              y: unstaked,
              type: 'scatter',
              mode: 'lines',
              name: 'Unstaked TUNA',
              stackgroup: 'one',
              line: { color: '#94A3B8' },
              fillcolor: 'rgba(148, 163, 184, 0.3)',
              hovertemplate: '%{x}<br><b>%{y:,.2f}</b> unstaked<extra></extra>',
            },
            {
              x: [x[0], x[x.length - 1]],
              y: [maxStaked, maxStaked],
              type: 'scatter',
              mode: 'lines',
              name: 'Max Staked',
              line: {
                color: isDark ? '#EF4444' : '#DC2626',
                width: 2,
                dash: 'dash'
              },
              hovertemplate: '<b>Max Staked:</b> %{y:,.2f}<extra></extra>',
            },
          ]}
          layout={{
            ...template.layout,
            autosize: true,
            height: chartHeight,
            hovermode: 'x unified',
            xaxis: {
              ...template.layout.xaxis,
              title: isMobile ? '' : {
                text: 'Date',
                font: { size: 14 },
              },
              type: 'date',
              tickfont: { size: isMobile ? 9 : 12 },
              spikecolor: spikeColor,
              spikedash: 'dot',
              spikethickness: 1,
            },
            yaxis: {
              ...template.layout.yaxis,
              title: isMobile ? '' : {
                text: 'TUNA tokens',
                font: { size: 14 },
              },
              tickfont: { size: isMobile ? 8 : 12 },
              ...(yRange ? { range: yRange } : { rangemode: 'tozero' }),
              spikecolor: spikeColor,
              spikedash: 'dot',
              spikethickness: 1,
            },
            legend: {
              orientation: 'h',
              yanchor: 'top',
              y: legendY,
              xanchor: 'center',
              x: 0.5,
              font: { size: isMobile ? 10 : 12 },
            },
            ...(isMobile ? {
              margin: {
                l: 25,
                r: 0,
                t: 16,
                b: bottomMargin,
              },
            } : {
              margin: {
                l: 70,
                r: 24,
                t: 16,
                b: 32,
              },
            }),
          }}
          config={getResponsivePlotlyConfig()}
          style={{ width: '100%', height: `${chartHeight}px` }}
        />
      )}
      {isMobile && hasData && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: '0px',
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>↑ TUNA tokens</div>
          <div>→ Date</div>
        </div>
      )}
    </div>
  );
}
