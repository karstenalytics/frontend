import React, { useState } from 'react';
import type { VestingWalletStakingOperation } from '@site/src/hooks/useVestingTimeline';

interface VestingWalletStakingOperationsTableProps {
  operations: VestingWalletStakingOperation[];
}

export default function VestingWalletStakingOperationsTable({
  operations,
}: VestingWalletStakingOperationsTableProps): React.ReactElement {
  const [filterWallet, setFilterWallet] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'stake' | 'unstake'>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'amount'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Apply filters
  let filteredOperations = operations;

  if (filterWallet) {
    filteredOperations = filteredOperations.filter(op => op.wallet === filterWallet);
  }

  if (filterType !== 'all') {
    filteredOperations = filteredOperations.filter(op => op.type === filterType);
  }

  // Apply sorting
  filteredOperations = [...filteredOperations].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'timestamp') {
      comparison = a.timestamp.localeCompare(b.timestamp);
    } else if (sortBy === 'amount') {
      comparison = a.amount - b.amount;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Get unique wallets for filter dropdown
  const uniqueWallets = Array.from(new Set(operations.map(op => op.wallet))).sort();

  // Calculate statistics
  const totalStaked = operations
    .filter(op => op.type === 'stake')
    .reduce((sum, op) => sum + op.amount, 0);
  const totalUnstaked = operations
    .filter(op => op.type === 'unstake')
    .reduce((sum, op) => sum + op.amount, 0);

  const { tableStyles, tableRowHoverHandlers, linkHoverHandlers } = require('@site/src/styles/tableStyles');

  return (
    <div
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Vesting Wallet Staking Operations</h3>

      {/* Statistics */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div className="badge badge--primary" style={{ padding: '12px 16px', fontSize: '14px' }}>
          <strong>{operations.length}</strong> total operations
        </div>
        <div className="badge badge--success" style={{ padding: '12px 16px', fontSize: '14px' }}>
          <strong>{totalStaked.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> TUNA staked
        </div>
        <div className="badge badge--warning" style={{ padding: '12px 16px', fontSize: '14px' }}>
          <strong>{totalUnstaked.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> TUNA unstaked
        </div>
        <div className="badge badge--info" style={{ padding: '12px 16px', fontSize: '14px' }}>
          Net: <strong>{(totalStaked - totalUnstaked).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> TUNA
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <label style={{ fontSize: '14px', color: 'var(--ifm-color-secondary)' }}>
          Wallet:
          <select
            value={filterWallet || ''}
            onChange={(e) => setFilterWallet(e.target.value || null)}
            style={{
              marginLeft: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              background: 'var(--ifm-background-surface-color)',
              border: '1px solid var(--ifm-toc-border-color)',
              borderRadius: 'var(--ifm-global-radius)',
              color: 'var(--ifm-font-color-base)',
              cursor: 'pointer',
            }}
          >
            <option value="">All wallets</option>
            {uniqueWallets.map(wallet => (
              <option key={wallet} value={wallet}>
                {wallet.substring(0, 6)}...{wallet.slice(-4)}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: '14px', color: 'var(--ifm-color-secondary)' }}>
          Type:
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'stake' | 'unstake')}
            style={{
              marginLeft: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              background: 'var(--ifm-background-surface-color)',
              border: '1px solid var(--ifm-toc-border-color)',
              borderRadius: 'var(--ifm-global-radius)',
              color: 'var(--ifm-font-color-base)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All</option>
            <option value="stake">Stake</option>
            <option value="unstake">Unstake</option>
          </select>
        </label>

        <label style={{ fontSize: '14px', color: 'var(--ifm-color-secondary)' }}>
          Sort by:
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'amount')}
            style={{
              marginLeft: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              background: 'var(--ifm-background-surface-color)',
              border: '1px solid var(--ifm-toc-border-color)',
              borderRadius: 'var(--ifm-global-radius)',
              color: 'var(--ifm-font-color-base)',
              cursor: 'pointer',
            }}
          >
            <option value="timestamp">Date</option>
            <option value="amount">Amount</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={{
              marginLeft: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              background: 'var(--ifm-color-emphasis-200)',
              border: '1px solid var(--ifm-toc-border-color)',
              borderRadius: 'var(--ifm-global-radius)',
              cursor: 'pointer',
              color: 'var(--ifm-font-color-base)',
            }}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </label>

        {(filterWallet || filterType !== 'all') && (
          <button
            onClick={() => {
              setFilterWallet(null);
              setFilterType('all');
            }}
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
            Clear Filters
          </button>
        )}
      </div>

      {/* Results count */}
      {filteredOperations.length !== operations.length && (
        <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--ifm-color-secondary)' }}>
          Showing {filteredOperations.length} of {operations.length} operations
        </div>
      )}

      {/* Table */}
      {filteredOperations.length === 0 ? (
        <div style={{ padding: '24px', color: 'var(--ifm-color-emphasis-600)', textAlign: 'center' }}>
          No operations match the current filters.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ ...tableStyles.table, minWidth: '900px' }}>
            <thead>
              <tr style={tableStyles.headerRow}>
                <th style={tableStyles.headerCell}>Date{sortBy === 'timestamp' ? (sortOrder === 'desc' ? ' ▼' : ' ▲') : ''}</th>
                <th style={tableStyles.headerCell}>Wallet</th>
                <th style={tableStyles.headerCell}>Type</th>
                <th style={tableStyles.headerCell}>Amount (TUNA){sortBy === 'amount' ? (sortOrder === 'desc' ? ' ▼' : ' ▲') : ''}</th>
                <th style={tableStyles.headerCell}>Pool ID</th>
                <th style={tableStyles.headerCell}>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {filteredOperations.map((operation, idx) => (
                <tr
                  key={`${operation.signature}-${idx}`}
                  style={tableStyles.bodyRow}
                  {...tableRowHoverHandlers}
                >
                  <td style={tableStyles.dateCell}>
                    {operation.timestamp.split('T')[0]}
                    <br />
                    <span style={{ fontSize: '11px', color: 'var(--ifm-color-emphasis-600)' }}>
                      {operation.timestamp.split('T')[1]?.replace('Z', '')}
                    </span>
                  </td>
                  <td style={tableStyles.addressCell}>
                    <a
                      href={`https://solscan.io/account/${operation.wallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={tableStyles.link}
                      {...linkHoverHandlers}
                    >
                      {operation.wallet.substring(0, 6)}...{operation.wallet.slice(-4)}
                    </a>
                  </td>
                  <td style={tableStyles.cell}>
                    <span
                      className={`badge badge--${operation.type === 'stake' ? 'success' : 'warning'}`}
                      style={{ fontSize: '12px' }}
                    >
                      {operation.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...tableStyles.amountCell, textAlign: 'right' }}>
                    {operation.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td style={tableStyles.cell}>
                    {operation.pool}
                  </td>
                  <td style={tableStyles.addressCell}>
                    <a
                      href={`https://solscan.io/tx/${operation.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={tableStyles.link}
                      {...linkHoverHandlers}
                    >
                      {operation.signature.substring(0, 6)}...{operation.signature.slice(-4)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
