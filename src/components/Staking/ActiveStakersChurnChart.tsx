import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import ChartHeader from '@site/src/components/common/ChartHeader';
import type { ActiveStakersDaily, DailyChurn } from '@site/src/hooks/useActiveStakers';

interface ActiveStakersChurnChartProps {
  dailyCounts: ActiveStakersDaily[];
  dailyChurn: DailyChurn[];
  stakeToken?: string;
}

export default function ActiveStakersChurnChart({
  dailyCounts,
  dailyChurn,
  stakeToken = 'FAF',
}: ActiveStakersChurnChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 996 : false
  );
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 996);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const accentColor = isDark ? '#14BCCD' : '#00A3B4';
  const joinedColor = 'rgba(39, 174, 96, 0.5)';   // #27AE60 from colorway
  const leftColor = 'rgba(192, 57, 43, 0.5)';     // #C0392B from colorway
  const spikeColor = isDark ? '#1a2832' : '#cbd5e0';

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Active Stakers Churn',
    trackClick: true,
    trackZoom: true,
  });

  // Align data by date
  const churnMap = new Map(dailyChurn.map(d => [d.date, d]));
  const sorted = [...dailyCounts].sort((a, b) => a.date.localeCompare(b.date));

  const dates = sorted.map(d => d.date);
  const counts = sorted.map(d => d.count);
  const joined = sorted.map(d => churnMap.get(d.date)?.joined ?? 0);
  const left = sorted.map(d => -(churnMap.get(d.date)?.left ?? 0)); // negative for downward bars

  // Skip early days (rapid onboarding spike) for right-axis autoscale
  const WARMUP_DAYS = 14;
  const steadyJoined = joined.slice(WARMUP_DAYS);
  const steadyLeft = left.slice(WARMUP_DAYS);
  const maxBar = Math.max(
    ...steadyJoined.map(Math.abs),
    ...steadyLeft.map(Math.abs),
    1,
  );

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
      {sorted.length === 0 ? (
        <div style={{ padding: '24px', color: 'var(--ifm-color-emphasis-600)' }}>
          No data available.
        </div>
      ) : (
        <>
          <ChartHeader title="Active Stakers" plotRef={plotRef} isMobile={isMobile} />
          <Plot
            data={[
              // Area line for net count (left axis)
              {
                x: dates,
                y: counts,
                type: 'scatter',
                mode: 'lines',
                name: `Active ${stakeToken} Stakers`,
                line: { color: accentColor, width: 2 },
                fill: 'tozeroy',
                fillcolor: isDark ? 'rgba(20, 188, 205, 0.15)' : 'rgba(0, 163, 180, 0.12)',
                hovertemplate: '<b>%{y}</b> active<extra></extra>',
              },
              // Joined bars (right axis, positive)
              {
                x: dates,
                y: joined,
                type: 'bar',
                name: 'New Stakers',
                yaxis: 'y2',
                marker: { color: joinedColor },
                hovertemplate: '<b>+%{y}</b> new stakers<extra></extra>',
              },
              // Left bars (right axis, negative)
              {
                x: dates,
                y: left,
                type: 'bar',
                name: 'Fully Unstaked',
                yaxis: 'y2',
                marker: { color: leftColor },
                hovertemplate: '<b>%{y}</b> fully unstaked<extra></extra>',
              },
            ]}
            layout={{
              ...template.layout,
              autosize: true,
              height: isMobile ? 350 : 420,
              showlegend: true,
              legend: {
                orientation: 'h',
                yanchor: 'top',
                y: isMobile ? -0.12 : -0.22,
                xanchor: 'center',
                x: 0.5,
                font: { size: isMobile ? 10 : 12 },
              },
              barmode: 'overlay',
              xaxis: {
                ...template.layout.xaxis,
                title: isMobile ? '' : { text: 'Date (UTC)', font: { size: 14 } },
                type: 'date',
                tickfont: { size: isMobile ? 9 : 12 },
                spikecolor: spikeColor,
                spikedash: 'dot',
                spikethickness: 1,
              },
              yaxis: {
                ...template.layout.yaxis,
                title: isMobile ? '' : {
                  text: 'Active Stakers',
                  font: { size: 14 },
                  standoff: 20,
                },
                rangemode: 'tozero',
                tickfont: { size: isMobile ? 8 : 12 },
                spikecolor: spikeColor,
                spikedash: 'dot',
                spikethickness: 1,
              },
              yaxis2: {
                title: isMobile ? undefined : {
                  text: 'Daily Change',
                  font: { size: 12, color: isDark ? 'rgba(200,200,200,0.7)' : 'rgba(80,80,80,0.7)' },
                },
                overlaying: 'y',
                side: 'right',
                showgrid: false,
                zeroline: true,
                zerolinecolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                showticklabels: true,
                tickfont: { size: isMobile ? 8 : 12 },
                range: [-maxBar * 1.15, maxBar * 1.15],
              },
              hovermode: 'x unified',
              dragmode: isMobile ? false : 'zoom',
              margin: isMobile
                ? { l: 25, r: 25, t: 10, b: 60 }
                : { l: 70, r: 70, t: 10, b: 72 },
            }}
            config={{ ...getResponsivePlotlyConfig(), staticPlot: false, scrollZoom: !isMobile }}
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
              <div>&#8593; Active Stakers / Daily Change (right)</div>
              <div>&#8594; Date (UTC)</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
