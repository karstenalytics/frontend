import React, { useMemo } from 'react';
import type { VestingSchedule } from '@site/src/hooks/useVestingTimeline';
import { tableStyles, tableRowHoverHandlers } from '@site/src/styles/tableStyles';

interface DailyUnlock {
  date: string;
  totalAmount: number;
  daysUntil: number;
  scheduleCount: number;
  signatures: string[];
}

interface NextUnlocksTableProps {
  schedules: VestingSchedule[];
  onDateClick?: (date: string) => void;
}

export default function NextUnlocksTable({
  schedules,
  onDateClick,
}: NextUnlocksTableProps): React.ReactElement {
  const nextUnlocks = useMemo(() => {
    const now = new Date();
    // Group by date: date -> {totalAmount, signatures[]}
    const unlocksByDate = new Map<string, { amount: number; signatures: Set<string> }>();

    for (const schedule of schedules) {
      if (!schedule.first_unlock || !schedule.last_unlock) continue;

      const firstUnlockTime = new Date(schedule.first_unlock);
      const unlockPeriodHours = schedule.unlock_period_hours;
      const unlockRate = schedule.unlock_rate_tuna;
      const numUnlocks = schedule.num_unlocks;

      // Generate all unlock events for this schedule
      for (let i = 0; i < numUnlocks; i++) {
        const unlockTime = new Date(
          firstUnlockTime.getTime() + i * unlockPeriodHours * 60 * 60 * 1000
        );

        // Skip past unlocks
        if (unlockTime > now) {
          const dateStr = unlockTime.toISOString().split('T')[0];

          if (!unlocksByDate.has(dateStr)) {
            unlocksByDate.set(dateStr, {
              amount: 0,
              signatures: new Set()
            });
          }

          const entry = unlocksByDate.get(dateStr)!;
          entry.amount += unlockRate;
          entry.signatures.add(schedule.signature);
        }
      }
    }

    // Convert to array and calculate days until
    const dailyUnlocks: DailyUnlock[] = [];
    for (const [date, data] of unlocksByDate.entries()) {
      const unlockDate = new Date(date);
      const daysUntil = Math.ceil(
        (unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      dailyUnlocks.push({
        date,
        totalAmount: data.amount,
        daysUntil,
        scheduleCount: data.signatures.size,
        signatures: Array.from(data.signatures),
      });
    }

    // Sort by date and return top 10 days
    return dailyUnlocks
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10);
  }, [schedules]);

  if (nextUnlocks.length === 0) {
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
        <div style={{ marginTop: 0, marginBottom: '4px', fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.25 }}>
          Next Unlocks
        </div>
        <p style={{ color: 'var(--ifm-color-secondary)', fontSize: '14px' }}>
          All vesting schedules have completed unlocking.
        </p>
      </div>
    );
  }

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
      <div style={{ marginTop: 0, marginBottom: '4px', fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.25 }}>
        Next 10 Unlock Days
      </div>
      <div style={{ fontSize: '13px', color: 'var(--ifm-color-secondary)', marginBottom: '16px' }}>
        Upcoming unlock events grouped by day. Amounts are summed when multiple schedules unlock on the same day.
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...tableStyles.table, minWidth: '600px' }}>
          <thead>
            <tr style={tableStyles.headerRow}>
              <th style={tableStyles.headerCell}>Unlock Date ▲</th>
              <th style={tableStyles.headerCell}>Total Amount (TUNA)</th>
              <th style={tableStyles.headerCell}>Days Until</th>
              <th style={tableStyles.headerCell}>Schedules</th>
            </tr>
          </thead>
          <tbody>
            {nextUnlocks.map((daily) => (
              <tr
                key={daily.date}
                style={tableStyles.bodyRow}
                {...tableRowHoverHandlers}
              >
                <td style={tableStyles.dateCell}>{daily.date}</td>
                <td style={tableStyles.amountCell}>
                  {daily.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td style={{ ...tableStyles.cell, color: daily.daysUntil < 7 ? 'var(--ifm-color-warning)' : 'var(--ifm-color-secondary)' }}>
                  {daily.daysUntil}
                </td>
                <td style={tableStyles.cell}>
                  <button
                    onClick={() => onDateClick && onDateClick(daily.date)}
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
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--accent)';
                    }}
                    title={`View ${daily.scheduleCount} schedule${daily.scheduleCount > 1 ? 's' : ''} unlocking on ${daily.date}`}
                  >
                    {daily.scheduleCount} schedule{daily.scheduleCount > 1 ? 's' : ''}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
