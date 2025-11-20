import React, { useState, useMemo, useRef } from 'react';
import Plot from 'react-plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useChartTracking } from '@site/src/hooks/useChartTracking';

interface WalletRevenueData {
  metadata: {
    generated_at: string;
    date_range: {
      start: string;
      end: string;
    };
    total_wallets: number;
    total_revenue: number;
    total_transactions: number;
    cohort_ranges: Array<{
      min: number | null;
      max: number | null;
      label: string;
    }>;
  };
  cohorts: Record<string, number>;
  cohorts_excl_liquidations: Record<string, number>;
  wallets: Record<string, {
    total_revenue: number;
    total_revenue_excl_liquidations: number;
    transaction_count: number;
    first_transaction: string;
    last_transaction: string;
    by_type: Record<string, number>;
    by_mint: Record<string, number>;
    by_pool: Record<string, number>;
    timeline: Array<{
      date: string;
      signature: string;
      type: string;
      amount: number;
      timestamp: number;
      cumulative: number;
      cumulative_excl_liquidations: number;
    }>;
  }>;
}

interface WalletRevenueBreakdownProps {
  dataUrl: string;
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
  'staking_swaprewardorca': 'Swap Reward (Orca)',
  'swap_reward_fusion': 'Swap Reward (Fusion)',
};

function getDisplayName(technicalType: string): string {
  return TYPE_DISPLAY_NAMES[technicalType] || technicalType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isLiquidationType(typeName: string): boolean {
  return typeName.toLowerCase().includes('liquidat');
}

export default function WalletRevenueBreakdown({ dataUrl }: WalletRevenueBreakdownProps): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  const [data, setData] = useState<WalletRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [searchedWallet, setSearchedWallet] = useState<string | null>(null);
  const [excludeLiquidations, setExcludeLiquidations] = useState(false);

  const cohortPlotRef = useRef<HTMLDivElement>(null);
  useChartTracking(cohortPlotRef, {
    chartName: 'Wallet Revenue Breakdown - Cohort Histogram',
    trackClick: true,
    trackZoom: true,
  });

  const timelinePlotRef = useRef<HTMLDivElement>(null);
  useChartTracking(timelinePlotRef, {
    chartName: 'Wallet Revenue Breakdown - Timeline',
    trackClick: true,
    trackZoom: true,
  });

  // Load data
  React.useEffect(() => {
    fetch(dataUrl)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load data: ${err.message}`);
        setLoading(false);
      });
  }, [dataUrl]);

  // Handle wallet search
  const handleSearch = () => {
    const trimmed = walletAddress.trim();
    if (!trimmed) {
      setSearchedWallet(null);
      return;
    }
    setSearchedWallet(trimmed);
  };

  // Get wallet data for searched wallet
  const walletData = useMemo(() => {
    if (!data || !searchedWallet) return null;
    return data.wallets[searchedWallet] || null;
  }, [data, searchedWallet]);

  // Compute top 10 wallets by revenue
  const topWallets = useMemo(() => {
    if (!data) return [];

    const walletEntries = Object.entries(data.wallets).map(([address, info]) => ({
      address,
      revenue: excludeLiquidations ? info.total_revenue_excl_liquidations : info.total_revenue,
      txCount: info.transaction_count,
    }));

    return walletEntries
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [data, excludeLiquidations]);

  // Prepare cohort histogram data
  const cohortHistogramData = useMemo(() => {
    if (!data) return null;

    const cohorts = excludeLiquidations ? data.cohorts_excl_liquidations : data.cohorts;
    const labels = data.metadata.cohort_ranges.map(r => r.label);
    const values = labels.map(label => cohorts[label] || 0);

    return {
      x: labels,
      y: values,
      type: 'bar' as const,
      marker: {
        color: 'rgba(0, 163, 180, 0.8)',
        line: {
          color: 'rgba(0, 163, 180, 1)',
          width: 1.5,
        },
      },
      hovertemplate: '<b>%{x} SOL</b><br>%{y} wallets<extra></extra>',
    };
  }, [data, excludeLiquidations]);

  // Prepare timeline data for searched wallet
  const timelineData = useMemo(() => {
    if (!walletData) return null;

    const timeline = walletData.timeline;

    // Extract dates and cumulative revenue
    const dates = timeline.map(t => new Date(t.timestamp * 1000));
    const cumulativeRevenue = timeline.map(t =>
      excludeLiquidations ? t.cumulative_excl_liquidations : t.cumulative
    );

    // Group transactions by type for markers
    const byType: Record<string, {
      dates: Date[];
      amounts: number[];
      cumulative: number[];
      signatures: string[];
      color: string;
    }> = {};

    timeline.forEach(tx => {
      if (excludeLiquidations && isLiquidationType(tx.type)) {
        return; // Skip liquidations if filter is on
      }

      const displayName = getDisplayName(tx.type);

      if (!byType[displayName]) {
        // Assign color based on type
        const isLiquidation = isLiquidationType(tx.type);
        const color = isLiquidation ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 163, 180, 0.9)';

        byType[displayName] = {
          dates: [],
          amounts: [],
          cumulative: [],
          signatures: [],
          color,
        };
      }

      byType[displayName].dates.push(new Date(tx.timestamp * 1000));
      byType[displayName].amounts.push(tx.amount);
      byType[displayName].cumulative.push(
        excludeLiquidations ? tx.cumulative_excl_liquidations : tx.cumulative
      );
      byType[displayName].signatures.push(tx.signature);
    });

    return { dates, cumulativeRevenue, byType };
  }, [walletData, excludeLiquidations]);

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Loading wallet revenue data...</div>;
  }

  if (error) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ifm-color-danger)' }}>{error}</div>;
  }

  if (!data) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>No data available</div>;
  }

  return (
    <div>
      {/* Filter Controls */}
      <div
        style={{
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-toc-border-color)',
          borderRadius: 'var(--ifm-global-radius)',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={excludeLiquidations}
            onChange={(e) => setExcludeLiquidations(e.target.checked)}
            style={{ marginRight: '8px', cursor: 'pointer' }}
          />
          <span>Exclude Liquidations</span>
        </label>
      </div>

      {/* Summary Statistics */}
      <div
        style={{
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-toc-border-color)',
          borderRadius: 'var(--ifm-global-radius)',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--ifm-color-secondary)', marginBottom: '4px' }}>
              Total Wallets
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {data.metadata.total_wallets.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--ifm-color-secondary)', marginBottom: '4px' }}>
              Total Revenue
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {data.metadata.total_revenue.toFixed(2)} SOL
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--ifm-color-secondary)', marginBottom: '4px' }}>
              Transactions
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
              {data.metadata.total_transactions.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--ifm-color-secondary)', marginBottom: '4px' }}>
              Date Range
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {data.metadata.date_range.start} to {data.metadata.date_range.end}
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 Wallets Table */}
      <div
        style={{
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-toc-border-color)',
          borderRadius: 'var(--ifm-global-radius)',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
          Top 10 Wallets by Revenue
          {excludeLiquidations && <span style={{ fontSize: '0.875rem', color: 'var(--ifm-color-secondary)', fontWeight: 'normal' }}> (excl. liquidations)</span>}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            display: 'table',
            width: '100%',
            minWidth: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--ifm-toc-border-color)' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Rank</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Wallet Address</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600 }}>Revenue (SOL) ▼</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600 }}>Transactions</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {topWallets.map((wallet, index) => (
                <tr
                  key={wallet.address}
                  style={{
                    borderBottom: '1px solid var(--ifm-toc-border-color)',
                    background: searchedWallet === wallet.address ? 'rgba(0, 163, 180, 0.1)' : 'transparent',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (searchedWallet !== wallet.address) {
                      e.currentTarget.style.background = 'var(--ifm-toc-border-color)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (searchedWallet !== wallet.address) {
                      e.currentTarget.style.background = 'transparent';
                    } else {
                      e.currentTarget.style.background = 'rgba(0, 163, 180, 0.1)';
                    }
                  }}
                >
                  <td style={{ padding: '12px 8px', color: 'var(--ifm-color-secondary)' }}>{index + 1}</td>
                  <td style={{ padding: '12px 8px', fontFamily: 'var(--ifm-font-family-monospace)', fontSize: '12px' }}>
                    <a
                      href={`https://solscan.io/account/${wallet.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'none' }}
                    >
                      {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                    </a>
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600 }}>
                    {wallet.revenue.toFixed(4)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                    {wallet.txCount.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <button
                      onClick={() => {
                        setWalletAddress(wallet.address);
                        setSearchedWallet(wallet.address);
                      }}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: '1px solid var(--accent)',
                        borderRadius: '4px',
                        background: 'transparent',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cohort Histogram */}
      <div
        ref={cohortPlotRef}
        style={{
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-toc-border-color)',
          borderRadius: 'var(--ifm-global-radius)',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
          Wallet Revenue Distribution
          {excludeLiquidations && <span style={{ fontSize: '0.875rem', color: 'var(--ifm-color-secondary)', fontWeight: 'normal' }}> (excl. liquidations)</span>}
        </h3>
        {cohortHistogramData && (
          <Plot
            data={[cohortHistogramData]}
            layout={{
              ...template.layout,
              xaxis: {
                ...template.layout.xaxis,
                title: 'Revenue Range (SOL)',
              },
              yaxis: {
                ...template.layout.yaxis,
                title: 'Number of Wallets',
              },
              margin: { l: 70, r: 40, t: 20, b: 60 },
              hovermode: 'closest',
            }}
            config={getResponsivePlotlyConfig()}
            style={{ width: '100%', height: '400px' }}
            useResizeHandler={true}
          />
        )}
      </div>

      {/* Wallet Search */}
      <div
        style={{
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-toc-border-color)',
          borderRadius: 'var(--ifm-global-radius)',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Individual Wallet Revenue Timeline</h3>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter wallet address..."
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid var(--ifm-toc-border-color)',
              borderRadius: 'var(--ifm-global-radius)',
              background: 'var(--ifm-background-color)',
              color: 'var(--ifm-font-color-base)',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              borderRadius: 'var(--ifm-global-radius)',
              background: '#00A3B4',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </div>

        {searchedWallet && !walletData && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ifm-color-warning)' }}>
            Wallet not found or no revenue generated: {searchedWallet}
          </div>
        )}

        {walletData && (
          <>
            {/* Wallet Statistics */}
            <div
              style={{
                background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: 'var(--ifm-global-radius)',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-secondary)', marginBottom: '4px' }}>
                    Total Revenue
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    {(excludeLiquidations ? walletData.total_revenue_excl_liquidations : walletData.total_revenue).toFixed(4)} SOL
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-secondary)', marginBottom: '4px' }}>
                    Transactions
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    {walletData.transaction_count}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-secondary)', marginBottom: '4px' }}>
                    First Transaction
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {walletData.first_transaction}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-secondary)', marginBottom: '4px' }}>
                    Last Transaction
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {walletData.last_transaction}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Chart */}
            {timelineData && (
              <div ref={timelinePlotRef}>
                <Plot
                  data={[
                    // Cumulative revenue line
                    {
                      name: 'Cumulative Revenue',
                      x: timelineData.dates,
                      y: timelineData.cumulativeRevenue,
                      type: 'scatter',
                      mode: 'lines',
                      line: { color: '#00A3B4', width: 2 },
                      fill: 'tozeroy',
                      fillcolor: 'rgba(0, 163, 180, 0.1)',
                      hovertemplate: '<b>%{x}</b><br>Cumulative: %{y:.6f} SOL<extra></extra>',
                    },
                    // Transaction markers by type
                    ...Object.entries(timelineData.byType).map(([displayName, typeData]) => ({
                      name: displayName,
                      x: typeData.dates,
                      y: typeData.cumulative,
                      type: 'scatter',
                      mode: 'markers',
                      marker: {
                        color: typeData.color,
                        size: 8,
                        symbol: 'circle',
                        line: { color: 'white', width: 1 },
                      },
                      customdata: typeData.amounts.map((amt, i) => ({
                        amount: amt,
                        signature: typeData.signatures[i],
                      })),
                      hovertemplate:
                        `<b>${displayName}</b><br>` +
                        'Amount: %{customdata.amount:.6f} SOL<br>' +
                        'Cumulative: %{y:.6f} SOL<br>' +
                        '<a href="https://solscan.io/tx/%{customdata.signature}" target="_blank">View on Solscan</a>' +
                        '<extra></extra>',
                    })),
                  ]}
                  layout={{
                    ...template.layout,
                    xaxis: {
                      ...template.layout.xaxis,
                      title: 'Date',
                      type: 'date',
                    },
                    yaxis: {
                      ...template.layout.yaxis,
                      title: 'Cumulative Revenue (SOL)',
                      rangemode: 'tozero',
                    },
                    hovermode: 'closest',
                    showlegend: true,
                    legend: {
                      orientation: 'v',
                      y: 1,
                      x: 1.02,
                      xanchor: 'left',
                    },
                    margin: { l: 70, r: 200, t: 20, b: 60 },
                  }}
                  config={getResponsivePlotlyConfig()}
                  style={{ width: '100%', height: '500px' }}
                  useResizeHandler={true}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
