import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';

// Daily by type data comes in "long format"
interface DailyTypeDataPoint {
  date: string;
  type: string;
  sol_equivalent: number;
}

interface DailyStackedBarChartProps {
  data: DailyTypeDataPoint[];
  title?: string;
}

// Type name mapping - technical to display names
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

export default function DailyStackedBarChart({
  data,
  title = 'Transaction Types per Day'
}: DailyStackedBarChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

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
  useChartTracking(plotRef, {
    chartName: 'Daily Revenue Bar',
    trackClick: true,
    trackZoom: true,
  });

  // Measure container width for dynamic legend sizing
  const [containerWidth, setContainerWidth] = useState(0);
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

  if (!data || data.length === 0) {
    return <div>No daily data available</div>;
  }

  // Data comes in "long format": [{date, type, sol_equivalent}, ...]
  // Need to transform to get unique dates and types
  
  // Filter out data points with zero or near-zero SOL values
  const filteredData = data.filter(item => Number(item.sol_equivalent) > 0.001);
  
  // Get unique dates in sorted order
  const uniqueDates = Array.from(new Set(filteredData.map(d => d.date))).sort();
  
  // Calculate total SOL per type across all days
  const typeTotals = new Map<string, number>();
  filteredData.forEach(item => {
    const type = String(item.type || 'Unknown');
    const sol = Number(item.sol_equivalent) || 0;
    typeTotals.set(type, (typeTotals.get(type) || 0) + sol);
  });

  // Group types by display name to combine them
  const displayNameTotals = new Map<string, { displayName: string; types: string[]; total: number }>();
  
  Array.from(typeTotals.entries()).forEach(([type, total]) => {
    const displayName = getDisplayName(type);
    if (displayNameTotals.has(displayName)) {
      const existing = displayNameTotals.get(displayName)!;
      existing.types.push(type);
      existing.total += total;
    } else {
      displayNameTotals.set(displayName, { displayName, types: [type], total });
    }
  });

  // Filter out types with zero total and sort by total
  const sortedDisplayNames = Array.from(displayNameTotals.values())
    .filter(group => group.total > 0)  // Exclude types with 0 SOL
    .sort((a, b) => b.total - a.total);
  
  // Show top 9 + "Other" = 10 total traces (if there are more than 10 types)
  // Or show all types if 10 or fewer
  const hasOther = sortedDisplayNames.length > 10;
  const top10Groups = hasOther ? sortedDisplayNames.slice(0, 9) : sortedDisplayNames.slice(0, 10);
  const otherGroups = hasOther ? sortedDisplayNames.slice(9) : [];

  // Build a map for quick lookup: date -> type -> sol_equivalent
  const dataMap = new Map<string, Map<string, number>>();
  filteredData.forEach(item => {
    const date = String(item.date);
    const type = String(item.type || 'Unknown');
    const sol = Number(item.sol_equivalent) || 0;
    
    if (!dataMap.has(date)) {
      dataMap.set(date, new Map());
    }
    dataMap.get(date)!.set(type, sol);
  });

  // Color palette - liquidations in red shades, others in design palette colors
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
    // Non-red colors from design palette (exclude orange/red-ish colors)
    return nonRedPalette[index % nonRedPalette.length];
  };

  // Calculate dynamic legend positioning based on number of items and container width
  const numLegendItems = hasOther ? 10 : top10Groups.length;

  // Use viewport width as fallback if container not yet measured
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);

  // Estimate columns based on container width and average legend item width
  // Mobile: ~150px per item, Desktop: ~250px per item
  const avgItemWidth = isMobile ? 150 : 250;
  const availableWidth = effectiveWidth - (isMobile ? 50 : 80); // Account for margins
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);

  // Each row is ~20-25px tall
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;

  // Position legend close to chart (no bottom annotations in this chart)
  const legendY = isMobile ? -0.1 : -0.2;

  // Bottom margin needs space for legend
  const bottomMargin = isMobile ? legendHeight + 10 : 80;

  // Calculate total chart height
  // Mobile: top margin + plot area + bottom margin (which includes legend)
  const plotAreaBase = isMobile ? 350 : 450;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 500;

  // DEBUG: Log layout calculations
  console.log('=== DAILY STACKED BAR LAYOUT DEBUG ===');
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
  console.log(`Bottom Margin (legend): ${bottomMargin}px`);
  console.log(`Plot Area Base: ${plotAreaBase}px`);
  console.log(`Chart Height (30 + ${plotAreaBase} + ${bottomMargin}): ${chartHeight}px`);
  console.log('======================================');

  // Create traces for top 10 groups + "Other"
  const traces: Data[] = [];

  // Add traces for top 10 display name groups (combining technical types with same display name)
  top10Groups.forEach((group, index) => {
    const values = uniqueDates.map(date => {
      const dayData = dataMap.get(date);
      // Sum all technical types that map to this display name
      return group.types.reduce((sum, typeKey) => {
        return sum + (dayData?.get(typeKey) || 0);
      }, 0);
    });
    
    const color = getColor(group.displayName, index);

    traces.push({
      x: uniqueDates,
      y: values,
      name: group.displayName,
      type: 'bar',
      marker: { color },
      hovertemplate: `<b>${group.displayName}</b><br>%{x}<br>%{y:.2f} SOL<extra></extra>`,
    });
  });

  // Add "Other" category if there are more than 10 groups
  if (otherGroups.length > 0) {
    const otherValues = uniqueDates.map(date => {
      const dayData = dataMap.get(date);
      return otherGroups.reduce((sum, group) => {
        return sum + group.types.reduce((typeSum, typeKey) => {
          return typeSum + (dayData?.get(typeKey) || 0);
        }, 0);
      }, 0);
    });

    traces.push({
      x: uniqueDates,
      y: otherValues,
      name: 'Other',
      type: 'bar',
      marker: { color: 'rgba(156, 163, 175, 0.8)' }, // gray
      hovertemplate: '<b>Other</b><br>%{x}<br>%{y:.2f} SOL<extra></extra>',
    });
  }

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
            text: title,
            font: { size: isMobile ? 15 : 18, weight: 600 },
          },
          xaxis: {
            ...template.layout.xaxis,
            type: 'date',
            tickangle: isMobile ? 0 : 0,
            title: isMobile ? '' : {
              text: 'Date (UTC)',
              font: { size: 14 },
            },
            tickfont: { size: isMobile ? 9 : 12 },
          },
          yaxis: {
            ...template.layout.yaxis,
            title: isMobile ? '' : {
              text: 'Daily Revenue (SOL)',
              font: { size: 14 },
            },
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
          },
          hovermode: 'closest',
          ...(isMobile ? {
            margin: {
              l: 25,
              r: 0,
              t: 30,
              b: bottomMargin,
            },
          } : {
            margin: {
              l: 60,
              r: 20,
              t: 50,
              b: 80,
            },
          }),
        }}
        config={getResponsivePlotlyConfig()}
        style={{ width: '100%', height: `${chartHeight}px` }}
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
          <div>↑ Daily Revenue (SOL)</div>
          <div>→ Date (UTC)</div>
        </div>
      )}
    </div>
  );
}
