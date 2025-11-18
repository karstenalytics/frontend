/**
 * React hook for adding GoatCounter analytics tracking to Plotly charts
 *
 * This hook automatically tracks chart views and user interactions
 * (hover, click, zoom, selection) with minimal code changes.
 *
 * @module useChartTracking
 */

import { useEffect, useRef } from 'react';
import { trackChartEvent } from '@site/src/utils/analytics';
import type { PlotMouseEvent, PlotRelayoutEvent, PlotSelectionEvent } from 'plotly.js';

/**
 * Extended HTMLDivElement with Plotly event methods
 * Plotly.js adds these methods to the div element at runtime
 */
interface PlotlyHTMLElement extends HTMLDivElement {
  on?: (event: string, handler: (data: any) => void) => void;
  removeAllListeners?: (event: string) => void;
}

interface UseChartTrackingOptions {
  /** Display name of the chart (used in event paths) */
  chartName: string;
  /** Track hover events (disabled by default - can be noisy) */
  trackHover?: boolean;
  /** Track click events (enabled by default) */
  trackClick?: boolean;
  /** Track zoom/pan events (enabled by default) */
  trackZoom?: boolean;
  /** Track selection events (disabled by default) */
  trackSelect?: boolean;
}

/**
 * Hook to add analytics tracking to Plotly charts
 *
 * Automatically tracks chart views on mount and attaches event listeners
 * for user interactions. The hook handles cleanup automatically.
 *
 * @param plotRef - React ref to the Plotly chart container div
 * @param options - Tracking configuration options
 *
 * @example
 * ```tsx
 * import { useChartTracking } from '@site/src/hooks/useChartTracking';
 *
 * export default function MyChart() {
 *   const plotRef = useRef<HTMLDivElement>(null);
 *
 *   useChartTracking(plotRef, {
 *     chartName: 'Revenue Breakdown',
 *     trackClick: true,
 *     trackZoom: true,
 *   });
 *
 *   return (
 *     <div ref={plotRef}>
 *       <Plot data={data} layout={layout} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useChartTracking(
  plotRef: React.RefObject<HTMLDivElement>,
  options: UseChartTrackingOptions
) {
  const {
    chartName,
    trackHover = false,
    trackClick = true,
    trackZoom = true,
    trackSelect = false,
  } = options;

  // Track first view
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!hasTrackedView.current) {
      trackChartEvent(chartName, 'view');
      hasTrackedView.current = true;
    }
  }, [chartName]);

  // Track interactions
  useEffect(() => {
    const plotDiv = plotRef.current;
    if (!plotDiv) return;

    const handleHover = () => {
      if (trackHover) {
        trackChartEvent(chartName, 'hover');
      }
    };

    const handleClick = (data: Readonly<PlotMouseEvent>) => {
      if (trackClick) {
        // Extract useful metadata from click event
        const metadata: Record<string, string | number> = {};
        if (data.points && data.points.length > 0) {
          const point = data.points[0];
          if (point.x) metadata.date = String(point.x);
          if (point.curveNumber !== undefined) metadata.series = point.curveNumber;
        }
        trackChartEvent(chartName, 'click', metadata);
      }
    };

    const handleRelayout = (eventData: Readonly<PlotRelayoutEvent>) => {
      if (trackZoom) {
        // Detect if this was a zoom/pan event
        if (eventData['xaxis.range[0]'] || eventData['yaxis.range[0]']) {
          trackChartEvent(chartName, 'zoom');
        }
      }
    };

    const handleSelected = (eventData: Readonly<PlotSelectionEvent>) => {
      if (trackSelect && eventData && eventData.points) {
        trackChartEvent(chartName, 'select', {
          points: eventData.points.length,
        });
      }
    };

    // Attach Plotly event listeners
    // Note: Plotly adds these as properties on the div element
    const plotlyDiv = plotDiv as PlotlyHTMLElement;
    if (plotlyDiv.on) {
      plotlyDiv.on('plotly_hover', handleHover);
      plotlyDiv.on('plotly_click', handleClick);
      plotlyDiv.on('plotly_relayout', handleRelayout);
      plotlyDiv.on('plotly_selected', handleSelected);
    }

    // Cleanup
    return () => {
      if (plotlyDiv.removeAllListeners) {
        plotlyDiv.removeAllListeners('plotly_hover');
        plotlyDiv.removeAllListeners('plotly_click');
        plotlyDiv.removeAllListeners('plotly_relayout');
        plotlyDiv.removeAllListeners('plotly_selected');
      }
    };
  }, [chartName, trackHover, trackClick, trackZoom, trackSelect]);
}
