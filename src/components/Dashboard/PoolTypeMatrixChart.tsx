import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';

interface PoolTypeData {
  pool_id: string;
  pool_label: string;
  total_sol: number;
  share_of_total: number;
  types: Array<{
    type: string;
    sol_equivalent: number;
    share_of_pool: number;
    share_of_total: number;
  }>;
}

interface PoolTypeMatrixChartProps {
  onSegmentClick?: (poolId: string, poolLabel: string, typeName: string, technicalTypes?: string[]) => void;
}

// Type name mapping - technical to display names (same as DailyStackedBarChart)
const TYPE_DISPLAY_NAMES: Record<string, string> = {
  'liquidate_position_orca_liquidation': 'Liquidate LP Position (Orca)',
  'tuna_liquidatetunalppositionorca': 'Liquidate LP Position (Orca)',
  'fusion_collectprotocolfees': 'Collect Protocol Fees (Fusion)',
  'openpositionwithliquidity': 'Open Position w. Liq. (Orca)',
  'tuna_liquidatepositionfusion': 'Liquidate LP Position (Fusion)',
  'tuna_liquidatetunalppositionfusion': 'Liquidate LP Position (Fusion)',
  'token_transfer': 'Token Transfer',
  'compound_fees_tuna': 'Collect & Compound (Orca)',
  'tuna_collectandcompoundfeesfusion': 'Collect & Compound (Fusion)',
  'liquidate_position_orca_sl_tp': 'Position SL/TP (Orca)',
  'tuna_increasetunalppositionfusion': 'Increase LP Position (Fusion)',
  'tuna_openandincreasetunalppositionfusion': 'Open & Increase LP (Fusion)',
  'tuna_increasetunalppositionorca': 'Increase LP Position (Orca)',
  'tuna_openandincreasetunalppositionorca': 'Open & Increase LP (Orca)',
  'liquidity_add_tuna': 'Add Liquidity (Tuna)',
  'tuna_addliquidityfusion': 'Add Liquidity (Fusion)',
  'tuna_addliquidityorca': 'Add Liquidity (Orca)',
  'tuna_openpositionwithliquidityfusion': 'Open Position w. Liq. (Fusion)',
  'TunaIncreasetunaspotpositionfusion': 'Increase Spot Position (Fusion)',
  'TunaOpenandincreasetunaspotpositionfusion': 'Open & Increase Spot (Fusion)',
  'TunaDecreasetunaspotpositionfusion': 'Decrease Spot Position (Fusion)',
  'TunaLiquidatetunaspotpositionfusion': 'Liquidate Spot Position (Fusion)',
  'ExcludedNonRevenue': 'Non-Revenue',
  'Unattributed': 'Unattributed',
};

function getDisplayName(technicalType: string): string {
  return TYPE_DISPLAY_NAMES[technicalType] || technicalType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function PoolTypeMatrixChart({ onSegmentClick }: PoolTypeMatrixChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);
  const poolTypePath = useBaseUrl('/data/pool_type_summary.json');

  const [data, setData] = useState<PoolTypeData[]>([]);
  const [loading, setLoading] = useState(true);

  // Detect mobile viewport
  // Initialize with actual window size to prevent hydration mismatch
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
  const [containerWidth, setContainerWidth] = useState(0);

  useChartTracking(plotRef, {
    chartName: 'Pool Type Matrix',
    trackClick: true,
    trackZoom: true,
  });

  // Measure container width for legend layout calculation
  useEffect(() => {
    if (plotRef.current) {
      const updateWidth = () => {
        setContainerWidth(plotRef.current?.offsetWidth || 0);
      };
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  // Helper function to format pool labels (prefer swapping pair/protocol for pools)
  const formatPoolLabel = (label: string): string => {
    // Pattern 1: "Orca (SOL-USDC)" -> "SOL-USDC<br>Orca"
    const parenMatch = label.match(/^(.+?)\s+\((.+?)\)$/);
    if (parenMatch) {
      const protocol = parenMatch[1];
      const pair = parenMatch[2];
      return `${pair}<br>${protocol}`;
    }

    // Pattern 2: "Fusion SOL-USDC" -> "SOL-USDC<br>Fusion"
    const spaceMatch = label.match(/^(Fusion|Orca)\s+(.+)$/);
    if (spaceMatch) {
      const protocol = spaceMatch[1];
      const pair = spaceMatch[2];
      return `${pair}<br>${protocol}`;
    }

    // Fallback: return as-is
    return label;
  };

  useEffect(() => {
    fetch(poolTypePath)
      .then(response => response.json())
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading pool-type matrix data:', err);
        setLoading(false);
      });
  }, [poolTypePath]);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading chart...</div>;
  }

  if (!data || data.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>No data available</div>;
  }

  // Build Marimekko chart data
  // Each pool gets a position on x-axis with width proportional to its share
  // Each type within a pool is a stacked segment

  const traces: Data[] = [];
  
  // Color palette - same as DailyStackedBarChart
  const nonRedPalette = [
    'rgba(0, 163, 180, 0.8)',    // teal (accent)
    'rgba(40, 95, 126, 0.8)',    // dark blue
    'rgba(26, 188, 156, 0.8)',   // turquoise
    'rgba(142, 68, 173, 0.8)',   // purple
    'rgba(44, 62, 80, 0.8)',     // dark gray
    'rgba(39, 174, 96, 0.8)',    // green
    'rgba(22, 160, 133, 0.8)',   // dark turquoise
    'rgba(41, 128, 185, 0.8)',   // blue
  ];

  const redPalette = [
    'rgba(239, 68, 68, 0.8)',   // red-500
    'rgba(220, 38, 38, 0.8)',   // red-600
    'rgba(185, 28, 28, 0.8)',   // red-700
  ];
  
  const getColor = (displayName: string, index: number): string => {
    // Only types that START with "Liquidate" get red
    if (displayName.startsWith('Liquidate')) {
      return redPalette[index % redPalette.length];
    }
    // Non-red colors from design palette
    return nonRedPalette[index % nonRedPalette.length];
  };

  // Group technical types by display name
  const displayNameGroups = new Map<string, string[]>();
  data.forEach(pool => {
    pool.types.forEach(t => {
      const displayName = getDisplayName(t.type);
      if (!displayNameGroups.has(displayName)) {
        displayNameGroups.set(displayName, []);
      }
      if (!displayNameGroups.get(displayName)!.includes(t.type)) {
        displayNameGroups.get(displayName)!.push(t.type);
      }
    });
  });

  // Calculate total revenue for each display name to determine top 10
  const displayNameRevenue = new Map<string, number>();
  displayNameGroups.forEach((technicalTypes, displayName) => {
    let totalRevenue = 0;
    data.forEach(pool => {
      technicalTypes.forEach(technicalType => {
        const typeData = pool.types.find(t => t.type === technicalType);
        if (typeData) {
          totalRevenue += typeData.sol_equivalent;
        }
      });
    });
    displayNameRevenue.set(displayName, totalRevenue);
  });

  // Sort by revenue and get top 10 display names
  const top10DisplayNames = Array.from(displayNameRevenue.entries())
    .sort((a, b) => b[1] - a[1])  // Sort descending by revenue
    .slice(0, 10)
    .map(([displayName]) => displayName);

  const top10Set = new Set(top10DisplayNames);

  // Assign colors to each display name
  const displayNameToColor: Record<string, string> = {};
  let colorIndex = 0;
  Array.from(displayNameGroups.keys()).forEach((displayName) => {
    displayNameToColor[displayName] = getColor(displayName, colorIndex);
    colorIndex++;
  });

  // Calculate cumulative x positions for pools
  let cumulativeX = 0;
  const poolPositions: Array<{ pool: string; xStart: number; xEnd: number; width: number }> = [];

  data.forEach(pool => {
    const width = pool.share_of_total;
    poolPositions.push({
      pool: formatPoolLabel(pool.pool_label),  // Apply label formatting
      xStart: cumulativeX,
      xEnd: cumulativeX + width,
      width: width,
    });
    cumulativeX += width;
  });

  // Calculate the actual range needed to show all bars fully
  const maxX = cumulativeX;

  // Create annotations for all pools (90° rotated on mobile, 45° on desktop)
  const annotations = poolPositions.map((poolPos) => {
    // Remove line breaks for rotated labels
    const labelText = poolPos.pool.replace(/<br>/g, ' ');
    return {
      x: poolPos.xStart + poolPos.width / 2,
      y: -0.02,  // Position just below the x-axis
      xref: 'x',
      yref: 'paper',
      text: labelText,
      showarrow: false,
      textangle: isMobile ? -90 : -45,
      font: { size: isMobile ? 9 : 11 },
      xanchor: 'right',
      yanchor: 'top',
    };
  });

  // Calculate dynamic legend positioning based on number of items and container width
  // Only showing top 10 types in legend
  const numLegendItems = 10;

  // Use viewport width as fallback if container not yet measured
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);

  // Estimate columns based on container width and average legend item width
  // Mobile: ~150px per item (reduced to fit more columns), Desktop: ~250px per item
  const avgItemWidth = isMobile ? 150 : 250;
  const availableWidth = effectiveWidth - (isMobile ? 50 : 80); // Account for margins
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);

  // Each row is ~20-25px tall
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;

  // Position legend below the rotated pool labels (110px space)
  // y is relative to plot area height, so -110px / 350px = -0.314
  // Use -0.32 to give small buffer below pool labels
  const legendY = isMobile ? -0.32 : -0.25;

  // Bottom margin needs space for pool labels (110px) + legend + small gap
  const bottomMargin = isMobile ? 110 + legendHeight + 10 : 140;

  // Axis notation sits at natural position below chart
  const axisNotationMarginTop = isMobile ? '0px' : '0px';

  // Calculate total chart height
  // Mobile: top margin + plot area + bottom margin (which includes pool labels + legend)
  const plotAreaBase = isMobile ? 350 : 500;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 600;

  // DEBUG: Log layout calculations
  // Always log to help diagnose issues
  console.log('=== POOL TYPE MATRIX LAYOUT DEBUG ===');
  console.log(`isMobile: ${isMobile}`);
  console.log(`Viewport: ${typeof window !== 'undefined' ? window.innerWidth : 'N/A'}px`);
  console.log(`Container Width: ${containerWidth}px`);
  console.log(`Effective Width (used): ${effectiveWidth}px`);
  console.log(`Available Width: ${availableWidth}px`);
  console.log(`Avg Item Width: ${avgItemWidth}px`);
  console.log(`Num Legend Items: ${numLegendItems}`);
  console.log(`Estimated Columns: ${estimatedColumns}`);
  console.log(`Estimated Rows: ${estimatedRows}`);
  console.log(`Row Height: ${rowHeight}px`);
  console.log(`Legend Height: ${legendHeight}px`);
  console.log(`Legend Y: ${legendY}`);
  console.log(`Bottom Margin (pool labels + legend): ${bottomMargin}px`);
  console.log(`Plot Area Base: ${plotAreaBase}px`);
  console.log(`Chart Height (30 + ${plotAreaBase} + ${bottomMargin}): ${chartHeight}px`);
  console.log(`Axis Notation marginTop: ${axisNotationMarginTop}`);
  console.log('=====================================');

  // Create traces for each display name (combining technical types with same display name)
  displayNameGroups.forEach((technicalTypes, displayName) => {
    const xValues: number[] = [];
    const yValues: number[] = [];
    const widths: number[] = [];
    const hoverTexts: string[] = [];
    const textLabels: string[] = [];
    const customData: Array<[string, string, string, string[]]> = [];  // [pool_id, pool_label, display_name, technical_types]

    poolPositions.forEach((poolPos, poolIdx) => {
      const pool = data[poolIdx];

      // Sum up all technical types that map to this display name for this pool
      let totalShareOfPool = 0;
      let totalSolEquivalent = 0;
      let totalShareOfTotal = 0;

      technicalTypes.forEach(technicalType => {
        const typeData = pool.types.find(t => t.type === technicalType);
        if (typeData) {
          totalShareOfPool += typeData.share_of_pool;
          totalSolEquivalent += typeData.sol_equivalent;
          totalShareOfTotal += typeData.share_of_total;
        }
      });

      // Only add a bar if there's data for this display name in this pool
      if (totalSolEquivalent > 0) {
        // Position bar at center of pool's x range
        const xCenter = poolPos.xStart + poolPos.width / 2;
        xValues.push(xCenter);
        // Use percentage of pool (0-100) instead of absolute SOL for normalized height
        yValues.push(totalShareOfPool * 100);
        widths.push(poolPos.width); // Full width - borders will create gaps
        hoverTexts.push(
          `<b>${pool.pool_label}</b><br>` +
          `Type: ${displayName}<br>` +
          `${totalSolEquivalent.toFixed(2)} SOL<br>` +
          `${(totalShareOfPool * 100).toFixed(1)}% of pool<br>` +
          `${(totalShareOfTotal * 100).toFixed(2)}% of total revenue`
        );
        // No text labels
        textLabels.push('');
        // Store both display name and technical types for filtering
        customData.push([pool.pool_id, pool.pool_label, displayName, technicalTypes]);
      }
    });

    if (xValues.length > 0) {
      traces.push({
        type: 'bar',
        x: xValues,
        y: yValues,
        width: widths,
        name: displayName,
        text: textLabels,
        textposition: 'inside',
        marker: {
          color: displayNameToColor[displayName],
          line: {
            color: isDark ? '#05080D' : '#ffffff',
            width: 1,  // Same thin border for both vertical and horizontal
          },
        },
        hovertemplate: '%{hovertext}<extra></extra>',
        hovertext: hoverTexts,
        customdata: customData,
        showlegend: top10Set.has(displayName),  // Only show top 10 in legend
      });
    }
  });

  return (
    <div ref={plotRef} style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      padding: isMobile ? '16px 0px 16px 0px' : '16px',
      marginBottom: '0px',
    }}>
      <Plot
        data={traces}
        layout={{
          ...template.layout,
          title: {
            text: 'Revenue Distribution: Pools × Transaction Types',
            font: { size: isMobile ? 15 : 18, weight: 600 },
          },
          xaxis: {
            ...template.layout.xaxis,
            title: isMobile ? '' : {
              text: 'Liquidity Pools (width = share of revenue)',
              standoff: 140,
              font: { size: 14 },
            },
            showticklabels: false,  // Hide tick labels, using annotations instead
            range: [0, maxX],
          },
          yaxis: {
            ...template.layout.yaxis,
            title: isMobile ? '' : {
              text: 'Share of Pool Revenue (%)',
              font: { size: 14 },
            },
            range: [0, 105],
            ticksuffix: '%',
            tickangle: 0,  // 0 = horizontal, -90 = vertical, -45 = diagonal
            tickfont: { size: isMobile ? 8 : 12 },
          },
          barmode: 'stack',
          showlegend: true,
          legend: {
            orientation: 'h',
            yanchor: 'top',
            y: legendY,
            xanchor: 'center',
            x: 0.5,
            font: { size: isMobile ? 10 : 12 },
            tracegroupgap: 5,
          },
          hovermode: 'closest',
          annotations: annotations,
          ...(isMobile ? {
            margin: {
              l: 25,
              r: 0,
              t: 30,
              b: bottomMargin,  // Space for rotated pool labels + legend
            },
          } : {
            margin: {
              l: 60,
              r: 10,
              t: 30,
              b: 140,  // Standard space for 45° labels on desktop
            },
          }),
        }}
        config={getResponsivePlotlyConfig()}
        style={{ width: '100%', height: `${chartHeight}px` }}
        useResizeHandler={true}
        onClick={(event: React.MouseEvent) => {
          if (event.points && event.points.length > 0 && onSegmentClick) {
            const point = event.points[0];
            const [poolId, poolLabel, displayName, technicalTypes] = point.customdata;
            onSegmentClick(poolId, poolLabel, displayName, technicalTypes);
          }
        }}
      />
      {isMobile && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: axisNotationMarginTop,
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>↑ Share of pool revenue</div>
          <div>→ Liquidity pools (width = share of revenue)</div>
        </div>
      )}
    </div>
  );
}
