/**
 * Plotly Theme System for karstenalytics
 * Provides consistent theming that responds to light/dark mode changes
 */

const ACCENT = '#00A3B4';
const ACCENT_HOVER = '#14BCCD';

export function getThemeColor(variable: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
  return value ? value.trim() || fallback : fallback;
}

interface PlotlyColors {
  text: string;
  grid: string;
  bg: string;
  paper: string;
}

function getColors(isDark: boolean): PlotlyColors {
  return {
    text: isDark ? '#E6E9EE' : '#111111',
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    bg: 'transparent',
    paper: 'transparent',
  };
}

function getSpikeColor(isDark: boolean): string {
  // Very subtle crosshair - barely visible, just enough to help guide the eye
  return isDark ? '#1a2832' : '#cbd5e0';
}

export interface PlotlyTemplateOptions {
  /** Add watermark branding to chart (default: false) */
  showBranding?: boolean;
}

export function getPlotlyTemplate(isDark: boolean, options?: PlotlyTemplateOptions) {
  const colors = getColors(isDark);
  const spikeColor = getSpikeColor(isDark);
  const accent = getThemeColor('--accent', ACCENT);
  const accentAlt = getThemeColor('--accent-hover', ACCENT_HOVER);

  const annotations = options?.showBranding
    ? [
        {
          text: 'karstenalytics.com',
          xref: 'paper' as const,
          yref: 'paper' as const,
          x: 1,
          y: -0.15,
          xanchor: 'right' as const,
          yanchor: 'top' as const,
          showarrow: false,
          font: { size: 10, color: isDark ? '#888' : '#888' },
        },
      ]
    : [];

  return {
    layout: {
      font: { family: 'Inter, Helvetica, Arial, sans-serif', size: 14, color: colors.text },
      colorway: [
        accent,
        accentAlt,
        '#1ABC9C',
        '#8E44AD',
        '#2C3E50',
        '#F05A28',
        '#C0392B',
        '#27AE60',
        '#16A085',
        '#2980B9',
      ],
      paper_bgcolor: colors.paper,
      plot_bgcolor: colors.bg,
      margin: { l: 70, r: 24, t: 32, b: 50 },
      annotations,
      xaxis: {
        gridcolor: colors.grid,
        zeroline: false,
        linecolor: colors.grid,
        ticks: '',
        showspikes: true,
        spikemode: 'across',
        spikecolor: spikeColor,
        spikethickness: 1,
        spikedash: 'dot',
        spikesnap: 'cursor',
        tickfont: { size: 12 },
        titlefont: { size: 18 },
        titlestandoff: 16,
      },
      yaxis: {
        gridcolor: colors.grid,
        zeroline: false,
        linecolor: colors.grid,
        ticks: '',
        showspikes: true,
        spikemode: 'across',
        spikecolor: spikeColor,
        spikethickness: 1,
        spikedash: 'dot',
        spikesnap: 'cursor',
        tickfont: { size: 12 },
        titlefont: { size: 18 },
        titlestandoff: 20,
      },
      legend: {
        orientation: 'h',
        y: 1.02,
        yanchor: 'bottom',
        x: 0,
        title: { text: '' },
        font: { size: 12 },
      },
      hovermode: 'x unified',
      hoverlabel: {
        bgcolor: isDark ? '#1a1a1a' : '#ffffff',
        bordercolor: spikeColor,
        font: {
          size: 13,
          color: colors.text,
        },
      },
    },
    data: {
      scatter: [{ mode: 'lines', line: { width: 2 } }],
      bar: [{ marker: { line: { width: 0 } } }],
      heatmap: [{ colorbar: { outlinewidth: 0 } }],
    },
  };
}

/**
 * Default Plotly configuration options
 */
export const defaultPlotlyConfig = {
  displayModeBar: 'hover',
  displaylogo: false,
  modeBarButtonsToRemove: ['zoom2d', 'autoscale', 'select2d', 'lasso2d'],
  responsive: true,
  doubleClick: false, // Disable double-click to isolate trace message
} as const;

/**
 * Get responsive Plotly config that hides modebar on mobile and disables zoom/pan
 * @param mobileBreakpoint - Screen width below which to hide modebar (default: 550px)
 */
export function getResponsivePlotlyConfig(mobileBreakpoint: number = 550) {
  if (typeof window === 'undefined') {
    return defaultPlotlyConfig;
  }

  const isMobile = window.innerWidth < mobileBreakpoint;

  return {
    ...defaultPlotlyConfig,
    displayModeBar: isMobile ? false : 'hover',
    // Disable zoom and pan interactions on mobile
    scrollZoom: isMobile ? false : undefined,
    doubleClick: false,
    staticPlot: isMobile ? true : false,
  };
}

