import React from 'react';
import InfoTooltip from './InfoTooltip';

export interface MetricCardProps {
  /** Card title displayed in the header */
  title: string;
  /** Numeric value to display. Falls back to fallbackValue, then '-' */
  value: number | null | undefined;
  /** How to format the value */
  format: 'currency' | 'percent' | 'number';
  /** Decimal places (default 1 for percent, unset for number) */
  decimals?: number;
  /** Secondary value used when primary is null/undefined */
  fallbackValue?: number | null;
  /** Period-over-period change. Omit prop entirely to hide badge. */
  change?: number | null;
  /** Override change badge unit. Default: 'pp' for percent format, '%' for others. */
  changeUnit?: '%' | 'pp' | 'number';
  /** Tooltip text. Use \n to separate metric explanation from change explanation. */
  tooltip: string;
  /** Dashboard link shown at the bottom of the tooltip */
  link?: { label: string; href: string };
  /** Text or element rendered after the formatted value (e.g. "x", "SOL") */
  suffix?: React.ReactNode;
}

function formatValue(
  value: number | null | undefined,
  fallback: number | null | undefined,
  format: 'currency' | 'percent' | 'number',
  decimals?: number,
): string {
  const v = value ?? fallback;
  if (v == null) return '-';

  switch (format) {
    case 'currency':
      return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    case 'percent':
      return v.toFixed(decimals ?? 1) + '%';
    case 'number':
      if (decimals != null) {
        return v.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
      }
      return v.toLocaleString();
  }
}

function ChangeBadge({ value, unit }: { value: number | null | undefined; unit: '%' | 'pp' | 'number' }): React.ReactElement | null {
  if (value == null) return null;
  const isUp = value > 0;
  const isDown = value < 0;
  const cls = isUp ? 'metric-change--up' : isDown ? 'metric-change--down' : 'metric-change--flat';
  const prefix = isUp ? '+' : '';
  let text: string;
  if (unit === 'number') {
    text = value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  } else if (unit === 'pp') {
    text = value.toFixed(2) + ' pp';
  } else {
    text = value.toFixed(1) + '%';
  }
  return <span className={`metric-change ${cls}`}>{prefix}{text}</span>;
}

export default function MetricCard({
  title,
  value,
  format,
  decimals,
  fallbackValue,
  change,
  changeUnit,
  tooltip,
  link,
  suffix,
}: MetricCardProps): React.ReactElement {
  const formatted = formatValue(value, fallbackValue, format, decimals);
  const unit = changeUnit ?? (format === 'percent' ? 'pp' : '%');

  return (
    <div className="usage-summary-card">
      <h3>{title} <InfoTooltip text={tooltip} link={link} /></h3>
      <p>{formatted}{suffix}</p>
      {change !== undefined && <ChangeBadge value={change} unit={unit} />}
    </div>
  );
}
