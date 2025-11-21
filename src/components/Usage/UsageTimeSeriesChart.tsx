import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { UsageDailyRecord } from '@site/src/hooks/useUsageMetrics';

interface UsageTimeSeriesChartProps {
  data: UsageDailyRecord[];
  title: string;
  yAxisLabel?: string;
  description?: React.ReactNode;
  cumulative?: boolean;
}

export default function UsageTimeSeriesChart({
  data,
  title,
  yAxisLabel = 'Users',
  description,
  cumulative = false,
}: UsageTimeSeriesChartProps): React.ReactElement {
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

  // Get accent color - Plotly doesn't support CSS variables, so we need actual hex values
  const accentColor = isDark ? '#14BCCD' : '#00A3B4';
  // Very subtle spike (crosshair) color
  const spikeColor = isDark ? '#1a2832' : '#cbd5e0';

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Usage Time Series',
    trackClick: true,
    trackZoom: true,
  });

  const sorted = [...(data || [])].sort((a, b) => a.date.localeCompare(b.date));
  const x = sorted.map((entry) => entry.date);

  let y: number[];
  if (cumulative) {
    // Calculate cumulative sum
    let runningTotal = 0;
    y = sorted.map((entry) => {
      runningTotal += entry.count;
      return runningTotal;
    });
  } else {
    y = sorted.map((entry) => entry.count);
  }

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
      <h3 style={{
        marginTop: 0,
        marginLeft: isMobile ? '16px' : 0,
        textAlign: 'center',
        fontSize: isMobile ? '1.1rem' : '1.5rem',
      }}>{title}</h3>
      {description && <p style={{
        color: 'var(--ifm-color-emphasis-700)',
        marginLeft: isMobile ? '16px' : 0,
        marginRight: isMobile ? '16px' : 0,
      }}>{description}</p>}
      {sorted.length === 0 ? (
        <div style={{ padding: '24px', color: 'var(--ifm-color-emphasis-600)' }}>
          No data available for the selected range.
        </div>
      ) : (
        <>
          <Plot
            data={[
              {
                x,
                y,
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: accentColor, size: isMobile ? 3 : 4 },
                line: { color: accentColor },
                hovertemplate: '%{x}<br><b>%{y}</b> users<extra></extra>',
              },
            ]}
            layout={{
              ...template.layout,
              autosize: true,
              height: isMobile ? 350 : 420,
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
                  text: yAxisLabel,
                  font: { size: 14 },
                  standoff: 20,
                },
                rangemode: 'tozero',
                tickfont: { size: isMobile ? 8 : 12 },
                spikecolor: spikeColor,
                spikedash: 'dot',
                spikethickness: 1,
              },
              hovermode: 'x',
              ...(isMobile ? {
                margin: {
                  l: 25,
                  r: 5,
                  t: 16,
                  b: 32,
                },
              } : {
                margin: {
                  l: 70,
                  r: 24,
                  t: 16,
                  b: 48,
                },
              }),
            }}
            config={getResponsivePlotlyConfig()}
            style={{ width: '100%', height: '100%' }}
          />
          {isMobile && (
            <div style={{
              fontSize: '13px',
              color: 'var(--ifm-color-secondary)',
              marginTop: '0px',
              marginLeft: '25px',
              lineHeight: '1.6',
            }}>
              <div>↑ {yAxisLabel}</div>
              <div>→ Date (UTC)</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

