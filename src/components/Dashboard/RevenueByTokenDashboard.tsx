import React, { useState } from 'react';
import { useDashboardData } from './useDashboardData';
import BreakdownChart from './BreakdownChart';
import TopTransactionsTable from './TopTransactionsTable';
import LoadingSpinner from '../common/LoadingSpinner';

export default function RevenueByTokenDashboard(): React.ReactElement {
  const data = useDashboardData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const handleBarClick = (id: string | string[], label: string) => {
    setSelectedId(id as string);
    setSelectedLabel(label);
  };

  const clearFilter = () => {
    setSelectedId(null);
    setSelectedLabel(null);
  };

  if (data.loading) {
    return <LoadingSpinner />;
  }

  if (data.error) {
    return (
      <div style={{
        padding: '32px',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-color-danger)',
        borderRadius: 'var(--ifm-global-radius)',
        color: 'var(--ifm-color-danger)',
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Error Loading Dashboard</div>
        <p>{data.error}</p>
      </div>
    );
  }

  const summary = data.summary;
  if (!summary) {
    return <div>No data available</div>;
  }

  return (
    <div>
      {/* Chart Section */}
      <BreakdownChart
        summary={summary}
        groupMode="token"
        onBarClick={handleBarClick}
      />

      {/* Table Section - appears under "Top Transactions Table" heading below */}
      <div id="transactions-table-section" style={{ marginTop: '32px' }}>
        <h2 id="top-transactions">Top Transactions Table</h2>

        <p style={{ marginBottom: '16px' }}>
          The table displays individual transactions contributing to treasury revenue.
          By default, it shows all transactions across all tokens, sorted by SOL amount.
        </p>

        <p style={{ marginBottom: '16px' }}>
          <strong>Filtering</strong>: Click any bar in the chart above to filter the table to that specific token's transactions.
        </p>

        {selectedLabel && (
          <div style={{
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '14px', color: 'var(--ifm-color-secondary)' }}>
              Filtered by: <strong>{selectedLabel}</strong>
            </span>
            <button
              onClick={clearFilter}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                background: 'var(--ifm-color-emphasis-200)',
                border: '1px solid var(--ifm-toc-border-color)',
                borderRadius: 'var(--ifm-global-radius)',
                cursor: 'pointer',
                color: 'var(--ifm-font-color-base)',
              }}
            >
              Clear Filter
            </button>
          </div>
        )}

        <TopTransactionsTable
          topTransactionsToken={data.topTransactionsToken}
          topTransactionsType={data.topTransactionsType}
          topTransactionsPool={data.topTransactionsPool}
          topTransactionsPoolType={data.topTransactionsPoolType}
          groupMode="token"
          selectedFilter={selectedId}
          selectedFilterLabel={selectedLabel}
          summary={summary}
        />
      </div>
    </div>
  );
}
