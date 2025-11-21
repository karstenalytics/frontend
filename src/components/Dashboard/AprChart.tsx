import React, { useEffect, useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import LoadingSpinner from '../common/LoadingSpinner';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import { trackCustomEvent } from '@site/src/utils/analytics';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@site/src/utils/localStorage';
// import { ShareButton } from '@site/src/components/ShareButton';

interface AprDataPoint {
  date: string;
  reference_apr_percent: number;
  your_apr_percent: number;
  rolling_days: number;
  rolling_revenue_sol: number;
  rolling_revenue_usdc: number;
  annualized_revenue_sol: number;
  annualized_revenue_usdc: number;
  tuna_price_usd: number;
  tuna_price_source: string;
  revenue_per_tuna_usdc: number;
  daily_revenue_sol: number;
  daily_revenue_usdc: number;
  usd_sol_rate: number;
}

interface AprSummary {
  current_reference_apr: number;
  current_your_apr: number;
  average_reference_apr: number;
  average_your_apr: number;
  max_reference_apr: number;
  max_your_apr: number;
  min_reference_apr: number;
  min_your_apr: number;
}

interface AprData {
  date_range: {
    start: string;
    end: string;
  };
  daily_apr: AprDataPoint[];
  summary: AprSummary;
}

/**
 * Validates and sanitizes user entry price input.
 * @param value - The raw input value to validate
 * @returns Valid price number or null if invalid
 */
function validateEntryPrice(value: string | null | undefined): number | null {
  // Handle null/undefined/empty
  if (!value || value.trim() === '') {
    return null;
  }

  // Normalize comma to period for decimal separator
  const normalized = value.trim().replace(',', '.');

  // Parse as float
  const parsed = Number.parseFloat(normalized);

  // Validate: must be finite, positive, and within reasonable bounds
  if (!Number.isFinite(parsed)) {
    console.warn(`Invalid entry price: "${value}" parsed to ${parsed}`);
    return null;
  }

  if (parsed <= 0) {
    console.warn(`Entry price must be positive: ${parsed}`);
    return null;
  }

  if (parsed >= 1000) {
    console.warn(`Entry price too high (max $1000): ${parsed}`);
    return null;
  }

  return parsed;
}

export default function AprChart(): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);
  const aprDataPath = useBaseUrl('/data/apr_data.json');

  const [data, setData] = useState<AprData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entryPriceInput, setEntryPriceInput] = useState<string>('0.05');
  const [showTunaPrice, setShowTunaPrice] = useState(false);

  // Mobile detection
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

  // Chart tracking
  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'APR Chart',
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

  // Load user entry price from localStorage on mount, default to 0.05 (public pre-sale price)
  useEffect(() => {
    const saved = safeGetItem('tunaEntryPrice');
    const validatedPrice = validateEntryPrice(saved);

    if (validatedPrice !== null) {
      // Valid saved price exists - use it
      const normalized = String(validatedPrice);
      setEntryPriceInput(normalized);
      safeSetItem('tunaEntryPrice', normalized);
    } else if (saved && saved.trim() !== '') {
      // Invalid saved price - clear it and use default
      console.warn(`Clearing invalid entry price from localStorage: "${saved}"`);
      setEntryPriceInput('0.05');
      safeSetItem('tunaEntryPrice', '0.05');
    } else {
      // No saved price - use default
      setEntryPriceInput('0.05');
      safeSetItem('tunaEntryPrice', '0.05');
    }
  }, []);

  useEffect(() => {
    fetch(aprDataPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load APR data: ${response.status}`);
        }
        return response.json();
      })
      .then((jsonData: AprData) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading APR data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [aprDataPath]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-danger)',
        background: 'var(--ifm-background-surface-color)',
        border: '2px solid var(--ifm-color-danger)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>
          Failed to Load APR Data
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--ifm-font-color-secondary)', marginBottom: '16px' }}>
          {error}
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--ifm-font-color-secondary)' }}>
          Try refreshing the page. If the problem persists, the data file may be temporarily unavailable.
        </p>
      </div>
    );
  }

  if (!data || data.daily_apr.length === 0) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-secondary)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        No APR data available
      </div>
    );
  }

  // Extract data for chart
  const dates = data.daily_apr.map(d => d.date);
  const referenceAprValues = data.daily_apr.map(d => d.reference_apr_percent);
  const yourAprValues = data.daily_apr.map(d => d.your_apr_percent);
  const tunaPrices = data.daily_apr.map(d => d.tuna_price_usd);

  const parsedEntryPrice = (() => {
    const trimmed = entryPriceInput.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  })();

  // Calculate custom APR if user has entered a different price than default ($0.05)
  const customAprValues = parsedEntryPrice !== null && parsedEntryPrice > 0 ? data.daily_apr.map(d => {
    if (d.revenue_per_tuna_usdc) {
      return (d.revenue_per_tuna_usdc / parsedEntryPrice) * 100;
    }
    return null;
  }) : null;

  // Create hover template with detailed information
  const hoverTemplate = data.daily_apr.map((d, i) => {
    let template = `<b>Date:</b> ${d.date}<br>` +
      `<b>Reference APR:</b> ${d.reference_apr_percent.toFixed(2)}%<br>`;

    // Add Entry Price APR
    if (customAprValues && customAprValues[i] !== null && parsedEntryPrice !== 0.05) {
      template += `<b>Entry Price APR:</b> ${customAprValues[i].toFixed(2)}%<br>`;
    } else {
      template += `<b>Entry Price APR:</b> ${d.your_apr_percent.toFixed(2)}%<br>`;
    }

    template += `<b>Rolling Days:</b> ${d.rolling_days}<br>`;

    // Show rolling revenue in both SOL and USD
    template += `<b>Rolling Revenue:</b> ${d.rolling_revenue_sol.toFixed(2)} SOL ($${d.rolling_revenue_usdc.toFixed(0)})<br>`;
    template += `<extra></extra>`;

    return template;
  });

  // Build traces array
  const traces: Data[] = [
    {
      x: dates,
      y: referenceAprValues,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Reference APR (based on TUNA market price)',
      line: {
        color: 'rgba(0, 163, 180, 1)',  // Teal accent
        width: 2,
      },
      marker: {
        color: 'rgba(0, 163, 180, 0.8)',
        size: 4,
      },
      hovertemplate: hoverTemplate,
    }
  ];

  // Add Entry Price APR trace (always show, either default $0.05 or custom price)
  const yourAprTraceValues = customAprValues && parsedEntryPrice !== 0.05 ? customAprValues : yourAprValues;
  const entryPrice = parsedEntryPrice || 0.05;
  const yourAprTraceName = `Entry Price APR ($${parseFloat(entryPrice.toFixed(4)).toString()} entry)`;

  traces.push({
    x: dates,
    y: yourAprTraceValues,
    type: 'scatter',
    mode: 'lines+markers',
    name: yourAprTraceName,
    line: {
      color: 'rgba(34, 197, 94, 1)',  // Green
      width: 2,
      dash: 'dash',
    },
    marker: {
      color: 'rgba(34, 197, 94, 0.8)',
      size: 4,
    },
    hovertemplate: hoverTemplate,
  });

  // Add TUNA Reference Price trace on secondary y-axis (hidden by default)
  traces.push({
    x: dates,
    y: tunaPrices,
    type: 'scatter',
    mode: 'lines',
    name: 'TUNA Reference Price',
    yaxis: 'y2',
    visible: showTunaPrice ? true : 'legendonly',
    line: {
      color: 'rgba(239, 68, 68, 0.6)',  // Red/orange, semi-transparent
      width: 1.5,
    },
    hovertemplate: '<b>TUNA Reference Price:</b> $%{y:.4f}<br><i>Derived from on-chain swap data</i><extra></extra>',
  });

  const handleLegendClick = (event: Readonly<any>) => {
    if (typeof event?.curveNumber === 'number' && event.curveNumber === traces.length - 1) {
      setShowTunaPrice(prev => !prev);
      return false;
    }
    return undefined;
  };

  const handleEntryPriceChange = (value: string) => {
    // Allow clearing the input
    if (value === '') {
      setEntryPriceInput('');
      safeRemoveItem('tunaEntryPrice');
      window.dispatchEvent(new Event('tunaEntryPriceChanged'));
      return;
    }

    // Only allow numeric input with decimal point
    if (!/^[0-9]*[.,]?[0-9]*$/.test(value)) {
      return;
    }

    const normalised = value.replace(',', '.');

    // Validate the input (will show warning if out of bounds)
    const validatedPrice = validateEntryPrice(normalised);

    // Still allow user to type (for UX), but validate before saving
    setEntryPriceInput(normalised);

    // Only save to localStorage if valid
    if (validatedPrice !== null) {
      safeSetItem('tunaEntryPrice', normalised);
      window.dispatchEvent(new Event('tunaEntryPriceChanged'));

      // Track custom price usage
      trackCustomEvent('APR', 'custom-price-set', String(validatedPrice));
    } else {
      // Clear localStorage if invalid to prevent persistence
      safeRemoveItem('tunaEntryPrice');
    }
  };

  const handleClearEntryPrice = () => {
    setEntryPriceInput('');
    safeRemoveItem('tunaEntryPrice');
    window.dispatchEvent(new Event('tunaEntryPriceChanged'));
  };

  // Dynamic legend sizing calculations
  // Count legend items: 3 traces (Reference APR, Entry Price APR, TUNA Price)
  const numLegendItems = 3;
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = isMobile ? 200 : 250;
  const availableWidth = effectiveWidth - (isMobile ? 50 : 80);
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;

  // Legend positioning and margins (close to chart - no bottom annotations)
  const legendY = isMobile ? -0.1 : -0.15;
  const bottomMargin = isMobile ? legendHeight + 10 : 80;

  // Chart height calculation
  const plotAreaBase = isMobile ? 350 : 450;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 500;

  return (
    <>
      <div ref={plotRef} style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: isMobile ? '16px 0px 16px 0px' : '16px',
        marginBottom: '24px',
      }}>
        {/* ShareButton temporarily disabled for rework
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <div style={{ flex: 1 }} />
          <ShareButton
            plotRef={plotRef}
            chartName="TUNA Staking APR"
            shareText={`Check out the TUNA Staking APR trends - currently at ${data.summary.current_reference_apr.toFixed(2)}%! 📊`}
          />
        </div>
        */}
        <Plot
          data={traces}
          layout={{
            ...template.layout,
            title: {
              text: 'TUNA Staking APR Over Time',
              font: { size: isMobile ? 15 : 18, weight: 600 },
            },
            xaxis: {
              ...template.layout.xaxis,
              title: isMobile ? '' : {
                text: 'Date',
                font: { size: 14 },
              },
              type: 'date',
              tickfont: { size: isMobile ? 9 : 12 },
            },
            yaxis: {
              ...template.layout.yaxis,
              title: isMobile ? '' : {
                text: 'APR (%)',
                font: { size: 14 },
              },
              rangemode: 'tozero',
              tickfont: { size: isMobile ? 8 : 12 },
            },
            yaxis2: {
              title: showTunaPrice && !isMobile ? {
                text: 'TUNA Reference Price (USD)',
                font: { size: 12 },
              } : undefined,
              overlaying: 'y',
              side: 'right',
              showgrid: true,  // Show red-ish grid
              gridcolor: 'rgba(239, 68, 68, 0.1)',  // Red-ish, very transparent
              gridwidth: 1,
              showticklabels: showTunaPrice,
              ticks: '',
              tickfont: { size: isMobile ? 8 : 12 },
              rangemode: 'tozero',
              automargin: showTunaPrice,
              showline: true,
              linecolor: 'rgba(239, 68, 68, 0.3)',  // Red-ish axis line
              linewidth: 1,
              zeroline: false,
              visible: showTunaPrice,
              nticks: 10,
            },
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
            // Disable zoom/pan on mobile while keeping legend interactions
            dragmode: isMobile ? false : 'zoom',
            ...(isMobile ? {
              margin: {
                l: 25,
                r: showTunaPrice ? 25 : 5,  // Need space for secondary y-axis ticks when visible, 5px otherwise
                t: 30,
                b: bottomMargin,
              },
            } : {
              margin: {
                l: 80,
                r: showTunaPrice ? 80 : 40,
                t: 60,
                b: 80,
              },
            }),
          }}
          config={{
            ...getResponsivePlotlyConfig(),
            // Override staticPlot to allow legend clicks on mobile
            staticPlot: false,
            // Disable scroll zoom on mobile, keep legend clicks
            scrollZoom: !isMobile,
          }}
          style={{ width: '100%', height: `${chartHeight}px` }}
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
            <div>↑ APR (%) {showTunaPrice && '/ TUNA Price (USD, right)'}</div>
            <div>→ Date</div>
          </div>
        )}
      </div>

      {/* Your TUNA Entry Price Input */}
      <div style={{
        marginBottom: '24px',
        padding: '20px',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        <label style={{
          display: 'block',
          marginBottom: '12px',
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--ifm-font-color-base)',
        }}>
          Your TUNA Entry Price
        </label>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ifm-font-color-base)' }}>$</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.05 (public pre-sale)"
              value={entryPriceInput}
              onChange={(e) => handleEntryPriceChange(e.target.value)}
              style={{
                width: '150px',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid var(--ifm-toc-border-color)',
                borderRadius: '4px',
                background: 'var(--ifm-background-color)',
                color: 'var(--ifm-font-color-base)',
              }}
            />
          </div>
          {parsedEntryPrice !== null && (
            <button
              onClick={handleClearEntryPrice}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                border: '1px solid var(--ifm-toc-border-color)',
                borderRadius: '4px',
                background: 'var(--ifm-background-color)',
                color: 'var(--ifm-font-color-base)',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: '8px',
          lineHeight: '1.5',
        }}>
          Enter the USD price you paid per TUNA to see your custom APR based on actual protocol revenue. Defaults to $0.05 (public pre-sale price).
        </div>
      </div>
    </>
  );
}







