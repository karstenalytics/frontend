import React from 'react';
import { ShareButton } from '@site/src/components/ShareButton/ShareButton';

interface ChartHeaderProps {
  title: string;
  plotRef: React.RefObject<HTMLDivElement>;
  isMobile: boolean;
  toggle?: React.ReactNode;
}

export default function ChartHeader({
  title,
  plotRef,
  isMobile,
  toggle,
}: ChartHeaderProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '8px',
        paddingLeft: isMobile ? '16px' : 0,
        paddingRight: isMobile ? '16px' : 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: isMobile ? '1.1rem' : '1.25rem',
            fontWeight: 600,
          }}
        >
          {title}
        </h3>
        <ShareButton plotRef={plotRef} chartName={title} isMobile={isMobile} />
      </div>
      {toggle && <div style={{ flexShrink: 0 }}>{toggle}</div>}
    </div>
  );
}
