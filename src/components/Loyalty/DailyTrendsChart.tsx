import React, { useRef } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { DailyTrend } from '@site/src/hooks/useStakerLoyalty';

interface DailyTrendsChartProps {
  dailyTrends: DailyTrend[];
}

export default function DailyTrendsChart({
  dailyTrends,
}: DailyTrendsChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const template = getPlotlyTemplate(colorMode === 'dark');

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Daily Loyalty Trends',
    trackClick: true,
    trackZoom: true,
  });

  const sorted = [...dailyTrends].sort((a, b) => a.date.localeCompare(b.date));

  const dates = sorted.map((t) => t.date);
  const compounded = sorted.map((t) => t.compound_amount);
  const claimed = sorted.map((t) => t.claim_amount);
  const compoundRates = sorted.map((t) => t.compound_rate);

  return (
    <div
      ref={plotRef}
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Reward Allocation Over Time (Daily)</h3>

      <Plot
        data={[
          {
            x: dates,
            y: compounded,
            type: 'scatter',
            mode: 'lines',
            name: 'Compounded',
            fill: 'tozeroy',
            fillcolor: 'rgba(34, 197, 94, 0.3)',
            line: { color: '#22C55E', width: 2 },
            hovertemplate: '<b>%{x}</b><br>' +
              'Compounded: %{y:.2f} SOL<br>' +
              '<extra></extra>',
          },
          {
            x: dates,
            y: claimed,
            type: 'scatter',
            mode: 'lines',
            name: 'Claimed',
            fill: 'tonexty',
            fillcolor: 'rgba(239, 68, 68, 0.3)',
            line: { color: '#EF4444', width: 2 },
            hovertemplate: '<b>%{x}</b><br>' +
              'Claimed: %{y:.2f} SOL<br>' +
              '<extra></extra>',
          },
        ]}
        layout={{
          ...template.layout,
          xaxis: {
            title: 'Date',
            tickangle: -45,
          },
          yaxis: {
            title: 'Rewards (SOL)',
          },
          legend: {
            orientation: 'h',
            yanchor: 'bottom',
            y: 1.02,
            xanchor: 'right',
            x: 1,
          },
          margin: { l: 60, r: 40, t: 40, b: 100 },
          height: 400,
          hovermode: 'x unified',
        }}
        config={defaultPlotlyConfig}
        style={{ width: '100%' }}
      />
    </div>
  );
}
