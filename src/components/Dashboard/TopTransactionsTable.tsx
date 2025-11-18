import React, { useMemo, useState } from 'react';
import type { TopTransactionsData, GroupMode, SummaryData } from './types';

interface TopTransactionsTableProps {
  topTransactionsToken: TopTransactionsData;
  topTransactionsType: TopTransactionsData;
  topTransactionsPool: TopTransactionsData;
  topTransactionsPoolType: TopTransactionsData;
  groupMode: GroupMode;
  selectedFilter?: string | string[] | null;
  selectedFilterLabel?: string | null;
  typeFilter?: string | string[] | null;
  summary?: SummaryData;
  protocolFilter?: 'orca' | 'fusion' | null;
  showProtocolToggle?: boolean;
}

export default function TopTransactionsTable({
  topTransactionsToken,
  topTransactionsType,
  topTransactionsPool,
  topTransactionsPoolType,
  groupMode,
  selectedFilter,
  selectedFilterLabel,
  typeFilter,
  summary,
  protocolFilter: externalProtocolFilter,
  showProtocolToggle = false,
}: TopTransactionsTableProps): React.ReactElement {
  // Internal state for protocol filter when toggle is shown
  const [internalProtocolFilter, setInternalProtocolFilter] = useState<'orca' | 'fusion'>('orca');

  // Use external filter if provided, otherwise use internal state
  const protocolFilter = showProtocolToggle ? internalProtocolFilter : externalProtocolFilter;
  // Create mint-to-name mapping from summary
  const mintToName = useMemo(() => {
    if (!summary) return {};
    const mapping: Record<string, string> = {};
    summary.top_tokens_by_value.forEach(token => {
      if (token.mint === 'WSOL_DIRECT') {
        // Map WSOL_DIRECT to actual wrapped SOL address
        mapping['So11111111111111111111111111111111111111112'] = token.name;
      }
      mapping[token.mint] = token.name;
    });
    return mapping;
  }, [summary]);

  // Prepare pool/type filters
  const poolIdFilter = selectedFilter && !Array.isArray(selectedFilter) ? selectedFilter : null;
  const typeFilterArray = typeFilter
    ? Array.isArray(typeFilter)
      ? typeFilter.filter(Boolean)
      : [typeFilter]
    : [];
  const hasPoolTypeFilter = Boolean(poolIdFilter && typeFilterArray.length > 0);

  // Select data based on group mode or pool/type filters
  let topTransactions: TopTransactionsData = {};
  let groupLabel = '';
  let allTransactions: Array<any> = [];

  if (hasPoolTypeFilter) {
    const combinedTransactions = typeFilterArray.flatMap((type) =>
      topTransactionsPoolType[`${poolIdFilter}_${type}`] || []
    );

    if (combinedTransactions.length > 0) {
      allTransactions = combinedTransactions.map((tx) => ({ ...tx, group: poolIdFilter }));
      groupLabel = 'Pool-Type';
    }
  }

  if (!hasPoolTypeFilter || allTransactions.length === 0) {
    // Standard mode - select data based on group mode
    switch (groupMode) {
      case 'token':
        topTransactions = topTransactionsToken;
        groupLabel = 'Token';
        break;
      case 'type':
        topTransactions = topTransactionsType;
        groupLabel = 'Type';
        break;
      case 'pool':
        topTransactions = topTransactionsPool;
        groupLabel = 'Pool';
        break;
    }

    // Flatten and sort all transactions by amount
    allTransactions = Object.entries(topTransactions).flatMap(([group, txs]) =>
      txs.map(tx => ({ ...tx, group }))
    );

    // Apply filter if selectedFilter is provided
    if (selectedFilter) {
      // Handle both single string and array of types
      const filterValues = Array.isArray(selectedFilter) ? selectedFilter : [selectedFilter];

      // Map WSOL_DIRECT to actual wrapped SOL address
      const mappedFilters = filterValues.map(f =>
        f === 'WSOL_DIRECT' ? 'So11111111111111111111111111111111111111112' : f
      );

      // Filter transactions that match ANY of the filter values
      allTransactions = allTransactions.filter(tx => mappedFilters.includes(tx.group));
    }

    // Apply additional type filter if provided (for dual filtering: pool AND type)
    if (typeFilterArray.length > 0) {
      allTransactions = allTransactions.filter(tx => typeFilterArray.includes(tx.type));
    }
  }

  // Apply protocol filter (Orca vs Fusion)
  if (protocolFilter) {
    allTransactions = allTransactions.filter(tx => {
      const typeLower = (tx.type || '').toLowerCase();
      const poolLabelLower = (tx.pool_label || '').toLowerCase();
      const labelLower = (tx.label || '').toLowerCase();

      if (protocolFilter === 'orca') {
        return typeLower.includes('orca') || poolLabelLower.includes('orca') || labelLower.includes('orca');
      } else if (protocolFilter === 'fusion') {
        return typeLower.includes('fusion') || poolLabelLower.includes('fusion') || labelLower.includes('fusion');
      }
      return true;
    });
  }

  // Deduplicate by signature (same transaction might appear in multiple groups)
  const seenSignatures = new Set<string>();
  const uniqueTransactions = allTransactions.filter(tx => {
    if (seenSignatures.has(tx.signature)) {
      return false;
    }
    seenSignatures.add(tx.signature);
    return true;
  });

  const totalMatching = uniqueTransactions.length;
  const top10 = uniqueTransactions
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  if (top10.length === 0) {
    // Determine why there are no transactions
    const isPoolAndTypeFilter = selectedFilter && typeFilter;

    return (
      <div style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--ifm-color-secondary)',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
      }}>
        <div style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--ifm-font-color-base)' }}>
          No transactions found for this combination
        </div>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          {isPoolAndTypeFilter ? (
            <>
              This pool-type combination has no transactions in the displayed data set.
              <br />
              This could mean:
              <ul style={{
                textAlign: 'left',
                display: 'inline-block',
                marginTop: '12px',
                paddingLeft: '20px'
              }}>
                <li>The transaction type doesn't occur in this pool's top transactions</li>
                <li>This is a rare transaction type for this pool</li>
                <li>The filter combination is very specific and has limited activity</li>
              </ul>
              <div style={{ marginTop: '12px', fontSize: '13px' }}>
                Try selecting just the pool (without the type) to see all transactions for this pool.
              </div>
            </>
          ) : (
            <>No transaction data available for this filter</>
          )}
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper to abbreviate mint addresses (first 5 + last 5 chars)
  const abbreviateMint = (mint: string): string => {
    if (!mint || mint.length <= 10) return mint;
    return `${mint.slice(0, 5)}...${mint.slice(-5)}`;
  };

  // Helper to check if a string looks like a mint address (long alphanumeric)
  const isMintAddress = (str: string): boolean => {
    return str && str.length > 30 && /^[A-Za-z0-9]+$/.test(str);
  };

  // Helper to display token name or abbreviated mint
  const getTokenDisplay = (tx: { token_name?: string; mint: string }): string => {
    // Check if token_name exists and is NOT a mint address
    if (tx.token_name && !isMintAddress(tx.token_name)) {
      return tx.token_name;
    }
    // Check if we have a mapped name that is NOT a mint address
    if (mintToName[tx.mint] && !isMintAddress(mintToName[tx.mint])) {
      return mintToName[tx.mint];
    }
    // Otherwise, abbreviate the mint address
    return abbreviateMint(tx.mint);
  };

  let tableTitle = selectedFilter
    ? `Top 10 Transactions for ${selectedFilterLabel || selectedFilter}`
    : 'Top 10 Transactions';

  // Add protocol filter to title
  if (protocolFilter) {
    const protocolName = protocolFilter.charAt(0).toUpperCase() + protocolFilter.slice(1);
    tableTitle = selectedFilter
      ? `Top 10 ${protocolName} Transactions for ${selectedFilterLabel || selectedFilter}`
      : `Top 10 ${protocolName} Transactions`;
  }

  return (
    <div style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      padding: '24px',
      marginBottom: '24px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          lineHeight: 1.25
        }}>{tableTitle}</div>

        {showProtocolToggle && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setInternalProtocolFilter('orca')}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: '500',
                border: '1px solid var(--ifm-toc-border-color)',
                borderRadius: '4px',
                background: internalProtocolFilter === 'orca' ? 'var(--ifm-color-primary)' : 'var(--ifm-background-color)',
                color: internalProtocolFilter === 'orca' ? '#fff' : 'var(--ifm-font-color-base)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Orca
            </button>
            <button
              onClick={() => setInternalProtocolFilter('fusion')}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: '500',
                border: '1px solid var(--ifm-toc-border-color)',
                borderRadius: '4px',
                background: internalProtocolFilter === 'fusion' ? 'var(--ifm-color-primary)' : 'var(--ifm-background-color)',
                color: internalProtocolFilter === 'fusion' ? '#fff' : 'var(--ifm-font-color-base)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Fusion
            </button>
          </div>
        )}
      </div>
      <div style={{ overflowX: 'auto', marginTop: '16px' }}>
        <table style={{
          display: 'table',
          width: '100%',
          minWidth: '800px',
          borderCollapse: 'collapse',
          fontSize: '14px',
        }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--ifm-toc-border-color)' }}>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Rank</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Amount</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Date</th>
            {groupMode === 'token' && <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Token</th>}
            {groupMode === 'type' && <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Type</th>}
            {groupMode === 'pool' && <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Pool</th>}
            {groupMode !== 'type' && <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Type</th>}
            {groupMode !== 'pool' && <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Pool</th>}
            {groupMode !== 'token' && <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Token</th>}
            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600 }}>Signature</th>
          </tr>
        </thead>
        <tbody>
          {top10.map((tx, idx) => (
            <tr key={tx.signature} style={{
              borderBottom: '1px solid var(--ifm-toc-border-color)',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ifm-toc-border-color)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}>
              <td style={{ padding: '12px 8px', color: 'var(--ifm-color-secondary)' }}>
                #{idx + 1}
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--accent)' }}>
                {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL
              </td>
              <td style={{ padding: '12px 8px', color: 'var(--ifm-color-secondary)', fontFamily: 'var(--ifm-font-family-base)' }}>
                {formatDate(tx.timestamp)}
              </td>

              {/* Primary column (first): Token, Type, or Pool based on groupMode */}
              {groupMode === 'token' && (
                <td style={{ padding: '12px 8px' }}>
                  <a
                    href={`https://solscan.io/token/${tx.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px',
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      display: 'block',
                    }}
                    title={tx.mint}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {getTokenDisplay(tx)}
                  </a>
                </td>
              )}
              {groupMode === 'type' && (
                <td style={{ padding: '12px 8px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--ifm-color-secondary)',
                    maxWidth: '200px',
                  }}>
                    {tx.label}
                  </div>
                </td>
              )}
              {groupMode === 'pool' && (
                <td style={{ padding: '12px 8px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--ifm-color-secondary)',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {tx.pool_label.replace(/<br>/g, ' ')}
                  </div>
                </td>
              )}

              {/* Type column (if not primary) */}
              {groupMode !== 'type' && (
                <td style={{ padding: '12px 8px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--ifm-color-secondary)',
                    maxWidth: '200px',
                  }}>
                    {tx.label}
                  </div>
                </td>
              )}

              {/* Pool column (if not primary) */}
              {groupMode !== 'pool' && (
                <td style={{ padding: '12px 8px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--ifm-color-secondary)',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {tx.pool_label.replace(/<br>/g, ' ')}
                  </div>
                </td>
              )}

              {/* Token column (if not primary) */}
              {groupMode !== 'token' && (
                <td style={{ padding: '12px 8px' }}>
                  <a
                    href={`https://solscan.io/token/${tx.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px',
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      display: 'block',
                    }}
                    title={tx.mint}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {getTokenDisplay(tx)}
                  </a>
                </td>
              )}

              <td style={{ padding: '12px 8px' }}>
                <a
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    fontFamily: 'var(--ifm-font-family-monospace)',
                    color: 'var(--accent)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  {tx.signature.slice(0, 5)}...{tx.signature.slice(-5)}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
