/**
 * Centralized table styling configuration
 * Ensures consistent appearance across all table components
 */

export const tableStyles = {
  // Table container
  container: {
    background: 'var(--ifm-background-surface-color)',
    border: '1px solid var(--ifm-toc-border-color)',
    borderRadius: 'var(--ifm-global-radius)',
    padding: '24px',
    marginBottom: '24px',
  },

  // Table element
  table: {
    display: 'table',
    width: '100%',
    minWidth: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },

  // Header row
  headerRow: {
    borderBottom: '2px solid var(--ifm-toc-border-color)',
  },

  // Header cell
  headerCell: {
    textAlign: 'left' as const,
    padding: '12px 8px',
    fontWeight: 600,
  },

  // Body row
  bodyRow: {
    borderBottom: '1px solid var(--ifm-toc-border-color)',
    transition: 'background 120ms ease',
  },

  // Standard cell
  cell: {
    padding: '12px 8px',
  },

  // Date cell (First Seen, Last Seen, Date columns)
  dateCell: {
    padding: '12px 8px',
    color: 'var(--ifm-color-secondary)',
    fontFamily: 'var(--ifm-font-family-base)',
  },

  // Address cell (wallet addresses)
  addressCell: {
    padding: '12px 8px',
    fontFamily: 'var(--ifm-font-family-monospace)',
    fontSize: '12px',
  },

  // Link styling
  link: {
    color: 'var(--accent)',
    textDecoration: 'none' as const,
  },

  // Rank cell
  rankCell: {
    padding: '12px 8px',
    color: 'var(--ifm-color-secondary)',
  },

  // Amount cell (SOL amounts, TUNA amounts)
  amountCell: {
    padding: '12px 8px',
    fontWeight: 600,
    color: 'var(--accent)',
  },
} as const;

/**
 * Hover effect handlers for table rows
 */
export const tableRowHoverHandlers = {
  onMouseEnter: (e: React.MouseEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.background = 'var(--ifm-toc-border-color)';
  },
  onMouseLeave: (e: React.MouseEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.background = 'transparent';
  },
};

/**
 * Hover effect handlers for links
 */
export const linkHoverHandlers = {
  onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.textDecoration = 'underline';
  },
  onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.textDecoration = 'none';
  },
};
