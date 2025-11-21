import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { DailyDataPoint } from './types';

interface DailyStackedChartProps {
  data: DailyDataPoint[];
}

export default function DailyStackedChart({ data }: DailyStackedChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

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

  // Track visibility of Fusion Dominance (secondary axis trace)
  const [showFusionDominance, setShowFusionDominance] = useState(true);

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
      visible: showFusionDominance ? true : 'legendonly',
    },
  ];

  // Handle legend clicks to toggle Fusion Dominance visibility
  const handleLegendClick = (event: Readonly<any>) => {
    if (typeof event?.curveNumber === 'number' && event.curveNumber === 2) {
      setShowFusionDominance(prev => !prev);
      return false;
    }
    return true;
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
        data={traces}
        layout={{
          ...template.layout,
          title: {
            text: 'Orca vs. Fusion-generated Protocol Revenue',
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
              text: 'Cumulative Revenue (SOL)',
              font: { size: 14 },
              standoff: 20,
            },
            side: 'left',
            tickfont: { size: isMobile ? 8 : 12 },
          },
          yaxis2: {
            title: showFusionDominance && !isMobile ? {
              text: 'Fusion Dominance (%)',
              font: { size: 14 },
            } : '',
            overlaying: 'y',
            side: 'right',
            range: [0, 100],
            showgrid: true,
            gridcolor: 'rgba(255, 87, 34, 0.1)',
            gridwidth: 1,
            showline: true,
            linecolor: 'rgba(255, 87, 34, 0.3)',
            linewidth: 1,
            automargin: showFusionDominance && !isMobile,
            tickfont: { size: isMobile ? 8 : 12 },
            showticklabels: showFusionDominance,
            visible: showFusionDominance,
          },
          showlegend: true,
          legend: {
            orientation: 'h',
            y: isMobile ? -0.1 : -0.15,
            yanchor: 'top',
            x: 0.5,
            xanchor: 'center',
            font: { size: isMobile ? 10 : 12 },
          },
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: {
              l: 25,
              r: showFusionDominance ? 20 : 5,
              t: 30,
              b: 80,
            },
          } : {
            margin: {
              l: 70,
              r: showFusionDominance ? 80 : 40,
              t: 50,
              b: 80,
            },
          }),
          hovermode: 'x unified',
        }}
        config={{
          ...getResponsivePlotlyConfig(),
          staticPlot: false,
          scrollZoom: !isMobile,
        }}
        style={{ width: '100%', height: isMobile ? '350px' : '400px' }}
        useResizeHandler={true}
        onLegendClick={handleLegendClick}
      />
      {isMobile && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: '0px',
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>↑ Cumulative Revenue (SOL){showFusionDominance && ' / Fusion Dominance (%)'}</div>
          <div>→ Date (UTC)</div>
        </div>
      )}
    </div>
  );
}
