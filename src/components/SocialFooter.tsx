import React, { useEffect, useRef } from 'react';
import { DiscordLogo, DiscordLogoIcon, EnvelopeIcon, HeartIcon, HeartStraight, TwitterLogo, XLogoIcon } from '@phosphor-icons/react';

const LINKS = [
  {
    href: 'https://x.com/karstenalytics',
    label: '@karstenalytics',
    title: 'Follow on X (Twitter)',
    Icon: XLogoIcon,
  },
  {
    href: 'https://discord.com/users/karstn#9338',
    label: 'karsten',
    title: 'discord',
    Icon: DiscordLogoIcon,
  },
];

// Obfuscated email link - assembled at runtime so scrapers don't see the address
function EmailLink(): React.ReactElement {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (ref.current) {
      const u = 'karstenalytics';
      const d = 'gmail.com';
      const addr = `${u}@${d}`;
      ref.current.href = `mailto:${addr}`;
      ref.current.querySelector('span')!.textContent = addr;
    }
  }, []);
  return (
    <a ref={ref} className="social-footer__link" href="#" title="Send email" rel="noopener noreferrer">
      <EnvelopeIcon size={18} weight="regular" />
      <span></span>
    </a>
  );
}

const DONATION_ADDRESS = '7bYtEL23TT9YeELjSaNLi59PHwerNw9woMacYXefr6RF';
const DONATION_DISPLAY = `${DONATION_ADDRESS.slice(0, 5)}...${DONATION_ADDRESS.slice(-5)}`;

export default function SocialFooter(): React.ReactElement {
  return (
    <div className="social-footer" role="contentinfo" aria-label="Social links and donation">
      <div className="social-footer__content">
        {LINKS.map(({ href, label, title, Icon }) => (
          <a
            key={href}
            className="social-footer__link"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
          >
            <Icon size={18} weight="regular" />
            <span>{label}</span>
          </a>
        ))}
        <EmailLink />
        <a
          className="social-footer__link social-footer__donate"
          href={`https://solscan.io/account/${DONATION_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`Donate SOL to ${DONATION_ADDRESS}`}
        >
          <HeartIcon size={18} weight="regular" />
          <span>Donate (SOL): {DONATION_DISPLAY}</span>
        </a>
      </div>
    </div>
  );
}
