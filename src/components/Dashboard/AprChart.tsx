import React, { useEffect, useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import LoadingSpinner from '../common/LoadingSpinner';
import ChartToggle from '../common/ChartToggle';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@site/src/utils/localStorage';
import type { AprTimelineEntry, AprTimelineData } from '@site/src/types/dashboard';

const VIEW_OPTIONS = [
  { value: '7d', label: '7-Day' },
  { value: '30d', label: '30-Day' },
];

/**
 * Validates and sanitizes user entry price input.
 * @param value - The raw input value to validate
 * @returns Valid price number or null if invalid
 */
function validateEntryPrice(value: string | null | undefined): number | null {
  if (!value || value.trim() === '') {
    return null;
  }
  const normalized = value.trim().replace(',', '.');
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 1000) {
    return null;
  }
  return parsed;
}

/**
 * Compute aligned tick intervals for dual y-axes.
 * Both axes get the same number of ticks so gridlines align.
 */
function computeAlignedAxes(maxPrimary: number, maxSecondary: number) {
  if (maxPrimary <= 0 || maxSecondary <= 0) return null;

  const niceFor = (max: number, n: number) => {
    const raw = max / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    return ([1, 2, 2.5, 5, 10].find(v => v * mag >= raw) || 10) * mag;
  };

  const opt4p = niceFor(maxPrimary, 4);
  const opt5p = niceFor(maxPrimary, 5);
  const opt4 = { n: 4, primaryDtick: opt4p, primaryRange: opt4p * 4 };
  const opt5 = { n: 5, primaryDtick: opt5p, primaryRange: opt5p * 5 };
  const best = opt4.primaryRange <= opt5.primaryRange ? opt4 : opt5;

  const secondaryDtick = niceFor(maxSecondary, best.n);
  const secondaryRange = secondaryDtick * best.n;

  return {
    primaryDtick: best.primaryDtick,
    primaryRange: [0, best.primaryRange],
    secondaryDtick,
    secondaryRange: [0, secondaryRange],
  };
}

export default function AprChart(): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);
  const aprTimelinePath = useBaseUrl('/data/defituna/apr_timeline.json');

  const [data, setData] = useState<AprTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'7d' | '30d'>('30d');
  const [entryPriceInput, setEntryPriceInput] = useState<string>('');
  const [showTunaPrice, setShowTunaPrice] = useState(false);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 996 : false
  );

  const plotRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 996);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (plotRef.current) {
      const updateWidth = () => {
        setContainerWidth(plotRef.current?.offsetWidth || 0);
      };
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, [loading]);

  // Load user entry price from localStorage on mount
  useEffect(() => {
    const saved = safeGetItem('tunaEntryPrice');
    const validatedPrice = validateEntryPrice(saved);

    if (validatedPrice !== null) {
      setEntryPriceInput(String(validatedPrice));
    }
  }, []);

  useEffect(() => {
    fetch(aprTimelinePath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load APR timeline: ${response.status}`);
        }
        return response.json();
      })
      .then((jsonData: AprTimelineData) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading APR timeline:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [aprTimelinePath]);

  if (loading) {
    return (
      <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
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
        <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>
          Failed to Load APR Timeline
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--ifm-font-color-secondary)' }}>
          {error}
        </p>
      </div>
    );
  }

  if (!data || data.timeline.length === 0) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-secondary)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        No APR timeline data available
      </div>
    );
  }

  // Entry price handlers - dispatch synthetic storage event so cards react
  const notifyStorageChange = () => window.dispatchEvent(new Event('storage'));

  const handleEntryPriceChange = (value: string) => {
    if (value === '') {
      setEntryPriceInput('');
      safeRemoveItem('tunaEntryPrice');
      notifyStorageChange();
      return;
    }
    if (!/^[0-9]*[.,]?[0-9]*$/.test(value)) {
      return;
    }
    const normalised = value.replace(',', '.');
    setEntryPriceInput(normalised);

    const validatedPrice = validateEntryPrice(normalised);
    if (validatedPrice !== null) {
      safeSetItem('tunaEntryPrice', normalised);
    } else {
      safeRemoveItem('tunaEntryPrice');
    }
    notifyStorageChange();
  };

  const handleClearEntryPrice = () => {
    setEntryPriceInput('');
    safeRemoveItem('tunaEntryPrice');
    notifyStorageChange();
  };

  // Filter data based on selected view, trimming leading null entries
  const aprKey = view === '7d' ? 'apr_7d' : 'apr_30d';
  const nonNullData = data.timeline.filter(d => d[aprKey] !== null);
  const firstNonZero = nonNullData.findIndex(d => d[aprKey] as number > 0);
  const filteredData = firstNonZero > 0 ? nonNullData.slice(firstNonZero) : nonNullData;

  const dates = filteredData.map(d => d.date);
  const aprValues = filteredData.map(d => d[aprKey] as number);
  const tunaPrices = filteredData.map(d => d.tuna_price_usd);

  const primaryColor = isDark ? '#14BCCD' : '#00A3B4';
  const personalColor = 'rgba(34, 197, 94, 1)';
  const priceColor = 'rgba(239, 68, 68, 0.6)';
  const spikeColor = isDark ? '#1a2832' : '#cbd5e0';

  // Parse entry price for personal APR calculation
  const parsedEntryPrice = validateEntryPrice(entryPriceInput);
  const hasPersonalApr = parsedEntryPrice !== null;

  // Personal APR = reference APR * (tuna_price / entry_price)
  const personalAprValues = hasPersonalApr
    ? filteredData.map((d, i) => {
        const tunaPrice = d.tuna_price_usd;
        const apr = aprValues[i];
        if (tunaPrice && tunaPrice > 0 && apr !== null) {
          return apr * (tunaPrice / parsedEntryPrice);
        }
        return null;
      })
    : null;

  // Compute aligned axes for APR (primary) and token price (secondary)
  const maxApr = Math.max(...aprValues, ...(personalAprValues?.filter(v => v !== null) as number[] || []), 0);
  const validPrices = tunaPrices.filter(p => p !== null && p > 0) as number[];
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
  const axisAlignment = computeAlignedAxes(maxApr, maxPrice);

  // Build custom hover text
  const hoverText = aprValues.map((apr, i) => {
    const d = filteredData[i];
    let text = `<b>Reference APR: ${apr.toFixed(2)}%</b>`;
    if (personalAprValues && personalAprValues[i] !== null) {
      text += `<br><b>Entry Price APR: ${personalAprValues[i]!.toFixed(2)}%</b>`;
    }
    if (d.daily_revenue_usdc !== null) {
      text += `<br>Daily Revenue: $${d.daily_revenue_usdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return text;
  });

  const traces: Data[] = [
    {
      x: dates,
      y: aprValues,
      type: 'scatter',
      mode: 'lines+markers',
      name: `Reference APR (${view === '7d' ? '7d' : '30d'})`,
      line: { color: primaryColor, width: 2 },
      marker: { color: primaryColor, size: isMobile ? 3 : 4 },
      text: hoverText,
      hovertemplate: '%{text}<extra></extra>',
    },
  ];

  // Add Entry Price APR trace if entry price is set
  if (hasPersonalApr && personalAprValues) {
    traces.push({
      x: dates,
      y: personalAprValues,
      type: 'scatter',
      mode: 'lines+markers',
      name: `Entry Price APR ($${parseFloat(parsedEntryPrice.toFixed(4))} entry)`,
      line: { color: personalColor, width: 2, dash: 'dash' },
      marker: { color: personalColor, size: isMobile ? 3 : 4 },
      text: hoverText,
      hovertemplate: '%{text}<extra></extra>',
    });
  }

  // Add TUNA Reference Price trace on secondary y-axis (hidden by default)
  traces.push({
    x: dates,
    y: tunaPrices,
    type: 'scatter',
    mode: 'lines',
    name: 'TUNA Reference Price',
    yaxis: 'y2',
    visible: showTunaPrice ? true : 'legendonly',
    line: { color: priceColor, width: 1.5 },
    hovertemplate: '<b>TUNA Price:</b> $%{y:.4f}<extra></extra>',
  });

  // Dynamic legend sizing
  const numLegendItems = traces.length;
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = isMobile ? 130 : 250;
  const marginSubtraction = isMobile ? (effectiveWidth < 420 ? 0 : 50) : 80;
  const availableWidth = effectiveWidth - marginSubtraction;
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = isMobile ? 22 : 25;
  const legendHeight = estimatedRows * rowHeight;
  const legendY = isMobile ? -0.12 - (estimatedRows - 1) * 0.06 : -0.15;
  const bottomMargin = isMobile ? 60 + legendHeight : 72;
  const plotAreaBase = isMobile ? 350 : 420;
  const chartHeight = isMobile ? plotAreaBase + bottomMargin : 500;

  const handleLegendClick = (event: Readonly<any>) => {
    if (typeof event?.curveNumber === 'number' && event.curveNumber === traces.length - 1) {
      setShowTunaPrice(prev => !prev);
      return false;
    }
    return undefined;
  };

  const title = `TUNA Staking APR (${view === '7d' ? '7-Day' : '30-Day'} Rolling)`;

  return (
    <>
      <div
        ref={plotRef}
        style={{
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-toc-border-color)',
          borderRadius: 'var(--ifm-global-radius)',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: isMobile ? '16px 0px 16px 0px' : '24px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '8px',
            paddingLeft: isMobile ? '16px' : 0,
            paddingRight: isMobile ? '16px' : 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              fontWeight: 600,
            }}
          >
            {title}
          </h3>
          <div style={{ flexShrink: 0 }}>
            <ChartToggle
              value={view}
              onChange={(v) => setView(v as '7d' | '30d')}
              options={VIEW_OPTIONS}
              variant="primary"
            />
          </div>
        </div>

        <Plot
          data={traces}
          layout={{
            ...template.layout,
            autosize: true,
            height: chartHeight,
            showlegend: true,
            legend: {
              orientation: 'h',
              yanchor: 'top',
              y: legendY,
              xanchor: 'center',
              x: 0.5,
              font: { size: isMobile ? 10 : 12 },
            },
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
              title: isMobile ? '' : { text: 'APR (%)', font: { size: 14 }, standoff: 20 },
              tickfont: { size: isMobile ? 8 : 12 },
              ticksuffix: '%',
              spikecolor: spikeColor,
              spikedash: 'dot',
              spikethickness: 1,
              ...(axisAlignment
                ? { range: axisAlignment.primaryRange, dtick: axisAlignment.primaryDtick, tick0: 0 }
                : { rangemode: 'tozero' }),
            },
            yaxis2: {
              title: showTunaPrice && !isMobile ? {
                text: 'TUNA Price (USD)',
                font: { size: 12, color: 'rgba(239, 68, 68, 0.8)' },
              } : undefined,
              overlaying: 'y',
              side: 'right',
              showgrid: showTunaPrice,
              gridcolor: 'rgba(239, 68, 68, 0.1)',
              gridwidth: 1,
              showticklabels: showTunaPrice,
              ticks: '',
              tickfont: { size: isMobile ? 8 : 12, color: 'rgba(239, 68, 68, 0.8)' },
              showline: true,
              linecolor: 'rgba(239, 68, 68, 0.3)',
              linewidth: 1,
              zeroline: false,
              visible: showTunaPrice,
              ...(axisAlignment
                ? { range: axisAlignment.secondaryRange, dtick: axisAlignment.secondaryDtick, tick0: 0 }
                : { rangemode: 'tozero' }),
            },
            hovermode: 'x unified',
            dragmode: isMobile ? false : 'zoom',
            margin: isMobile
              ? { l: 35, r: showTunaPrice ? 25 : 5, t: 16, b: bottomMargin }
              : { l: 70, r: showTunaPrice ? 80 : 24, t: 16, b: bottomMargin },
          }}
          config={{
            ...getResponsivePlotlyConfig(),
            staticPlot: false,
            scrollZoom: !isMobile,
          }}
          style={{ width: '100%', height: `${chartHeight}px` }}
          onLegendClick={handleLegendClick}
        />
        {isMobile && (
          <div style={{
            fontSize: '13px',
            color: 'var(--ifm-color-secondary)',
            marginTop: '0px',
            marginLeft: '35px',
            lineHeight: '1.6',
          }}>
            <div>&#8593; APR (%){showTunaPrice && ' / TUNA Price (right)'}</div>
            <div>&#8594; Date (UTC)</div>
          </div>
        )}
      </div>

      {/* TUNA Entry Price Input */}
      <div style={{
        marginBottom: '24px',
        padding: '20px',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
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
          Enter the USD price you paid per TUNA to see your personal APR. Since rewards are paid in WSOL, a lower entry price means a higher effective APR. Placeholder example: $0.05 (public pre-sale price).
        </div>
      </div>
    </>
  );
}
