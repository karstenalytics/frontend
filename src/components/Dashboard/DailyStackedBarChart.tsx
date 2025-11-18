import React, { useRef } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
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

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Daily Revenue Bar',
    trackClick: true,
    trackZoom: true,
  });

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
      padding: '16px',
      marginBottom: '24px',
    }}>
      <Plot
        data={traces}
        layout={{
          ...template.layout,
          title: {
            text: title,
            font: { size: 18, weight: 600 },
          },
          xaxis: {
            ...template.layout.xaxis,
            type: 'date',
            tickangle: 0,
          },
          yaxis: {
            ...template.layout.yaxis,
            title: {
              text: 'Daily Revenue<br>(SOL)',
            },
          },
          barmode: 'stack',
          showlegend: true,
          legend: {
            orientation: 'h',
            yanchor: 'top',
            y: -0.2,
            xanchor: 'center',
            x: 0.5,
          },
          hovermode: 'closest',
        }}
        config={defaultPlotlyConfig}
        style={{ width: '100%', height: '500px' }}
        useResizeHandler={true}
      />
    </div>
  );
}
