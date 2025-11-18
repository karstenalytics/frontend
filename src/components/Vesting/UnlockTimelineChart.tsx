import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';

interface UnlockTimelineChartProps {
  timeline: Record<string, number>;
  stakedTimeline: Record<string, number>;
  totalSchedules: number;
}

export default function UnlockTimelineChart({
  timeline,
  stakedTimeline,
  totalSchedules,
}: UnlockTimelineChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const template = getPlotlyTemplate(colorMode === 'dark');
  const isDark = colorMode === 'dark';
  const manifestPath = useBaseUrl('/data/_manifest.json');

  // Fetch the last data update date from manifest
  const [lastDataDate, setLastDataDate] = useState<string | null>(null);

  useEffect(() => {
    fetch(manifestPath)
      .then(res => res.json())
      .then(manifest => {
        // Extract date from generated_at timestamp (e.g., "2025-11-15T23:59:59+00:00")
        const date = manifest.generated_at.split('T')[0];
        setLastDataDate(date);
      })
      .catch(err => {
        console.error('Failed to load manifest:', err);
        // Fallback to using the last date in timeline if manifest fails
        setLastDataDate(null);
      });
  }, [manifestPath]);

  // Plotly doesn't support CSS variables, use actual hex values
  const accentColor = isDark ? '#14BCCD' : '#00A3B4';
  const accentTransparent = isDark ? 'rgba(20, 188, 205, 0.2)' : 'rgba(0, 163, 180, 0.2)';
  const stakedColor = isDark ? '#F59E0B' : '#D97706'; // Amber/orange for staked
  // Very subtle spike (crosshair) color
  const spikeColor = isDark ? '#1a2832' : '#cbd5e0';

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Vesting Unlock Timeline',
    trackClick: true,
    trackZoom: true,
  });

  // Convert timeline to arrays
  const sorted = Object.entries(timeline).sort(([a], [b]) => a.localeCompare(b));
  const dates = sorted.map(([date]) => date);
  const locked = sorted.map(([, amount]) => amount);

  // Convert staked timeline to arrays (use same dates as locked)
  const staked = dates.map(date => stakedTimeline[date] ?? 0);

  const hasData = sorted.length > 0;
  const hasStakedData = Object.keys(stakedTimeline).length > 0;

  // Use the last data update date from manifest, or fallback to last date in timeline
  const dataDate = lastDataDate || (dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString().split('T')[0]);

  // Filter staked data to only show up to the manifest date
  const stakedDatesFiltered: string[] = [];
  const stakedValuesFiltered: number[] = [];
  dates.forEach((date, idx) => {
    if (date <= dataDate && stakedTimeline[date] !== undefined) {
      stakedDatesFiltered.push(date);
      stakedValuesFiltered.push(staked[idx]);
    }
  });

  // Get the last staked value for the pulsating marker
  const lastStakedDate = stakedDatesFiltered.length > 0 ? stakedDatesFiltered[stakedDatesFiltered.length - 1] : null;
  const lastStakedValue = stakedValuesFiltered.length > 0 ? stakedValuesFiltered[stakedValuesFiltered.length - 1] : null;

  const currentLocked = timeline[dataDate] ?? 0;
  const currentStaked = stakedTimeline[dataDate] ?? 0;

  const peakLocked = hasData ? Math.max(...locked) : 0;
  const peakStaked = hasStakedData ? Math.max(...staked) : 0;

  // Subtle vertical line for "Latest Data" marker
  const latestDataLineColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';

  return (
    <div
      ref={plotRef}
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-color-emphasis-200)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: '24px',
        marginBottom: '32px',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Vesting Unlock Timeline</h3>
      <p style={{ color: 'var(--ifm-color-emphasis-700)' }}>
        Total vesting schedules: {totalSchedules}
      </p>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div className="badge badge--primary" style={{ padding: '12px 16px', fontSize: '14px' }}>
          <strong>{currentLocked.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> TUNA currently locked
        </div>
        {hasStakedData && (
          <div className="badge badge--warning" style={{ padding: '12px 16px', fontSize: '14px' }}>
            <strong>{currentStaked.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> TUNA staked in wallets with vesting
          </div>
        )}
        <div className="badge badge--info" style={{ padding: '12px 16px', fontSize: '14px' }}>
          <strong>{peakLocked.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> TUNA peak locked
        </div>
      </div>

      {!hasData ? (
        <div style={{ padding: '24px', color: 'var(--ifm-color-emphasis-600)' }}>
          No vesting schedules found.
        </div>
      ) : (
        <>
          <style>
            {`
              @keyframes pulse-glow {
                0%, 100% {
                  opacity: 0.4;
                  transform: translate(-50%, -50%) scale(1);
                }
                50% {
                  opacity: 0.1;
                  transform: translate(-50%, -50%) scale(1.8);
                }
              }
              .vesting-chart-container {
                position: relative;
              }
              .pulse-marker-overlay {
                position: absolute;
                pointer-events: none;
                z-index: 10;
              }
              .pulse-ring {
                position: absolute;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background-color: ${stakedColor};
                animation: pulse-glow 2s ease-in-out infinite;
              }
            `}
          </style>
          <div className="vesting-chart-container">
            <Plot
              data={[
                {
                  x: dates,
                  y: locked,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Locked TUNA',
                  line: { color: accentColor, width: 2 },
                  fill: 'tozeroy',
                  fillcolor: accentTransparent,
                  hovertemplate: '%{x}<br><b>%{y:,.0f}</b> TUNA locked<extra></extra>',
                },
                ...(hasStakedData && stakedDatesFiltered.length > 0 ? [{
                  x: stakedDatesFiltered,
                  y: stakedValuesFiltered,
                  type: 'scatter' as const,
                  mode: 'lines' as const,
                  name: 'Staked TUNA',
                  line: { color: stakedColor, width: 2 },
                  hovertemplate: '%{x}<br><b>%{y:,.0f}</b> TUNA staked<extra></extra>',
                }] : []),
                ...(hasStakedData && lastStakedDate && lastStakedValue !== null ? [
                  // Outer glow ring
                  {
                    x: [lastStakedDate],
                    y: [lastStakedValue],
                    type: 'scatter' as const,
                    mode: 'markers' as const,
                    marker: {
                      color: stakedColor,
                      size: 16,
                      opacity: 0.3,
                    },
                    hoverinfo: 'skip' as const,
                    showlegend: false,
                  },
                  // Main marker
                  {
                    x: [lastStakedDate],
                    y: [lastStakedValue],
                    type: 'scatter' as const,
                    mode: 'markers' as const,
                    name: 'Current',
                    marker: {
                      color: stakedColor,
                      size: 10,
                      line: {
                        color: isDark ? '#1a1a1a' : '#ffffff',
                        width: 2,
                      },
                    },
                    hoverinfo: 'skip' as const,
                    showlegend: false,
                  }
                ] : []),
              ]}
              layout={{
                ...template.layout,
                xaxis: {
                  ...template.layout.xaxis,
                  title: 'Date',
                  type: 'date',
                  spikecolor: spikeColor,
                  spikedash: 'dot',
                  spikethickness: 1,
                },
                yaxis: {
                  ...template.layout.yaxis,
                  title: 'Locked TUNA',
                  spikecolor: spikeColor,
                  spikedash: 'dot',
                  spikethickness: 1,
                },
                shapes: [
                  {
                    type: 'line',
                    x0: dataDate,
                    x1: dataDate,
                    y0: 0,
                    y1: 1,
                    yref: 'paper',
                    line: {
                      color: latestDataLineColor,
                      width: 2,
                      dash: 'dash',
                    },
                  },
                ],
                annotations: [
                  {
                    x: dataDate,
                    y: 1,
                    yref: 'paper',
                    text: 'Now',
                    showarrow: false,
                    xanchor: 'left',
                    yanchor: 'bottom',
                    xshift: -16,
                    font: {
                      size: 12,
                      color: isDark ? '#e2e8f0' : '#333',
                    },
                    bgcolor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
                    borderpad: 4,
                  },
                ],
                showlegend: hasStakedData,
                legend: hasStakedData ? {
                  x: 1,
                  xanchor: 'right',
                  y: 1,
                  yanchor: 'top',
                  bgcolor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                  bordercolor: isDark ? '#444' : '#ddd',
                  borderwidth: 1,
                } : undefined,
                margin: { l: 80, r: 40, t: 20, b: 60 },
              }}
              config={defaultPlotlyConfig}
              style={{ width: '100%', height: '450px' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
