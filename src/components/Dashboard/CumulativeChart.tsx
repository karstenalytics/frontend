import React, { useRef } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { DailyDataPoint } from './types';

interface CumulativeChartProps {
  data: DailyDataPoint[];
}

export default function CumulativeChart({ data }: CumulativeChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);
  const accentColor = isDark ? '#4FD1C5' : '#00A3B4';

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Cumulative Revenue',
    trackClick: true,
    trackZoom: true,
  });

  if (data.length === 0) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-secondary)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        No daily data available
      </div>
    );
  }

  // Calculate cumulative totals
  const dates = data.map(d => d.date);
  let cumulativeTotal = 0;
  const cumulativeTotals = data.map(d => {
    cumulativeTotal += d.daily_total || 0;
    return cumulativeTotal;
  });

  const trace: Data = {
    x: dates,
    y: cumulativeTotals,
    name: 'Cumulative Revenue',
    type: 'scatter',
    mode: 'lines',
    fill: 'tozeroy',
    fillcolor: 'rgba(0, 163, 180, 0.2)',
    line: { width: 3, color: accentColor },
    hovertemplate: '<b>Cumulative</b><br>%{y:.2f} SOL<br>%{x}<extra></extra>',
  };

  return (
    <div ref={plotRef} style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      padding: '16px',
      marginBottom: '24px',
    }}>
      <Plot
        data={[trace]}
        layout={{
          ...template.layout,
          title: {
            text: 'Cumulative Revenue',
            font: { size: 18, weight: 600 },
          },
          xaxis: {
            ...template.layout.xaxis,
            title: 'Date',
            type: 'date',
          },
          yaxis: {
            ...template.layout.yaxis,
            title: 'Cumulative SOL',
          },
          showlegend: false,
          hovermode: 'x unified',
        }}
        config={defaultPlotlyConfig}
        style={{ width: '100%', height: '400px' }}
        useResizeHandler={true}
      />
    </div>
  );
}
