import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import type { UserSegments } from '@site/src/hooks/useStakerLoyalty';

interface BehaviorPieChartProps {
  userSegments: UserSegments;
  totalUsers: number;
  currentActiveStakers?: number;
}

export default function BehaviorPieChart({
  userSegments,
  totalUsers,
  currentActiveStakers,
}: BehaviorPieChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const template = getPlotlyTemplate(colorMode === 'dark');

  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 996);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const plotRef1 = useRef<HTMLDivElement>(null);
  const plotRef2 = useRef<HTMLDivElement>(null);

  useChartTracking(plotRef1, {
    chartName: 'Staker Activity Overview',
    trackClick: true,
    trackZoom: true,
  });

  useChartTracking(plotRef2, {
    chartName: 'Reward Management Breakdown',
    trackClick: true,
    trackZoom: true,
  });

  const { by_behavior } = userSegments;

  // Calculate non-active stakers if currentActiveStakers is provided
  const nonActiveCount = currentActiveStakers ? currentActiveStakers - totalUsers : 0;

  if (!currentActiveStakers) {
    // Fallback to single chart if no active staker data
    return (
      <div
        ref={plotRef1}
        style={{
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-color-emphasis-200)',
          borderRadius: 'var(--ifm-global-radius)',
          padding: '24px',
          marginBottom: '32px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>How Stakers Manage Their Rewards</h3>

        <Plot
          data={[
            {
              type: 'pie',
              labels: ['Compound-only', 'Mixed Behavior', 'Claim-only'],
              values: [
                by_behavior.compound_only.count,
                by_behavior.mixed.count,
                by_behavior.claim_only.count,
              ],
              marker: {
                colors: ['#22C55E', '#F59E0B', '#EF4444'],
              },
              textinfo: 'label+percent',
              textposition: 'auto',
              hovertemplate: '<b>%{label}</b><br>' +
                '%{value} stakers (%{percent})<br>' +
                '<extra></extra>',
            },
          ]}
          layout={{
            ...template.layout,
            showlegend: true,
            legend: {
              orientation: 'h',
              yanchor: 'bottom',
              y: -0.2,
              xanchor: 'center',
              x: 0.5,
            },
            margin: { l: 10, r: 10, t: 20, b: 80 },
            height: 400,
            autosize: true,
            dragmode: isMobile ? false : 'zoom',
          }}
          config={{
            ...getResponsivePlotlyConfig(),
            staticPlot: false,
            scrollZoom: !isMobile,
          }}
          style={{ width: '100%', height: '400px' }}
          useResizeHandler={true}
        />

        <p style={{ color: 'var(--ifm-color-emphasis-700)', marginTop: '16px', marginBottom: 0 }}>
          Based on <strong>{totalUsers.toLocaleString()}</strong> unique stakers
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      <h3 style={{ marginTop: 0, textAlign: 'center' }}>How Stakers Manage Their Rewards</h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
        gap: isMobile ? '24px' : '48px',
        alignItems: 'center'
      }}>
        {/* Left Pie: Overall Activity Split */}
        <div ref={plotRef1}>
          <h4 style={{ textAlign: 'center', marginTop: 0, marginBottom: '16px', fontSize: isMobile ? '14px' : '16px' }}>
            All Active Stakers
          </h4>
          <Plot
            data={[
              {
                type: 'pie',
                labels: ['Without Reward Activity', 'With Reward Activity'],
                values: [nonActiveCount, totalUsers],
                marker: {
                  colors: ['#9CA3AF', '#00A3B4'],
                },
                textinfo: 'label+percent',
                textposition: 'inside',
                insidetextorientation: 'horizontal',
                rotation: 120,
                direction: 'clockwise',
                textfont: {
                  size: 14, 
                },
                hovertemplate: '<b>%{label}</b><br>' +
                  '%{value} stakers (%{percent})<br>' +
                  '<extra></extra>',
              },
            ]}
            layout={{
              ...template.layout,
              showlegend: false,
              margin: { l: 10, r: 10, t: 10, b: 40 },
              height: 450,
              autosize: true,
            }}
            config={getResponsivePlotlyConfig()}
            style={{ width: '100%', height: '450px' }}
            useResizeHandler={true}
          />
          <p style={{
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--ifm-color-emphasis-700)',
            marginTop: '8px',
            marginBottom: 0,
          }}>
            {currentActiveStakers.toLocaleString()} Total Active Stakers
          </p>
        </div>

        {/* Arrow Indicator - hidden on mobile */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
          }}>
            <svg width="60" height="32" viewBox="0 0 60 32">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="12"
                  markerHeight="12"
                  refX="10"
                  refY="6"
                  orient="auto"
                  fill="#00A3B4"
                >
                  <polygon points="0 0, 12 6, 0 12" />
                </marker>
              </defs>
              <line
                x1="0"
                y1="16"
                x2="56"
                y2="16"
                stroke="#00A3B4"
                strokeWidth="3"
                markerEnd="url(#arrowhead)"
              />
            </svg>
          </div>
        )}

        {/* Right Pie: Reward Activity Breakdown */}
        <div
          ref={plotRef2}
        >
          <h4 style={{ textAlign: 'center', marginTop: 0, marginBottom: '16px', fontSize: isMobile ? '14px' : '16px' }}>
            Stakers Actively Managing Rewards
          </h4>
          <Plot
            data={[
              {
                type: 'pie',
                labels: ['Compound-only', 'Mixed Behavior', 'Claim-only'],
                values: [
                  by_behavior.compound_only.count,
                  by_behavior.mixed.count,
                  by_behavior.claim_only.count,
                ],
                marker: {
                  colors: ['#22C55E', '#F59E0B', '#EF4444'],
                },
                textinfo: 'label+percent',
                textposition: 'auto',
                textfont: {
                  size: 14,
                },
                hovertemplate: '<b>%{label}</b><br>' +
                  '%{value} stakers (%{percent})<br>' +
                  '<extra></extra>',
              },
            ]}
            layout={{
              ...template.layout,
              showlegend: false,
              margin: { l: 10, r: 10, t: 10, b: 40 },
              height: 450,
              autosize: true,
            }}
            config={getResponsivePlotlyConfig()}
            style={{ width: '100%', height: '450px' }}
            useResizeHandler={true}
          />
          <p style={{
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--ifm-color-emphasis-700)',
            marginTop: '8px',
            marginBottom: 0,
          }}>
            {totalUsers.toLocaleString()} Stakers with Reward Activity
          </p>
        </div>
      </div>

      <p style={{ color: 'var(--ifm-color-emphasis-700)', marginTop: '24px', marginBottom: 0, textAlign: 'center' }}>
        <strong>{totalUsers.toLocaleString()}</strong> of <strong>{currentActiveStakers.toLocaleString()}</strong> active stakers
        ({((totalUsers / currentActiveStakers) * 100).toFixed(1)}%) actively managed rewards during the analysis period
      </p>
    </div>
  );
}
