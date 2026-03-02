import React from 'react';
import type { StakingTopEntry } from '@site/src/hooks/useStakingMetrics';
import {
  tableStyles,
  tableRowHoverHandlers,
  linkHoverHandlers,
  actionButtonHoverHandlers,
} from '@site/src/styles/tableStyles';

interface StakingTopTablesProps {
  topStakers: StakingTopEntry[];
  topWithdrawers: StakingTopEntry[];
  tokenSymbol?: string; // Default: 'TUNA'
  timelinePath?: string; // Default: '/analysis/defituna/staking/wallet-timeline'
}

function renderTable(
  title: string,
  rows: StakingTopEntry[],
  emptyMessage: string,
  columnName: string,
  tokenSymbol: string,
  timelinePath: string
) {
  return (
    <div className="staking-top-table">
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <p className="staking-top-empty">{emptyMessage}</p>
      ) : (
        <table>
          <thead>
            <tr style={tableStyles.headerRow}>
              <th style={tableStyles.headerCell}>Rank</th>
              <th style={tableStyles.headerCell}>Address</th>
              <th style={tableStyles.headerCell}>{columnName} {'\u25BC'}</th>
              <th style={tableStyles.headerCell}>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.address}
                style={tableStyles.bodyRow}
                {...tableRowHoverHandlers}
              >
                <td style={tableStyles.rankCell}>
                  #{index + 1}
                </td>
                <td style={tableStyles.addressCell}>
                  <a
                    href={`https://solscan.io/account/${row.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={tableStyles.link}
                    {...linkHoverHandlers}
                  >
                    {row.address.slice(0, 5)}...{row.address.slice(-5)}
                  </a>
                </td>
                <td style={tableStyles.amountCell}>
                  {row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
                </td>
                <td style={tableStyles.cell}>
                  <a
                    href={`${timelinePath}?wallet=${row.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={tableStyles.actionButton}
                    {...actionButtonHoverHandlers}
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

export default function StakingTopTables({
  topStakers,
  topWithdrawers,
  tokenSymbol = 'TUNA',
  timelinePath = '/analysis/defituna/staking/wallet-timeline',
}: StakingTopTablesProps): React.ReactElement {
  const safeStakers = topStakers ?? [];
  const safeWithdrawers = topWithdrawers ?? [];
  return (
    <div className="staking-top-grid">
      {renderTable('Top Stakers (last 7 days)', safeStakers, 'No staking activity recorded in the past week.', `${tokenSymbol} staked`, tokenSymbol, timelinePath)}
      {renderTable('Top Unstakers (last 7 days)', safeWithdrawers, 'No unstaking activity recorded in the past week.', `${tokenSymbol} unstaked`, tokenSymbol, timelinePath)}
    </div>
  );
}
