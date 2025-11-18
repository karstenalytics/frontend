import React, { useRef } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { DailyDataPoint } from './types';

interface DailyStackedChartProps {
  data: DailyDataPoint[];
}

export default function DailyStackedChart({ data }: DailyStackedChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Daily Revenue Stacked',
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

  const dates = data.map(d => d.date);
  
  // Calculate cumulative values for Orca (including Other) and Fusion
  let cumulativeOrca = 0;
  let cumulativeFusion = 0;
  
  const orcaCumulative = data.map(d => {
    cumulativeOrca += (d.orca_sol || 0) + (d.other_sol || 0);
    return cumulativeOrca;
  });
  
  const fusionCumulative = data.map(d => {
    cumulativeFusion += (d.fusion_sol || 0);
    return cumulativeFusion;
  });

  // Calculate Fusion dominance (Fusion / Total) for secondary y-axis
  const fusionDominance = fusionCumulative.map((fusion, i) => {
    const orca = orcaCumulative[i];
    const total = orca + fusion;
    return total > 0 ? (fusion / total) * 100 : 0;
  });

  const traces: Data[] = [
    {
      x: dates,
      y: orcaCumulative,
      name: 'Orca',
      type: 'scatter',
      mode: 'none',
      stackgroup: 'one',
      fillcolor: 'rgba(255, 193, 7, 0.6)', // Yellow-ish color
      line: { width: 0, color: 'rgba(255, 193, 7, 1)' },
      hovertemplate: '<b>%{x}</b><br>Orca: %{y:.2f} SOL<extra></extra>',
      yaxis: 'y',
    },
    {
      x: dates,
      y: fusionCumulative,
      name: 'Fusion',
      type: 'scatter',
      mode: 'none',
      stackgroup: 'one',
      fillcolor: 'rgba(0, 163, 180, 0.6)', // Teal color
      line: { width: 0, color: 'rgba(0, 163, 180, 1)' },
      hovertemplate: '<b>%{x}</b><br>Fusion: %{y:.2f} SOL<extra></extra>',
      yaxis: 'y',
    },
    {
      x: dates,
      y: fusionDominance,
      name: 'Fusion Dominance',
      type: 'scatter',
      mode: 'lines',
      line: { width: 2, color: 'rgba(255, 87, 34, 0.8)', dash: 'dash' }, // Orange dashed line
      hovertemplate: '<b>%{x}</b><br>Fusion Dominance: %{y:.1f}%<extra></extra>',
      yaxis: 'y2',
    },
  ];

  return (
    <div ref={plotRef} style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      padding: '16px',
      marginBottom: '24px',
    }}>
      <Plot
        data={traces}
        layout={{
          ...template.layout,
          title: {
            text: 'Orca vs. Fusion-generated Protocol Revenue',
            font: { size: 18, weight: 600 },
          },
          xaxis: {
            ...template.layout.xaxis,
            type: 'date',
          },
          yaxis: {
            ...template.layout.yaxis,
            title: {
              text: 'Cumulative Revenue (SOL)',
              standoff: 20,
            },
            side: 'left',
          },
          yaxis2: {
            title: {
              text: 'Fusion Dominance (%)',
            },
            overlaying: 'y',
            side: 'right',
            range: [0, 100],
            showgrid: false,
            automargin: true,
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            y: -0.15,
            yanchor: 'top',
            x: 0.5,
            xanchor: 'center',
          },
          hovermode: 'x unified',
        }}
        config={defaultPlotlyConfig}
        style={{ width: '100%', height: '400px' }}
        useResizeHandler={true}
      />
    </div>
  );
}
