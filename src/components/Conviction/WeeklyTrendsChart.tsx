import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import ChartHeader from '@site/src/components/common/ChartHeader';
import type { WeeklyTrend } from '@site/src/hooks/useStakerConviction';

interface WeeklyTrendsChartProps {
  weeklyTrends: WeeklyTrend[];
}

export default function WeeklyTrendsChart({
  weeklyTrends,
}: WeeklyTrendsChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const template = getPlotlyTemplate(colorMode === 'dark');

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 996 : false
  );
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 996);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Weekly Conviction Trends',
    trackClick: true,
    trackZoom: true,
  });

  const sorted = [...weeklyTrends].sort((a, b) => a.week.localeCompare(b.week));

  const weeks = sorted.map((t) => t.week);
  const compounded = sorted.map((t) => t.compound_amount);
  const claimed = sorted.map((t) => t.claim_amount);
  const compoundRates = sorted.map((t) => t.compound_rate);

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
      <ChartHeader title="Reward Allocation Over Time" plotRef={plotRef} isMobile={isMobile} />
      <Plot
        data={[
          {
            x: weeks,
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
            x: weeks,
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
            title: 'Week',
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
          margin: { l: 60, r: 40, t: 10, b: 100 },
          height: 400,
          hovermode: 'x unified',
        }}
        config={getResponsivePlotlyConfig()}
        style={{ width: '100%' }}
      />

      <p style={{ color: 'var(--ifm-color-emphasis-700)', marginTop: '16px', marginBottom: 0 }}>
        The chart visualizes the <strong>5.3% vs 94.7%</strong> split between compounded and
        claimed rewards across all weeks.
      </p>
    </div>
  );
}
