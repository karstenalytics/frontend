import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';

interface PositionMetric {
  date: string;
  daily_opened: number;
  daily_closed: number;
  cumulative_opened: number;
  cumulative_closed: number;
  net_open: number;
}

interface PositionGrowthChartProps {
  data: PositionMetric[];
}

export default function PositionGrowthChart({ data }: PositionGrowthChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);
  const accentColor = isDark ? '#4FD1C5' : '#00A3B4';
  const greenColor = isDark ? '#68D391' : '#38A169';
  const redColor = isDark ? '#FC8181' : '#E53E3E';

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
        No position data available
      </div>
    );
  }

  const dates = data.map(d => d.date);

  // Main trace: Net open positions (area chart)
  const netOpenTrace: any = {
    x: dates,
    y: data.map(d => d.net_open),
    name: 'Open Positions',
    type: 'scatter',
    mode: 'lines',
    fill: 'tozeroy',
    fillcolor: isDark ? 'rgba(79, 209, 197, 0.2)' : 'rgba(0, 163, 180, 0.2)',
    line: { width: 4, color: accentColor },
    hovertemplate: '<b>Open Positions</b>: %{y}<br>%{x}<extra></extra>',
  };

  // Secondary trace: Daily opened (thin line)
  const dailyOpenedTrace: any = {
    x: dates,
    y: data.map(d => d.daily_opened),
    name: 'Daily Opened',
    type: 'scatter',
    mode: 'lines',
    line: { width: 1, color: greenColor, dash: 'dot' },
    hovertemplate: '<b>Opened</b>: %{y}<br>%{x}<extra></extra>',
    visible: 'legendonly',
  };

  // Tertiary trace: Daily closed (thin line)
  const dailyClosedTrace: any = {
    x: dates,
    y: data.map(d => d.daily_closed),
    name: 'Daily Closed',
    type: 'scatter',
    mode: 'lines',
    line: { width: 1, color: redColor, dash: 'dot' },
    hovertemplate: '<b>Closed</b>: %{y}<br>%{x}<extra></extra>',
    visible: 'legendonly',
  };

  return (
    <div style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      padding: '16px',
      marginBottom: '24px',
    }}>
      <Plot
        data={[netOpenTrace, dailyOpenedTrace, dailyClosedTrace]}
        layout={{
          ...template.layout,
          title: {
            text: 'Open Positions Over Time',
            font: { size: 16, color: 'var(--ifm-font-color-base)' },
          },
          xaxis: {
            ...template.layout.xaxis,
            title: 'Date',
          },
          yaxis: {
            ...template.layout.yaxis,
            title: 'Number of Positions',
          },
          hovermode: 'x unified',
          showlegend: true,
          legend: {
            x: 0.01,
            y: 0.99,
            xanchor: 'left',
            yanchor: 'top',
            bgcolor: 'rgba(0,0,0,0)',
          },
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: {
              l: 25,
              r: 5,
              t: 30,
              b: 32,
            },
          } : {}),
        }}
        config={{
          ...getResponsivePlotlyConfig(),
          staticPlot: false,
          scrollZoom: !isMobile,
        }}
        style={{ width: '100%', height: isMobile ? '350px' : '500px' }}
        useResizeHandler={true}
      />
    </div>
  );
}
