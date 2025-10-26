import React from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
import type { SummaryData, GroupMode } from './types';

interface BreakdownChartProps {
  summary: SummaryData;
  groupMode: GroupMode;
  onBarClick?: (selectedId: string | string[], selectedLabel: string) => void;
}

export default function BreakdownChart({ summary, groupMode, onBarClick }: BreakdownChartProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

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

    // Fallback: use dynamic wrapping
    return formatLabelWithWrapping(label);
  };

  // Helper function to format labels with dynamic wrapping based on estimated overflow
  const formatLabelWithWrapping = (label: string, maxCharsPerLine: number = 14): string => {
    // Don't wrap if already short enough
    if (label.length <= maxCharsPerLine) {
      return label;
    }

    // Find the best break point within the max character limit
    const findBreakPoint = (text: string, maxLength: number): number => {
      // If there's a parenthesis, prefer breaking before it
      const parenIdx = text.indexOf('(');
      if (parenIdx > 0 && parenIdx <= maxLength + 5) {
        // Find the space before the parenthesis
        const spaceBeforeParen = text.lastIndexOf(' ', parenIdx);
        if (spaceBeforeParen > 0) {
          return spaceBeforeParen;
        }
      }

      // Otherwise, find the last space within the limit
      const lastSpace = text.lastIndexOf(' ', maxLength);
      if (lastSpace > maxLength * 0.5) { // Don't break too early
        return lastSpace;
      }

      // If no good space found, try to break at word boundaries after maxLength
      const nextSpace = text.indexOf(' ', maxLength);
      if (nextSpace > 0) {
        return nextSpace;
      }

      // No good break point found
      return -1;
    };

    const breakPoint = findBreakPoint(label, maxCharsPerLine);
    if (breakPoint > 0) {
      const line1 = label.substring(0, breakPoint).trim();
      const line2 = label.substring(breakPoint).trim();
      return `${line1}<br>${line2}`;
    }

    // Fallback: return as-is
    return label;
  };

  // Select data based on group mode
  let labels: string[] = [];
  let values: number[] = [];
  let ids: (string | string[])[] = []; // Identifiers for filtering (mint/type/pool_id or array of types)
  let title = '';

  switch (groupMode) {
    case 'token':
      labels = summary.top_tokens_by_value.map(t => t.name);
      values = summary.top_tokens_by_value.map(t => t.total_sol);
      ids = summary.top_tokens_by_value.map(t => t.mint); // Use mint for filtering
      title = 'Revenue Breakdown by Token';
      break;
    case 'type':
      labels = summary.top_types_by_value.map(t => formatLabelWithWrapping(t.label || t.type));
      values = summary.top_types_by_value.map(t => t.total_sol);
      ids = summary.top_types_by_value.map(t => t.types || [t.type]); // Use types array for filtering
      title = 'Revenue Breakdown by Transaction Type';
      break;
    case 'pool':
      labels = summary.top_pools_by_value.map(p => formatPoolLabel(p.pool_label));
      values = summary.top_pools_by_value.map(p => p.total_sol);
      ids = summary.top_pools_by_value.map(p => p.pool_id); // Use pool_id for filtering
      title = 'Revenue Breakdown by Pool';
      break;
  }

  // Create hover text that includes both label and ID
  const hoverTexts = labels.map((label, idx) => {
    const id = ids[idx];
    // Remove <br> tags from label for hover display
    const cleanLabel = label.replace(/<br>/g, ' ');

    // For token mode, show the mint address; for others just show the label
    if (groupMode === 'token') {
      return `<b>${cleanLabel}</b><br>${values[idx].toFixed(2)} SOL<br><i>${id}</i>`;
    }
    return `<b>${cleanLabel}</b><br>${values[idx].toFixed(2)} SOL`;
  });

  const trace: any = {
    x: labels,
    y: values,
    type: 'bar',
    marker: {
      color: 'var(--accent)',
      opacity: 0.8,
    },
    hovertemplate: '%{hovertext}<extra></extra>',
    hovertext: hoverTexts,
    customdata: ids, // Store IDs for filtering, not labels
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
        data={[trace]}
        layout={{
          ...template.layout,
          title: {
            text: title,
            font: { size: 18, weight: 600 },
          },
          xaxis: {
            ...template.layout.xaxis,
            title: '',
            tickangle: 0,
            tickfont: { size: 11 },
          },
          yaxis: {
            ...template.layout.yaxis,
            title: 'Total SOL',
          },
          showlegend: false,
          hovermode: 'closest',
        }}
        config={defaultPlotlyConfig}
        style={{ width: '100%', height: '450px' }}
        useResizeHandler={true}
        onClick={(event: any) => {
          if (event.points && event.points.length > 0 && onBarClick) {
            const point = event.points[0];
            const clickedId = point.customdata; // mint/type/pool_id
            const clickedLabel = point.x.replace(/<br>/g, ' '); // Strip <br> tags for display
            onBarClick(clickedId, clickedLabel);
          }
        }}
      />
    </div>
  );
}
