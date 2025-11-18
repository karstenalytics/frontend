import React, { useEffect } from 'react';
import type { UsageTopWallet } from '@site/src/hooks/useUsageMetrics';
import { trackCustomEvent } from '@site/src/utils/analytics';
import { tableStyles, tableRowHoverHandlers, linkHoverHandlers } from '@site/src/styles/tableStyles';

interface UsageTopAddressesProps {
  rows: UsageTopWallet[];
  title: string;
  showWeeks?: boolean;
  showMonths?: boolean;
  description?: React.ReactNode;
}

function shorten(address: string, size = 4): string {
  if (!address) return '';
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function UsageTopAddresses({
  rows,
  title,
  showWeeks = false,
  showMonths = false,
  description,
}: UsageTopAddressesProps): React.ReactElement {
  const data = rows || [];

  // Track when table is viewed with data
  useEffect(() => {
    if (data.length > 0) {
      trackCustomEvent('Usage', 'view-top-addresses', title);
    }
  }, [data.length, title]);

  return (
    <div style={tableStyles.container}>
      <h3 style={{ marginTop: 0, textAlign: 'center' }}>{title}</h3>
      {description && <p style={{ color: 'var(--ifm-color-emphasis-700)' }}>{description}</p>}
      {data.length === 0 ? (
        <div style={{ padding: '16px 0', color: 'var(--ifm-color-emphasis-600)' }}>
          No active addresses detected for this period.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyles.table}>
            <thead>
              <tr style={tableStyles.headerRow}>
                <th style={tableStyles.headerCell}>Rank</th>
                <th style={tableStyles.headerCell}>Address</th>
                <th style={tableStyles.headerCell}>Days Active</th>
                {showWeeks && <th style={tableStyles.headerCell}>Active Weeks</th>}
                {showMonths && <th style={tableStyles.headerCell}>Active Months</th>}
                <th style={tableStyles.headerCell}>Tx Count</th>
                <th style={tableStyles.headerCell}>First Seen</th>
                <th style={tableStyles.headerCell}>Last Seen</th>
                <th style={{ ...tableStyles.headerCell, textAlign: 'center' }}>Staking Timeline</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={row.address}
                  style={tableStyles.bodyRow}
                  {...tableRowHoverHandlers}
                >
                  <td style={{ ...tableStyles.cell, fontWeight: 600 }}>{index + 1}</td>
                  <td style={tableStyles.addressCell}>
                    <a
                      href={`https://solscan.io/account/${row.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={tableStyles.link}
                      {...linkHoverHandlers}
                    >
                      {shorten(row.address)}
                    </a>
                  </td>
                  <td style={tableStyles.cell}>{row.days_active}</td>
                  {showWeeks && (
                    <td style={tableStyles.cell}>{row.active_weeks ?? 0}</td>
                  )}
                  {showMonths && (
                    <td style={tableStyles.cell}>{row.active_months ?? 0}</td>
                  )}
                  <td style={tableStyles.cell}>{row.tx_count}</td>
                  <td style={tableStyles.dateCell}>
                    {formatDate(row.first_seen)}
                  </td>
                  <td style={tableStyles.dateCell}>
                    {formatDate(row.last_seen)}
                  </td>
                  <td style={{ ...tableStyles.cell, textAlign: 'center' }}>
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
        </div>
      )}
    </div>
  );
}

