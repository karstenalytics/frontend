import React, { useState } from 'react';
import { useDashboardData } from './useDashboardData';
import LoadingSpinner from '../common/LoadingSpinner';
import DashboardControlsComponent from './DashboardControls';
import BreakdownChart from './BreakdownChart';
import TopTransactionsTable from './TopTransactionsTable';
import DailyStackedChart from './DailyStackedChart';
import CumulativeChart from './CumulativeChart';
import { useTokenIcons, getTokenIconPath } from '@site/src/hooks/useTokenIcons';
import type { DashboardControls } from './types';

export default function Dashboard(): React.ReactElement {
  const data = useDashboardData();
  const { icons } = useTokenIcons();

  const [controls, setControls] = useState<DashboardControls>({
    startDate: '',
    endDate: '',
    groupMode: 'token',
    fullRange: true,
    showRawTypes: false,
    clusterThreshold: 0.1,
  });

  // Show loading state
  if (data.loading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (data.error) {
    return (
      <div style={{
        padding: '32px',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-color-danger)',
        borderRadius: 'var(--ifm-global-radius)',
        color: 'var(--ifm-color-danger)',
      }}>
        <h3>Error Loading Dashboard</h3>
        <p>{data.error}</p>
        <p style={{ fontSize: '14px', color: 'var(--ifm-color-secondary)', marginTop: '16px' }}>
          Please ensure the analytics data files are available in <code>/data/</code>
        </p>
      </div>
    );
  }

  // Show summary information
  const summary = data.summary;
  if (!summary) {
    return <div>No data available</div>;
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Dashboard Controls */}
      <DashboardControlsComponent controls={controls} onChange={setControls} />

      {/* Summary Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <div style={{
          padding: '20px',
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-toc-border-color)',
          borderRadius: 'var(--ifm-global-radius)',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--ifm-color-secondary)', marginBottom: '8px' }}>
            Total WSOL Direct
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--accent)' }}>
            {summary.totals.wsol_direct.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL
          </div>
        </div>
        <div style={{
          padding: '20px',
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-toc-border-color)',
          borderRadius: 'var(--ifm-global-radius)',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--ifm-color-secondary)', marginBottom: '8px' }}>
            Unique Tokens
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600 }}>
            {summary.totals.unique_mints}
          </div>
        </div>
        <div style={{
          padding: '20px',
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-toc-border-color)',
          borderRadius: 'var(--ifm-global-radius)',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--ifm-color-secondary)', marginBottom: '8px' }}>
            Unique Pools
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600 }}>
            {summary.totals.unique_pools}
          </div>
        </div>
        <div style={{
          padding: '20px',
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-toc-border-color)',
          borderRadius: 'var(--ifm-global-radius)',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--ifm-color-secondary)', marginBottom: '8px' }}>
            Transaction Types
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600 }}>
            {summary.totals.unique_types}
          </div>
        </div>
      </div>

      {/* Top Tokens */}
      <div style={{
        padding: '24px',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        marginBottom: '24px',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Top Tokens by Value</h3>
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
                <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Token</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 600 }}>Total SOL ▼</th>
              </tr>
            </thead>
            <tbody>
              {summary.top_tokens_by_value.map((token, idx) => (
                <tr
                  key={token.mint}
                  style={{
                    borderBottom: '1px solid var(--ifm-toc-border-color)',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ifm-toc-border-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 8px', color: 'var(--ifm-color-secondary)' }}>
                    #{idx + 1}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {(() => {
                        const iconPath = getTokenIconPath(token.mint, icons);
                        return iconPath ? (
                          <img
                            src={iconPath}
                            alt=""
                            width={24}
                            height={24}
                            style={{ borderRadius: '50%', flexShrink: 0 }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null;
                      })()}
                      <div>
                        <div style={{ fontWeight: 500 }}>{token.name}</div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--ifm-color-secondary)',
                          fontFamily: 'var(--ifm-font-family-monospace)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '300px',
                        }}>
                          {token.mint}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 500 }}>
                    {token.total_sol.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Breakdown Chart */}
      <BreakdownChart summary={summary} groupMode={controls.groupMode} />

      {/* Top Transactions Table */}
      <TopTransactionsTable
        topTransactionsToken={data.topTransactionsToken}
        topTransactionsType={data.topTransactionsType}
        topTransactionsPool={data.topTransactionsPool}
        topTransactionsPoolType={data.topTransactionsPoolType}
        groupMode={controls.groupMode}
      />

      {/* Daily Stacked Chart */}
      <DailyStackedChart data={data.dailyStacked} />

      {/* Cumulative Revenue Chart */}
      <CumulativeChart data={data.dailyStacked} />

      {/* Data loaded indicator */}
      <div style={{
        marginTop: '24px',
        padding: '12px 16px',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--ifm-global-radius)',
        fontSize: '13px',
        color: 'var(--ifm-color-secondary)',
      }}>
        ✓ Dashboard data loaded: {data.dailyStacked.length} daily records, {Object.keys(data.topTransactionsToken).length} token groups
      </div>
    </div>
  );
}
