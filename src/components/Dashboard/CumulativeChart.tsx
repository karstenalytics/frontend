import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
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
      padding: isMobile ? '16px 0px 16px 0px' : '16px',
      marginBottom: '24px',
    }}>
      <Plot
        data={[trace]}
        layout={{
          ...template.layout,
          title: {
            text: 'Cumulative Revenue',
            font: { size: isMobile ? 15 : 18, weight: 600 },
          },
          xaxis: {
            ...template.layout.xaxis,
            title: isMobile ? '' : {
              text: 'Date (UTC)',
              font: { size: 14 },
            },
            type: 'date',
            tickfont: { size: isMobile ? 9 : 12 },
          },
          yaxis: {
            ...template.layout.yaxis,
            title: isMobile ? '' : {
              text: 'Cumulative SOL',
              font: { size: 14 },
              standoff: 20,
            },
            tickfont: { size: isMobile ? 8 : 12 },
          },
          showlegend: false,
          hovermode: 'x unified',
          ...(isMobile ? {
            margin: {
              l: 25,
              r: 5,
              t: 30,
              b: 32,
            },
          } : {}),
        }}
        config={getResponsivePlotlyConfig()}
        style={{ width: '100%', height: isMobile ? '350px' : '400px' }}
        useResizeHandler={true}
      />
      {isMobile && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: '0px',
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>↑ Cumulative SOL</div>
          <div>→ Date (UTC)</div>
        </div>
      )}
    </div>
  );
}
