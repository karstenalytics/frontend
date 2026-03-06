import React, { useMemo, useState } from 'react';
import type { TopTransactionsData, GroupMode, SummaryData } from './types';
import { tableStyles, tableRowHoverHandlers, linkHoverHandlers } from '@site/src/styles/tableStyles';

interface TopTransactionsTableProps {
  topTransactionsToken: TopTransactionsData;
  topTransactionsType: TopTransactionsData;
  topTransactionsPool: TopTransactionsData;
  topTransactionsPoolType: TopTransactionsData;
  groupMode: GroupMode;
  selectedFilter?: string | string[] | null;
  selectedFilterLabel?: string | null;
  typeFilter?: string | string[] | null;
  summary?: SummaryData | null;
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
  const normalizedTypeFilterSet = new Set(
    typeFilterArray.map((type) => String(type).toLowerCase())
  );
  const hasPoolTypeFilter = Boolean(poolIdFilter && typeFilterArray.length > 0);

  // Select data based on group mode or pool/type filters
  let topTransactions: TopTransactionsData = {};
  let groupLabel = '';
  let allTransactions: Array<any> = [];

  if (hasPoolTypeFilter) {
    const combinedTransactions = typeFilterArray.flatMap((type) => {
      const directKey = `${poolIdFilter}_${type}`;
      const directMatches = topTransactionsPoolType[directKey];
      if (directMatches && directMatches.length > 0) {
        return directMatches;
      }

      const normalizedType = String(type).toLowerCase();
      const fallbackKey = Object.keys(topTransactionsPoolType).find((key) => {
        if (!key.startsWith(`${poolIdFilter}_`)) return false;
        const keyType = key.slice(String(poolIdFilter).length + 1);
        return keyType.toLowerCase() === normalizedType;
      });

      return fallbackKey ? (topTransactionsPoolType[fallbackKey] || []) : [];
    });

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
      allTransactions = allTransactions.filter(tx =>
        normalizedTypeFilterSet.has(String(tx.type || '').toLowerCase())
      );
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
    const date = new Date(timestamp * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  // Helper to format SOL amounts with rounding indicator
  const formatSolAmount = (amount: number): string => {
    if (amount > 0 && amount < 0.005) {
      return '~0 SOL';
    }
    return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`;
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

  const normalizePoolLabel = (poolLabel?: string): string => {
    const cleaned = (poolLabel || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/\s+\)/g, ')')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || 'N/A';
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
    <div style={tableStyles.container}>
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
        <table style={{ ...tableStyles.table, minWidth: '800px' }}>
        <thead>
          <tr style={tableStyles.headerRow}>
            <th style={tableStyles.headerCell}>Rank</th>
            <th style={tableStyles.headerCell}>Amount ▼</th>
            <th style={tableStyles.headerCell}>Date</th>
            {groupMode === 'token' && <th style={tableStyles.headerCell}>Token</th>}
            {groupMode === 'type' && <th style={tableStyles.headerCell}>Type</th>}
            {groupMode === 'pool' && <th style={tableStyles.headerCell}>Pool</th>}
            {groupMode !== 'type' && <th style={tableStyles.headerCell}>Type</th>}
            {groupMode !== 'pool' && <th style={tableStyles.headerCell}>Pool</th>}
            {groupMode !== 'token' && <th style={tableStyles.headerCell}>Token</th>}
            <th style={tableStyles.headerCell}>Signature</th>
          </tr>
        </thead>
        <tbody>
          {top10.map((tx, idx) => (
            <tr key={tx.signature} style={tableStyles.bodyRow} {...tableRowHoverHandlers}>
              <td style={tableStyles.rankCell}>
                #{idx + 1}
              </td>
              <td style={tableStyles.amountCell}>
                {formatSolAmount(tx.amount)}
              </td>
              <td style={tableStyles.dateCell}>
                {formatDate(tx.timestamp)}
              </td>

              {/* Primary column (first): Token, Type, or Pool based on groupMode */}
              {groupMode === 'token' && (
                <td style={tableStyles.cell}>
                  <a
                    href={`https://solscan.io/token/${tx.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...tableStyles.link, fontSize: '12px', display: 'block' }}
                    title={tx.mint}
                    {...linkHoverHandlers}
                  >
                    {getTokenDisplay(tx)}
                  </a>
                </td>
              )}
              {groupMode === 'type' && (
                <td style={tableStyles.cell}>
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
                <td style={tableStyles.cell}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--ifm-color-secondary)',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {normalizePoolLabel(tx.pool_label)}
                  </div>
                </td>
              )}

              {/* Type column (if not primary) */}
              {groupMode !== 'type' && (
                <td style={tableStyles.cell}>
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
                <td style={tableStyles.cell}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--ifm-color-secondary)',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {normalizePoolLabel(tx.pool_label)}
                  </div>
                </td>
              )}

              {/* Token column (if not primary) */}
              {groupMode !== 'token' && (
                <td style={tableStyles.cell}>
                  <a
                    href={`https://solscan.io/token/${tx.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...tableStyles.link, fontSize: '12px', display: 'block' }}
                    title={tx.mint}
                    {...linkHoverHandlers}
                  >
                    {getTokenDisplay(tx)}
                  </a>
                </td>
              )}

              <td style={tableStyles.cell}>
                <a
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...tableStyles.link, fontSize: '12px', fontFamily: 'var(--ifm-font-family-monospace)' }}
                  {...linkHoverHandlers}
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
