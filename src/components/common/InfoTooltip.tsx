import React from 'react';
import { Info } from '@phosphor-icons/react';

interface InfoTooltipProps {
  text: string;
  link?: { label: string; href: string };
}

export default function InfoTooltip({ text, link }: InfoTooltipProps): React.ReactElement {
  const segments = text.split('\n');
  return (
    <span className="info-tooltip" aria-label={text}>
      <Info size={16} weight="regular" />
      <span className="info-tooltip-bubble" role="tooltip">
        {segments.map((seg, i) => (
          <React.Fragment key={i}>
            {i > 0 && <><br /><br /></>}
            {seg}
          </React.Fragment>
        ))}
        {link && (
          <>
            <br /><br />
            <a href={link.href} className="info-tooltip-link">{link.label}</a>
          </>
        )}
      </span>
    </span>
  );
}
