import React, { useEffect } from 'react';
import type { UserSegments } from '@site/src/hooks/useStakerLoyalty';
import { trackCustomEvent } from '@site/src/utils/analytics';

interface BehaviorSegmentsTableProps {
  userSegments: UserSegments;
  totalUsers: number;
}

export default function BehaviorSegmentsTable({
  userSegments,
  totalUsers,
}: BehaviorSegmentsTableProps): React.ReactElement {
  const { by_behavior, by_reward_size } = userSegments;

  // Track when segment tables are viewed
  useEffect(() => {
    trackCustomEvent('Loyalty', 'view-segments', 'behavior-breakdown');
  }, []);

  const rows = [
    {
      segment: 'Compound-only',
      users: by_behavior.compound_only.count,
      percentage: by_behavior.compound_only.percentage,
      compoundRate: 100,
      description: 'Never claim rewards',
    },
    {
      segment: 'Claim-only',
      users: by_behavior.claim_only.count,
      percentage: by_behavior.claim_only.percentage,
      compoundRate: 0,
      description: 'Never compound rewards',
    },
    {
      segment: 'Mixed Behavior',
      users: by_behavior.mixed.count,
      percentage: by_behavior.mixed.percentage,
      compoundRate: null, // Variable
      description: 'Both claim and compound',
    },
  ];

  const sizeRows = [
    {
      segment: by_reward_size.small.label,
      users: by_reward_size.small.user_count,
      compoundRate: by_reward_size.small.avg_compound_rate * 100,
      totalRewards: by_reward_size.small.total_rewards,
    },
    {
      segment: by_reward_size.medium.label,
      users: by_reward_size.medium.user_count,
      compoundRate: by_reward_size.medium.avg_compound_rate * 100,
      totalRewards: by_reward_size.medium.total_rewards,
    },
    {
      segment: by_reward_size.large.label,
      users: by_reward_size.large.user_count,
      compoundRate: by_reward_size.large.avg_compound_rate * 100,
      totalRewards: by_reward_size.large.total_rewards,
    },
    {
      segment: by_reward_size.whales.label,
      users: by_reward_size.whales.user_count,
      compoundRate: by_reward_size.whales.avg_compound_rate * 100,
      totalRewards: by_reward_size.whales.total_rewards,
    },
  ];

  return (
    <div style={{ marginBottom: '32px' }}>
      <h3>User Behavior Breakdown</h3>

      <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'var(--ifm-background-surface-color)',
            border: '1px solid var(--ifm-color-emphasis-200)',
            borderRadius: 'var(--ifm-global-radius)',
          }}
        >
          <thead>
            <tr style={{ background: 'var(--ifm-color-emphasis-100)' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                Segment
              </th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                Users
              </th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                % of Total
              </th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                Compound Rate
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--ifm-color-emphasis-200)' }}>
                <td style={{ padding: '12px', fontWeight: '500' }}>{row.segment}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {row.users.toLocaleString()}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {row.percentage.toFixed(1)}%
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {row.compoundRate !== null ? `${row.compoundRate}%` : 'Variable'}
                </td>
                <td style={{ padding: '12px', color: 'var(--ifm-color-emphasis-700)' }}>
                  {row.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Breakdown by Reward Size</h3>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'var(--ifm-background-surface-color)',
            border: '1px solid var(--ifm-color-emphasis-200)',
            borderRadius: 'var(--ifm-global-radius)',
          }}
        >
          <thead>
            <tr style={{ background: 'var(--ifm-color-emphasis-100)' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                Tier
              </th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                Users
              </th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                Avg Compound Rate
              </th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--ifm-color-emphasis-300)' }}>
                Total Rewards (SOL)
              </th>
            </tr>
          </thead>
          <tbody>
            {sizeRows.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid var(--ifm-color-emphasis-200)',
                  background: row.segment.includes('Medium') ? 'rgba(0, 163, 180, 0.05)' : 'transparent',
                }}
              >
                <td style={{ padding: '12px', fontWeight: row.segment.includes('Medium') ? '600' : '500' }}>
                  {row.segment}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {row.users.toLocaleString()}
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontWeight: row.segment.includes('Medium') ? '600' : 'normal',
                    color: row.segment.includes('Medium') ? 'var(--accent)' : 'inherit',
                  }}
                >
                  {row.compoundRate.toFixed(1)}%
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {row.totalRewards.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ color: 'var(--ifm-color-emphasis-700)', marginTop: '16px', fontSize: '14px' }}>
        Highlighted row shows the tier with the highest average compound rate
      </p>
    </div>
  );
}
