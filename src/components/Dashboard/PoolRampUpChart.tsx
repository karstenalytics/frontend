import React, { useEffect, useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { getPlotlyTemplate, defaultPlotlyConfig } from '@site/src/utils/plotlyTheme';
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

  const plotRef = useRef<HTMLDivElement>(null);
  useChartTracking(plotRef, {
    chartName: 'Pool Ramp Up',
    trackClick: true,
    trackZoom: true,
  });

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

  // Handlers for visibility controls
  const handleSelectAll = () => {
    const newVisibility: Record<string, boolean> = {};
    data.pools.forEach(pool => {
      newVisibility[pool.pool_id] = true;
    });
    setPoolVisibility(newVisibility);
    setPlotRevision(prev => prev + 1);
  };

  const handleDeselectAll = () => {
    const newVisibility: Record<string, boolean> = {};
    data.pools.forEach(pool => {
      newVisibility[pool.pool_id] = false;
    });
    setPoolVisibility(newVisibility);
    setPlotRevision(prev => prev + 1);
  };

  const handleMaxDaysChange = (value: number) => {
    setMaxDays(value);
    setPlotRevision(prev => prev + 1);
  };

  const handleSelect10Newest = () => {
    // Sort pools by establishment_date (descending - most recent first)
    const sortedPools = [...data.pools].sort((a, b) =>
      new Date(b.establishment_date).getTime() - new Date(a.establishment_date).getTime()
    );

    // Get the 10 newest pool IDs
    const newest10 = sortedPools.slice(0, 10).map(p => p.pool_id);

    // Set visibility
    const newVisibility: Record<string, boolean> = {};
    data.pools.forEach(pool => {
      newVisibility[pool.pool_id] = newest10.includes(pool.pool_id);
    });
    setPoolVisibility(newVisibility);
    setPlotRevision(prev => prev + 1);
  };

  // Create traces for each pool
  const traces: Data[] = data.pools.map((pool, index) => {
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
        padding: '16px',
        marginBottom: '16px',
      }}>
        <Plot
          data={traces}
          revision={plotRevision}
          layout={{
            ...template.layout,
            title: {
              text: `Pool Revenue Ramp-Up (First ${maxDays} Days)`,
              font: { size: 18, weight: 600 },
            },
            xaxis: {
              ...template.layout.xaxis,
              title: 'Days Since Establishment',
              range: [1, maxDays],
              dtick: maxDays <= 30 ? 5 : 10,
            },
            yaxis: {
              ...template.layout.yaxis,
              title: 'Cumulative Revenue (SOL)',
            },
            showlegend: true,
            legend: {
              orientation: 'v',
              y: 1,
              x: 1.02,
              xanchor: 'left',
              yanchor: 'top',
              font: { size: 11 },
            },
            hovermode: 'closest',
            // Enable hover highlighting
            hoverlabel: {
              bgcolor: isDark ? '#05080D' : '#ffffff',
              bordercolor: 'var(--ifm-color-primary)',
              font: { size: 13 },
            },
          }}
          config={{
            ...defaultPlotlyConfig,
            // Enable double-click to isolate traces
            doubleClick: 'reset',
          }}
          style={{ width: '100%', height: '600px' }}
          useResizeHandler={true}
        />
      </div>

      {/* Controls */}
      <div style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: '16px',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}>
          {/* Days slider */}
          <div style={{ flex: '1 1 300px', minWidth: '250px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
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
              fontSize: '12px',
              color: 'var(--ifm-color-secondary)',
              marginTop: '4px',
            }}>
              <span>7 days</span>
              <span>{data.metadata.max_days} days</span>
            </div>
          </div>

          {/* Pool visibility buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--ifm-font-color-base)',
              marginBottom: '4px',
            }}>
              Pool Visibility:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
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
        </div>
      </div>

    </>
  );
}
