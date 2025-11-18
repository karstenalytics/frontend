import React from 'react';
import type { DashboardControls, GroupMode } from './types';
import { trackCustomEvent } from '@site/src/utils/analytics';

interface DashboardControlsProps {
  controls: DashboardControls;
  onChange: (controls: DashboardControls) => void;
}

export default function DashboardControlsComponent({
  controls,
  onChange,
}: DashboardControlsProps): React.ReactElement {
  const handleGroupModeChange = (groupMode: GroupMode) => {
    onChange({ ...controls, groupMode });
    // Track filter changes
    trackCustomEvent('Dashboard', 'filter-change', `group-${groupMode}`);
  };

  return (
    <div style={{
      padding: '20px 24px',
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      marginBottom: '24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        {/* Group Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--ifm-font-color-base)',
          }}>
            Group By:
          </label>
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '4px',
            background: 'var(--ifm-background-color)',
            borderRadius: '6px',
            border: '1px solid var(--ifm-toc-border-color)',
          }}>
            <button
              onClick={() => handleGroupModeChange('token')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 120ms ease',
                background: controls.groupMode === 'token' ? 'var(--accent)' : 'transparent',
                color: controls.groupMode === 'token' ? '#FFFFFF' : 'var(--ifm-font-color-base)',
              }}
            >
              Token
            </button>
            <button
              onClick={() => handleGroupModeChange('type')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 120ms ease',
                background: controls.groupMode === 'type' ? 'var(--accent)' : 'transparent',
                color: controls.groupMode === 'type' ? '#FFFFFF' : 'var(--ifm-font-color-base)',
              }}
            >
              Type
            </button>
            <button
              onClick={() => handleGroupModeChange('pool')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 120ms ease',
                background: controls.groupMode === 'pool' ? 'var(--accent)' : 'transparent',
                color: controls.groupMode === 'pool' ? '#FFFFFF' : 'var(--ifm-font-color-base)',
              }}
            >
              Pool
            </button>
          </div>
        </div>

        {/* Additional info */}
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
        }}>
          {controls.groupMode === 'token' && 'Viewing revenue breakdown by token'}
          {controls.groupMode === 'type' && 'Viewing revenue breakdown by transaction type'}
          {controls.groupMode === 'pool' && 'Viewing revenue breakdown by liquidity pool'}
        </div>
      </div>
    </div>
  );
}
