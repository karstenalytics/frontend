import React from 'react';

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface ChartToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
  variant?: 'primary' | 'secondary';
}

// Primary: Teal (#00A3B4)
// Secondary: Slate/Gray (#64748B)
const VARIANT_COLORS = {
  primary: '#00A3B4',
  secondary: '#64748B',
};

export default function ChartToggle<T extends string>({
  value,
  onChange,
  options,
  variant = 'primary',
}: ChartToggleProps<T>): React.ReactElement {
  const accentColor = VARIANT_COLORS[variant];

  return (
    <div style={{ display: 'flex', gap: '0px' }}>
      {options.map((opt, index) => {
        const isActive = value === opt.value;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: '500',
              border: `1px solid ${isActive ? accentColor : 'var(--ifm-toc-border-color)'}`,
              borderRadius: isFirst
                ? '4px 0 0 4px'
                : isLast
                  ? '0 4px 4px 0'
                  : '0',
              marginLeft: isFirst ? '0' : '-1px',
              background: isActive ? accentColor : 'var(--ifm-background-color)',
              color: isActive ? '#fff' : 'var(--ifm-font-color-base)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
              zIndex: isActive ? 1 : 0,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
