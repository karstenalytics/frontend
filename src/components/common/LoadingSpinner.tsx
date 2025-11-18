import React from 'react';

export default function LoadingSpinner(): React.ReactElement {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      color: 'var(--ifm-color-secondary)',
    }}>
      <div style={{
        border: '3px solid var(--ifm-toc-border-color)',
        borderTop: '3px solid var(--accent)',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ marginLeft: '16px', fontSize: '14px' }}>Loading analytics data...</span>
    </div>
  );
}
