import React from 'react';
import type { StakingTopEntry } from '@site/src/hooks/useStakingMetrics';

interface StakingTopTablesProps {
  topStakers: StakingTopEntry[];
  topWithdrawers: StakingTopEntry[];
}

function renderTable(title: string, rows: StakingTopEntry[], emptyMessage: string, columnName: string) {
  return (
    <div className="staking-top-table">
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <p className="staking-top-empty">{emptyMessage}</p>
      ) : (
        <table>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--ifm-toc-border-color)' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Rank</th>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Address</th>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>{columnName}</th>
              <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 600 }}>Staking Timeline</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.address}
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
                  #{index + 1}
                </td>
                <td style={{ padding: '12px 8px', fontFamily: 'var(--ifm-font-family-monospace)' }}>
                  <a
                    href={`https://solscan.io/account/${row.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      fontSize: '12px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {row.address.slice(0, 5)}...{row.address.slice(-5)}
                  </a>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--accent)' }}>
                  {row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} TUNA
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  <a
                    href={`/analysis/defituna/staking/wallet-timeline?wallet=${row.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '6px 12px',
                      border: '1px solid var(--accent)',
                      borderRadius: '4px',
                      display: 'inline-block',
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--accent)';
                    }}
                  >
                    See details
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function StakingTopTables({ topStakers, topWithdrawers }: StakingTopTablesProps): React.ReactElement {
  const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  const safeStakers = topStakers ?? [];
  const safeWithdrawers = topWithdrawers ?? [];
  return (
    <div className="staking-top-grid">
      {renderTable('Top Stakers (last 7 days)', safeStakers, 'No staking activity recorded in the past week.', 'TUNA staked')}
      {renderTable('Top Withdrawers (last 7 days)', safeWithdrawers, 'No withdrawals recorded in the past week.', 'TUNA withdrawn')}
    </div>
  );
}

