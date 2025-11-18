import React, { useRef } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
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
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <h3 style={{ marginTop: 0, textAlign: 'center' }}>{title}</h3>
      {description && <p style={{ color: 'var(--ifm-color-emphasis-700)' }}>{description}</p>}
      {sorted.length === 0 ? (
        <div style={{ padding: '24px', color: 'var(--ifm-color-emphasis-600)' }}>
          No data available for the selected range.
        </div>
      ) : (
        <Plot
          data={[
            {
              x,
              y,
              type: 'scatter',
              mode: 'lines+markers',
              marker: { color: accentColor },
              line: { color: accentColor },
              hovertemplate: '%{x}<br><b>%{y}</b> users<extra></extra>',
            },
          ]}
          layout={{
            ...template.layout,
            autosize: true,
            height: 420,
            margin: { l: 70, r: 24, t: 16, b: 48 },
            xaxis: {
              ...template.layout.xaxis,
              title: '',
              type: 'date',
              spikecolor: spikeColor,
              spikedash: 'dot',
              spikethickness: 1,
            },
            yaxis: {
              ...template.layout.yaxis,
              title: {
                text: yAxisLabel,
                standoff: 20,
              },
              rangemode: 'tozero',
              spikecolor: spikeColor,
              spikedash: 'dot',
              spikethickness: 1,
            },
            hovermode: 'x',
          }}
          config={defaultPlotlyConfig}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
}

