import React, { useRef } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
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

  return (
    <div
      ref={plotRef}
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Treasury TUNA Allocation</h3>
      {maxSupply != null && (
        <p style={{ color: 'var(--ifm-color-emphasis-700)' }}>
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
            height: 420,
            margin: { l: 70, r: 24, t: 16, b: 32 },
            hovermode: 'x unified',
            xaxis: {
              ...template.layout.xaxis,
              type: 'date',
              spikecolor: spikeColor,
              spikedash: 'dot',
              spikethickness: 1,
            },
            yaxis: {
              ...template.layout.yaxis,
              title: 'TUNA tokens',
              ...(yRange ? { range: yRange } : { rangemode: 'tozero' }),
              spikecolor: spikeColor,
              spikedash: 'dot',
              spikethickness: 1,
            },
            legend: {
              orientation: 'h',
              y: -0.15,
              x: 0.5,
              xanchor: 'center',
            },
          }}
          config={defaultPlotlyConfig}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
}
