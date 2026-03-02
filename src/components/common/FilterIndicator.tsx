import React from 'react';

interface FilterChip {
  label: string;
  color?: string;
}

interface FilterIndicatorProps {
  filters: FilterChip[];
  onClear: () => void;
  separator?: string;
}

export default function FilterIndicator({
  filters,
  onClear,
  separator,
}: FilterIndicatorProps): React.ReactElement | null {
  if (filters.length === 0) return null;

  return (
    <div style={{
      marginBottom: '16px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{ fontSize: '14px', color: 'var(--ifm-color-secondary)' }}>
        Filtered by:
      </span>
      {filters.map((chip, i) => (
        <React.Fragment key={chip.label}>
          {i > 0 && separator && (
            <span style={{ fontSize: '14px', color: 'var(--ifm-color-secondary)' }}>
              {separator}
            </span>
          )}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '14px',
          }}>
            {chip.color && (
              <span style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: chip.color,
                flexShrink: 0,
              }} />
            )}
            <strong style={{
              color: chip.color || 'var(--ifm-font-color-base)',
            }}>
              {chip.label}
            </strong>
          </span>
        </React.Fragment>
      ))}
      <button
        onClick={onClear}
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
  );
}
