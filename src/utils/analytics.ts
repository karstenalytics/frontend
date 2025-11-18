/**
 * Analytics utility for GoatCounter tracking
 *
 * Provides type-safe wrapper functions for tracking page views,
 * chart interactions, and custom events in a privacy-friendly manner.
 *
 * @module analytics
 */

export interface TrackEventOptions {
  chartName?: string;
  action?: string;
  category?: string;
  label?: string;
  customPath?: string;
}

/**
 * Check if GoatCounter is available
 *
 * @returns true if GoatCounter is loaded and ready
 */
export function isAnalyticsAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.goatcounter;
}

/**
 * Track a chart interaction event
 *
 * Tracks user interactions with Plotly charts (view, click, zoom, etc.)
 * Events are tracked as custom paths for easy filtering in GoatCounter.
 *
 * @param chartName - Display name of the chart (e.g., "APR Chart")
 * @param action - Type of interaction (e.g., "view", "click", "zoom")
 * @param metadata - Optional metadata to include in the event path
 *
 * @example
 * trackChartEvent('APR Chart', 'view');
 * trackChartEvent('Revenue Breakdown', 'click', { date: '2025-10-15' });
 */
export function trackChartEvent(
  chartName: string,
  action: string,
  metadata?: Record<string, string | number>
): void {
  if (!isAnalyticsAvailable()) {
    return;
  }

  // Build path with metadata encoded
  const metadataPath = metadata
    ? '/' + Object.entries(metadata)
        .map(([key, value]) => `${key}-${value}`)
        .join('/')
    : '';

  const path = `chart/${chartName.toLowerCase().replace(/\s+/g, '-')}/${action}${metadataPath}`;

  window.goatcounter!.count({
    path: path,
    title: `${chartName} - ${action}`,
    event: true,
  });
}

/**
 * Track a custom event
 *
 * Tracks custom user actions like filter changes, feature usage, etc.
 * Events appear as /event/{category}/{action}/{label} in GoatCounter.
 *
 * @param category - Event category (e.g., "Dashboard", "APR", "Loyalty")
 * @param action - Action performed (e.g., "filter-change", "custom-price-set")
 * @param label - Optional label for additional context
 *
 * @example
 * trackCustomEvent('Dashboard', 'filter-change', 'group-token');
 * trackCustomEvent('APR', 'custom-price-set', '0.05');
 */
export function trackCustomEvent(
  category: string,
  action: string,
  label?: string
): void {
  if (!isAnalyticsAvailable()) {
    return;
  }

  const path = label
    ? `event/${category}/${action}/${label}`
    : `event/${category}/${action}`;

  window.goatcounter!.count({
    path: path,
    title: `${category} - ${action}${label ? ` - ${label}` : ''}`,
    event: true,
  });
}

/**
 * Track a page view
 *
 * Usually automatic with GoatCounter script, but can be used
 * for manual tracking in SPAs or custom routing scenarios.
 *
 * @param path - Optional custom path (defaults to current location)
 * @param title - Optional custom title (defaults to document title)
 *
 * @example
 * trackPageView('/custom-page', 'Custom Page Title');
 */
export function trackPageView(path?: string, title?: string): void {
  if (!isAnalyticsAvailable()) {
    return;
  }

  window.goatcounter!.count({
    path: path,
    title: title,
  });
}
