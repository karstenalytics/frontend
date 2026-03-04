import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { StakingDailyRecord } from '@site/src/hooks/useStakingMetrics';

interface StakingBalanceChartProps {
  data: StakingDailyRecord[];
  tokenSymbol: string;
  initialYMin?: number; // Preset zoom: minimum y-axis value on initial load
}

export default function StakingBalanceChart({
  data,
  tokenSymbol,
  initialYMin,
}: StakingBalanceChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const template = getPlotlyTemplate(colorMode === 'dark');
  const isDark = colorMode === 'dark';

  // Track whether price trace is visible (for secondary y-axis)
  const [showPrice, setShowPrice] = useState(false);

  // Track y-axis range state for preset zoom with reset capability
  const [usePresetZoom, setUsePresetZoom] = useState(true);

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
  const pending = sorted.map((point) => point.pending ?? 0);
  const unstaked = sorted.map((point) => point.unstaked);
  const vested = sorted.map((point) => point.vested ?? 0);
  const prices = sorted.map((point) => point.price ?? null);
  const totals = sorted.map((point) => point.total);
  const hasData = sorted.length > 0;
  const hasPending = pending.some((val) => val > 0);
  const hasVested = vested.some((val) => val > 0);
  const hasPrice = prices.some((val) => val !== null && val > 0);
  const maxStackHeight = hasData ? Math.max(...totals) : 0;
  const [minStaked, maxTotal] = hasData
    ? [Math.min(...staked), Math.max(...totals)]
    : [0, 0];
  // Calculate maximum staked amount and current deviation
  const maxStaked = hasData ? Math.max(...staked) : 0;
  // Dynamic buffer: subtract 10M from lowest staked value for better visibility
  const dynamicLowerBound = hasData ? Math.max(0, minStaked - 10_000_000) : 0;
  // Upper bound: round up to next 50M bucket
  const BUCKET = 50_000_000;
  const upperBound = hasData ? Math.ceil(maxStackHeight / BUCKET) * BUCKET : 0;
  // Preset zoom range (if initialYMin provided)
  const presetYRange = initialYMin !== undefined && hasData ? [initialYMin, upperBound] : undefined;
  // Use preset zoom on initial load, null triggers autorange after reset
  const yRange = usePresetZoom && presetYRange ? presetYRange : null;
  const latest = hasData ? sorted[sorted.length - 1] : null;
  const deviation = latest ? ((latest.staked - maxStaked) / maxStaked) * 100 : 0;

  // Dynamic legend sizing calculations
  // Base: Staked, Unstaked, Max Staked (3) + Pending if present + Vested if present + Price if present
  const numLegendItems = 3 + (hasPending ? 1 : 0) + (hasVested ? 1 : 0) + (hasPrice ? 1 : 0);
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = isMobile ? 150 : 250;
  const availableWidth = effectiveWidth - (isMobile ? 50 : 80);
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;

  // Legend positioning and margins (close to chart - no bottom annotations)
  const legendY = isMobile ? -0.1 : -0.2;
  const bottomMargin = isMobile ? legendHeight + 10 : 80;

  // Chart height calculation
  const plotAreaBase = isMobile ? 350 : 370;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 450;

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
      <h3 style={{
        margin: 0,
        marginBottom: '16px',
        marginLeft: isMobile ? '16px' : 0,
        fontSize: isMobile ? '1.1rem' : '1.25rem',
        fontWeight: 600,
        textAlign: 'center',
      }}>{tokenSymbol} Staking Over Time</h3>
      {latest && (
        <p style={{
          color: 'var(--ifm-color-emphasis-700)',
          marginLeft: isMobile ? '16px' : 0,
          marginRight: isMobile ? '16px' : 0,
          marginBottom: '16px',
          fontSize: isMobile ? '13px' : '15px',
          textAlign: isMobile ? 'left' : 'center',
        }}>
          {Math.abs(deviation) < 0.01 ? (
            <span style={{ color: '#10B981', fontWeight: 500 }}>
              {'\u2713'} Staked {tokenSymbol} currently at ATH
            </span>
          ) : (
            <span style={{ color: '#EF4444', fontWeight: 500 }}>
              {'\u2193'} Staked {tokenSymbol} {Math.abs(deviation).toFixed(2)}% below ATH
            </span>
          )}
        </p>
      )}
      {latest && (
        <div
          style={{
            display: isMobile ? 'grid' : 'flex',
            gridTemplateColumns: isMobile ? '1fr 1fr' : undefined,
            gap: isMobile ? '8px' : '16px',
            marginBottom: '16px',
            flexWrap: isMobile ? undefined : 'wrap',
            marginLeft: isMobile ? '16px' : 0,
            marginRight: isMobile ? '16px' : 0,
          }}
        >
          <div className="badge badge--primary" style={{
            padding: isMobile ? '8px 12px' : '12px 16px',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center',
          }}>
            <strong>{latest.staked.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> staked {tokenSymbol}
          </div>
          {hasPending && (
            <div className="badge badge--warning" style={{
              padding: isMobile ? '8px 12px' : '12px 16px',
              fontSize: isMobile ? '12px' : '14px',
              textAlign: 'center',
            }}>
              <strong>{(latest.pending ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> queued {tokenSymbol}
            </div>
          )}
          <div className="badge badge--info" style={{
            padding: isMobile ? '8px 12px' : '12px 16px',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center',
          }}>
            <strong>{latest.unstaked.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> unstaked {tokenSymbol}
          </div>
          {hasVested && (
            <div className="badge" style={{
              padding: isMobile ? '8px 12px' : '12px 16px',
              fontSize: isMobile ? '12px' : '14px',
              textAlign: 'center',
              backgroundColor: '#6366F1',
              color: 'white',
            }}>
              <strong>{(latest.vested ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> reserved {tokenSymbol}
            </div>
          )}
        </div>
      )}
      {!hasData ? (
        <div style={{ padding: '24px', color: 'var(--ifm-color-emphasis-600)' }}>
          No {tokenSymbol} activity recorded for the selected period.
        </div>
      ) : (
        <Plot
          key={usePresetZoom ? 'preset-zoom' : 'full-range'}
          data={[
            {
              x,
              y: staked,
              type: 'scatter',
              mode: 'lines',
              name: `Staked ${tokenSymbol}`,
              stackgroup: 'one',
              line: { color: accentColor },
              fillcolor: accentTransparent,
              hovertemplate: '<b>%{y:,.0f}</b> staked<extra></extra>',
            },
            ...(hasPending ? [{
              x,
              y: pending,
              type: 'scatter' as const,
              mode: 'lines' as const,
              name: `Queued ${tokenSymbol}`,
              stackgroup: 'one',
              line: { color: '#F39C12' },
              fillcolor: 'rgba(243, 156, 18, 0.3)',
              hovertemplate: '<b>%{y:,.0f}</b> queued<extra></extra>',
            }] : []),
            {
              x,
              y: unstaked,
              type: 'scatter',
              mode: 'lines',
              name: `Unstaked ${tokenSymbol}`,
              stackgroup: 'one',
              line: { color: '#94A3B8' },
              fillcolor: 'rgba(148, 163, 184, 0.3)',
              hovertemplate: '<b>%{y:,.0f}</b> unstaked<extra></extra>',
            },
            ...(hasVested ? [{
              x,
              y: vested,
              type: 'scatter' as const,
              mode: 'lines' as const,
              name: `Reserved ${tokenSymbol}`,
              stackgroup: 'one',
              line: { color: '#6366F1' },
              fillcolor: 'rgba(99, 102, 241, 0.3)',
              hovertemplate: '<b>%{y:,.0f}</b> reserved<extra></extra>',
            }] : []),
            {
              x,
              y: totals,
              type: 'scatter',
              mode: 'lines',
              name: 'Total in Treasury',
              line: { color: 'rgba(0,0,0,0)', width: 0 },
              hovertemplate: '<b>%{y:,.0f}</b> total<extra></extra>',
              showlegend: false,
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
              hovertemplate: '<b>%{y:,.0f}</b> max staked<extra></extra>',
            },
            ...(hasPrice ? [{
              x,
              y: prices,
              type: 'scatter' as const,
              mode: 'lines' as const,
              name: `${tokenSymbol} Price`,
              yaxis: 'y2' as const,
              visible: showPrice ? true : 'legendonly' as const,
              line: { color: '#10B981', width: 2 },
              hovertemplate: '<b>$%{y:.6f}</b><extra></extra>',
            }] : []),
          ]}
          layout={{
            ...template.layout,
            autosize: true,
            height: chartHeight,
            hovermode: 'x unified',
            uirevision: usePresetZoom ? 'preset' : 'full',
            xaxis: {
              ...template.layout.xaxis,
              title: isMobile ? '' : {
                text: 'Date (UTC)',
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
                text: `${tokenSymbol} tokens`,
                font: { size: 14 },
              },
              tickfont: { size: isMobile ? 8 : 12 },
              ...(yRange ? { range: yRange, autorange: false } : { autorange: true }),
              spikecolor: spikeColor,
              spikedash: 'dot',
              spikethickness: 1,
            },
            ...(hasPrice ? {
              yaxis2: {
                ...template.layout.yaxis,
                title: showPrice && !isMobile ? {
                  text: 'Price (USD)',
                  font: { size: 14 },
                } : undefined,
                tickfont: { size: isMobile ? 8 : 12 },
                overlaying: 'y' as const,
                side: 'right' as const,
                showgrid: showPrice,
                gridcolor: 'rgba(16, 185, 129, 0.1)',
                showticklabels: showPrice,
                tickformat: '$.4f',
                automargin: showPrice,
                visible: showPrice,
                rangemode: 'tozero' as const,
                fixedrange: true,
              },
            } : {}),
            legend: {
              orientation: 'h',
              yanchor: 'top',
              y: legendY,
              xanchor: 'center',
              x: 0.5,
              font: { size: isMobile ? 10 : 12 },
            },
            dragmode: isMobile ? false : 'zoom',
            ...(isMobile ? {
              margin: {
                l: 25,
                r: showPrice ? 25 : 5,
                t: 16,
                b: bottomMargin,
              },
            } : {
              margin: {
                l: 70,
                r: showPrice ? 70 : 24,
                t: 16,
                b: bottomMargin,
              },
            }),
          }}
          config={{
            ...getResponsivePlotlyConfig(),
            staticPlot: false,
            scrollZoom: !isMobile,
            doubleClick: 'reset',
          }}
          style={{ width: '100%', height: `${chartHeight}px` }}
          onLegendClick={(event: any) => {
            // Toggle showPrice state when clicking the price trace legend
            const clickedTrace = event.data[event.curveNumber];
            if (clickedTrace?.name === `${tokenSymbol} Price`) {
              setShowPrice(prev => !prev);
              return false; // Prevent default Plotly behavior
            }
            return undefined; // Allow default behavior for other traces
          }}
          onDoubleClick={() => {
            // Double-click resets to full range
            if (presetYRange) {
              setUsePresetZoom(false);
            }
          }}
          onRelayout={(event: any) => {
            // Detect home button click (resetScale2d triggers autorange on both axes)
            const keys = Object.keys(event);
            const isReset = keys.some(k =>
              k.includes('autorange') ||
              k === 'xaxis.range[0]' ||
              k === 'yaxis.range[0]'
            );
            if (isReset && usePresetZoom && presetYRange) {
              setUsePresetZoom(false);
            }
          }}
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
          <div>{'\u2191'} {tokenSymbol} tokens</div>
          <div>{'\u2192'} Date (UTC)</div>
        </div>
      )}
    </div>
  );
}
