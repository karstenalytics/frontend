import React, { useEffect, useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';
import LoadingSpinner from '../common/LoadingSpinner';

interface PoolDay {
  day: number;
  date: string;
  daily: number;
  cumulative: number;
}

interface PoolData {
  pool_id: string;
  name: string;
  protocol: string;
  establishment_date: string;
  total_revenue: number;
  days_of_data: number;
  days: PoolDay[];
}

interface PoolRampUpMetadata {
  generated_at: string;
  max_days: number;
  total_pools: number;
  date_range: {
    start: string;
    end: string;
  };
}

interface PoolRampUpData {
  metadata: PoolRampUpMetadata;
  pools: PoolData[];
}

export default function PoolRampUpChart(): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);
  const poolDataPath = useBaseUrl('/data/pool_ramp_up.json');

  const [data, setData] = useState<PoolRampUpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxDays, setMaxDays] = useState(90);
  const [plotRevision, setPlotRevision] = useState(0);
  const [poolVisibility, setPoolVisibility] = useState<Record<string, boolean>>({});

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

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Pool Ramp Up',
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

  useEffect(() => {
    fetch(poolDataPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load pool ramp-up data: ${response.status}`);
        }
        return response.json();
      })
      .then((jsonData: PoolRampUpData) => {
        setData(jsonData);

        // Initialize visibility state
        const hiddenByDefault = [
          'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE',  // Orca SOL-USDC Whirlpool
          '7VuKeevbvbQQcxz6N4SNLmuq6PYy4AcGQRDssoqo4t65',  // Fusion SOL-USDC Pool
        ];

        const initialVisibility: Record<string, boolean> = {};
        jsonData.pools.forEach(pool => {
          // Hide if explicitly in hiddenByDefault list OR if cumulative revenue < 5 SOL
          const shouldHide = hiddenByDefault.includes(pool.pool_id) || pool.total_revenue < 5;
          initialVisibility[pool.pool_id] = !shouldHide;
        });
        setPoolVisibility(initialVisibility);

        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading pool ramp-up data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [poolDataPath]);

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
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        Error loading pool ramp-up data: {error}
      </div>
    );
  }

  if (!data || data.pools.length === 0) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-secondary)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        No pool ramp-up data available
      </div>
    );
  }

  const handleMaxDaysChange = (value: number) => {
    setMaxDays(value);
    setPlotRevision(prev => prev + 1);
  };

  // Filter pools on mobile to exclude those with < 5 SOL cumulative revenue
  const poolsToShow = isMobile
    ? data.pools.filter(pool => pool.total_revenue >= 5)
    : data.pools;

  // Desktop-only: Handlers for visibility controls
  const handleSelectAll = () => {
    const newVisibility: Record<string, boolean> = {};
    poolsToShow.forEach(pool => {
      newVisibility[pool.pool_id] = true;
    });
    setPoolVisibility(newVisibility);
    setPlotRevision(prev => prev + 1);
  };

  const handleDeselectAll = () => {
    const newVisibility: Record<string, boolean> = {};
    poolsToShow.forEach(pool => {
      newVisibility[pool.pool_id] = false;
    });
    setPoolVisibility(newVisibility);
    setPlotRevision(prev => prev + 1);
  };

  const handleSelect10Newest = () => {
    // Sort pools by establishment_date (descending - most recent first)
    const sortedPools = [...poolsToShow].sort((a, b) =>
      new Date(b.establishment_date).getTime() - new Date(a.establishment_date).getTime()
    );

    // Get the 10 newest pool IDs
    const newest10 = sortedPools.slice(0, 10).map(p => p.pool_id);

    // Set visibility
    const newVisibility: Record<string, boolean> = {};
    poolsToShow.forEach(pool => {
      newVisibility[pool.pool_id] = newest10.includes(pool.pool_id);
    });
    setPoolVisibility(newVisibility);
    setPlotRevision(prev => prev + 1);
  };

  // Dynamic legend sizing calculations (mobile only)
  // Count visible pools for legend
  const visiblePoolsCount = poolsToShow.filter(pool => poolVisibility[pool.pool_id] !== false).length;
  const numLegendItems = isMobile ? visiblePoolsCount : 0; // Only calculate for mobile
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = 150;  // Pool names can be long
  const availableWidth = effectiveWidth - 50;
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = 25;
  const legendHeight = isMobile ? estimatedRows * rowHeight : 0;

  // Legend positioning and margins
  const legendY = isMobile ? -0.1 : 1;
  const bottomMargin = isMobile ? legendHeight + 10 : 50;

  // Chart height calculation
  const plotAreaBase = isMobile ? 350 : 550;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 600;

  // Create traces for each pool (using filtered pools on mobile)
  const traces: Data[] = poolsToShow.map((pool, index) => {
    // Filter days based on maxDays slider
    const filteredDays = pool.days.filter(d => d.day <= maxDays);

    // Extract x and y data
    const days = filteredDays.map(d => d.day);
    const cumulativeRevenue = filteredDays.map(d => d.cumulative);

    // Create hover template with detailed information
    const hoverTemplate = filteredDays.map(d => {
      return `<b>${pool.name}</b><br>` +
        `<b>Protocol:</b> ${pool.protocol}<br>` +
        `<b>Day:</b> ${d.day} (${d.date})<br>` +
        `<b>Daily Revenue:</b> ${d.daily.toFixed(4)} SOL<br>` +
        `<b>Cumulative:</b> ${d.cumulative.toFixed(2)} SOL<br>` +
        `<extra></extra>`;
    });

    // Use visibility state
    const isVisible = poolVisibility[pool.pool_id] !== false;

    return {
      x: days,
      y: cumulativeRevenue,
      type: 'scatter',
      mode: 'lines',
      name: pool.name,
      visible: isVisible ? true : 'legendonly',
      line: {
        width: 2,  // Thin lines by default
      },
      hovertemplate: hoverTemplate,
      // Store pool info in customdata for later use
      customdata: filteredDays.map(d => ({
        pool_name: pool.name,
        protocol: pool.protocol,
        daily: d.daily,
        cumulative: d.cumulative,
        date: d.date,
      })),
    };
  });

  return (
    <>
      {/* Chart */}
      <div ref={plotRef} style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: isMobile ? '16px 0px 16px 0px' : '16px',
        marginBottom: '16px',
      }}>
        <Plot
          data={traces}
          revision={plotRevision}
          layout={{
            ...template.layout,
            title: {
              text: `Pool Revenue Ramp-Up (First ${maxDays} Days)`,
              font: { size: isMobile ? 15 : 18, weight: 600 },
            },
            xaxis: {
              ...template.layout.xaxis,
              title: isMobile ? '' : {
                text: 'Days Since Establishment',
                font: { size: 14 },
              },
              range: [1, maxDays],
              dtick: maxDays <= 30 ? 5 : 10,
              tickfont: { size: isMobile ? 9 : 12 },
            },
            yaxis: {
              ...template.layout.yaxis,
              title: isMobile ? '' : {
                text: 'Cumulative Revenue (SOL)',
                font: { size: 14 },
                standoff: 10,
              },
              tickfont: { size: isMobile ? 8 : 12 },
            },
            showlegend: true,
            legend: isMobile ? {
              orientation: 'h',
              yanchor: 'top',
              y: legendY,
              xanchor: 'center',
              x: 0.5,
              font: { size: 10 },
            } : {
              orientation: 'v',
              y: 1,
              x: 1,
              xanchor: 'left',
              yanchor: 'top',
              font: { size: 11 },
              itemwidth: 10,
            },
            ...(isMobile ? {
              margin: {
                l: 25,
                r: 5,
                t: 30,
                b: bottomMargin,
              },
            } : {
              margin: {
                l: 50,
                r: 10,
                t: 50,
                b: 50,
              },
            }),
            annotations: isMobile ? [] : [
              {
                text: 'Default: Main SOL-USDC pools and pools with <5 SOL cumulative revenue are hidden. On mobile: pools <5 SOL excluded completely.',
                xref: 'paper',
                yref: 'paper',
                x: 0.6,
                y: 1.015,
                xanchor: 'center',
                yanchor: 'bottom',
                showarrow: false,
                font: {
                  size: 10,
                  color: 'var(--ifm-color-secondary-dark)',
                },
              },
            ],
            hovermode: 'closest',
            // Disable zoom/pan on mobile while keeping legend interactions
            dragmode: isMobile ? false : 'zoom',
            // Enable hover highlighting
            hoverlabel: {
              bgcolor: isDark ? '#05080D' : '#ffffff',
              bordercolor: 'var(--ifm-color-primary)',
              font: { size: 13 },
            },
          }}
          config={{
            ...getResponsivePlotlyConfig(),
            // Override staticPlot to allow legend clicks on mobile
            staticPlot: false,
            // Disable scroll zoom on mobile, keep legend clicks
            scrollZoom: !isMobile,
            // Enable double-click to isolate traces
            doubleClick: 'reset',
          }}
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
            <div>↑ Cumulative Revenue (SOL)</div>
            <div>→ Days Since Establishment</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: isMobile ? '12px' : '16px',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '12px' : '24px',
          flexWrap: 'wrap',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {/* Days slider */}
          <div style={{ flex: isMobile ? '1' : '1 1 300px', minWidth: isMobile ? 'auto' : '250px' }}>
            <label style={{
              display: 'block',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--ifm-font-color-base)',
            }}>
              Days to Display: {maxDays}
            </label>
            <input
              type="range"
              min="7"
              max={data.metadata.max_days}
              value={maxDays}
              onChange={(e) => handleMaxDaysChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: isDark ? '#444' : '#ddd',
                outline: 'none',
                opacity: 0.9,
                transition: 'opacity 0.2s',
                cursor: 'pointer',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? '11px' : '12px',
              color: 'var(--ifm-color-secondary)',
              marginTop: '4px',
            }}>
              <span>7 days</span>
              <span>{data.metadata.max_days} days</span>
            </div>
          </div>

          {/* Desktop-only pool visibility buttons */}
          {!isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--ifm-font-color-base)',
                marginBottom: '4px',
              }}>
                Pool Visibility:
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleSelectAll}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: '1px solid var(--ifm-toc-border-color)',
                    borderRadius: '4px',
                    background: 'var(--ifm-background-color)',
                    color: 'var(--ifm-font-color-base)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ifm-color-primary)';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = 'var(--ifm-color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--ifm-background-color)';
                    e.currentTarget.style.color = 'var(--ifm-font-color-base)';
                    e.currentTarget.style.borderColor = 'var(--ifm-toc-border-color)';
                  }}
                >
                  Select All Pools
                </button>
                <button
                  onClick={handleDeselectAll}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: '1px solid var(--ifm-toc-border-color)',
                    borderRadius: '4px',
                    background: 'var(--ifm-background-color)',
                    color: 'var(--ifm-font-color-base)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ifm-color-danger)';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = 'var(--ifm-color-danger)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--ifm-background-color)';
                    e.currentTarget.style.color = 'var(--ifm-font-color-base)';
                    e.currentTarget.style.borderColor = 'var(--ifm-toc-border-color)';
                  }}
                >
                  Deselect All Pools
                </button>
                <button
                  onClick={handleSelect10Newest}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: '1px solid var(--ifm-toc-border-color)',
                    borderRadius: '4px',
                    background: 'var(--ifm-background-color)',
                    color: 'var(--ifm-font-color-base)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ifm-color-primary)';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = 'var(--ifm-color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--ifm-background-color)';
                    e.currentTarget.style.color = 'var(--ifm-font-color-base)';
                    e.currentTarget.style.borderColor = 'var(--ifm-toc-border-color)';
                  }}
                >
                  10 Newest Pools
                </button>
              </div>
            </div>
          )}

          {/* Mobile note about desktop filtering */}
          {isMobile && (
            <div style={{
              fontSize: '12px',
              color: 'var(--ifm-color-secondary)',
              fontStyle: 'italic',
              padding: '8px 0',
            }}>
              Additional pool filtering options available on desktop
            </div>
          )}
        </div>
      </div>

    </>
  );
}
