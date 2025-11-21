import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
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

  // Mobile detection
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
        padding: isMobile ? '16px 0px 16px 0px' : '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      <h3 style={{
        marginTop: 0,
        marginLeft: isMobile ? '16px' : 0,
        textAlign: 'center',
        fontSize: isMobile ? '1.1rem' : '1.5rem',
      }}>Reward Allocation Over Time (Daily)</h3>

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
            line: { color: '#22C55E', width: isMobile ? 1.5 : 2 },
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
            line: { color: '#EF4444', width: isMobile ? 1.5 : 2 },
            hovertemplate: '<b>%{x}</b><br>' +
              'Claimed: %{y:.2f} SOL<br>' +
              '<extra></extra>',
          },
        ]}
        layout={{
          ...template.layout,
          xaxis: {
            title: isMobile ? '' : {
              text: 'Date (UTC)',
              font: { size: 14 },
            },
            tickangle: isMobile ? -45 : -45,
            tickfont: { size: isMobile ? 9 : 12 },
          },
          yaxis: {
            title: isMobile ? '' : {
              text: 'Rewards (SOL)',
              font: { size: 14 },
              standoff: 20,
            },
            tickfont: { size: isMobile ? 8 : 12 },
          },
          legend: {
            orientation: 'h',
            yanchor: 'bottom',
            y: isMobile ? -0.1 : 1.02,
            xanchor: isMobile ? 'center' : 'right',
            x: isMobile ? 0.5 : 1,
            font: { size: isMobile ? 10 : 12 },
          },
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: { l: 25, r: 5, t: 16, b: 80 },
            height: 350,
          } : {
            margin: { l: 60, r: 40, t: 40, b: 100 },
            height: 400,
          }),
          hovermode: 'x unified',
        }}
        config={{
          ...getResponsivePlotlyConfig(),
          staticPlot: false,
          scrollZoom: !isMobile,
        }}
        style={{ width: '100%' }}
      />
      {isMobile && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: '0px',
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>↑ Rewards (SOL)</div>
          <div>→ Date (UTC)</div>
        </div>
      )}
    </div>
  );
}
