import React, { useState, useEffect } from 'react';

interface TokenIconsMap {
  [mint: string]: {
    symbol: string;
    name: string;
    icon: string | null;
  };
}

// Cache for token icons
let cachedIcons: TokenIconsMap | null = null;
let loadingPromise: Promise<TokenIconsMap> | null = null;

function loadIcons(): Promise<TokenIconsMap> {
  if (cachedIcons) {
    return Promise.resolve(cachedIcons);
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = fetch('/img/icons/token_icons.json')
    .then(res => res.json())
    .then(data => {
      cachedIcons = data;
      return data;
    })
    .catch(() => {
      cachedIcons = {};
      return {};
    });

  return loadingPromise;
}

function getIconPath(mint: string, icons: TokenIconsMap): string | null {
  // Handle special cases
  if (mint === 'WSOL_DIRECT' || mint === 'SOL') {
    const solIcon = icons['So11111111111111111111111111111111111111112'];
    return solIcon?.icon ? `/img/icons/${solIcon.icon}` : null;
  }

  if (mint === 'OTHERS') {
    return null;
  }

  const tokenInfo = icons[mint];
  if (tokenInfo?.icon) {
    return `/img/icons/${tokenInfo.icon}`;
  }

  return null;
}

interface TokenDisplayProps {
  /** Token mint address */
  mint: string;
  /** Icon size in pixels */
  size?: number;
  /** Show token symbol after icon */
  showSymbol?: boolean;
  /** Custom symbol to display (overrides lookup) */
  symbol?: string;
  /** Additional styles for the container */
  style?: React.CSSProperties;
  /** Additional class name */
  className?: string;
}

/**
 * Displays a token icon with optional symbol.
 * Automatically loads icon based on mint address.
 */
export default function TokenDisplay({
  mint,
  size = 16,
  showSymbol = true,
  symbol,
  style,
  className,
}: TokenDisplayProps): React.ReactElement | null {
  const [icons, setIcons] = useState<TokenIconsMap>(cachedIcons || {});
  const [loading, setLoading] = useState(!cachedIcons);

  useEffect(() => {
    if (cachedIcons) {
      setIcons(cachedIcons);
      setLoading(false);
      return;
    }

    loadIcons().then(data => {
      setIcons(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return null;
  }

  const iconPath = getIconPath(mint, icons);
  const tokenInfo = icons[mint] || icons['So11111111111111111111111111111111111111112'];

  // Determine what symbol to show
  let displaySymbol = symbol;
  if (!displaySymbol && showSymbol) {
    if (mint === 'WSOL_DIRECT' || mint === 'SOL' || mint === 'So11111111111111111111111111111111111111112') {
      displaySymbol = 'SOL';
    } else {
      displaySymbol = tokenInfo?.symbol || mint.slice(0, 4);
    }
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '4px',
        ...style,
      }}
      className={className}
    >
      {iconPath && (
        <img
          src={iconPath}
          alt=""
          width={size}
          height={size}
          style={{
            borderRadius: '50%',
            flexShrink: 0,
            background: 'white',
            boxShadow: '0 0 0 0px white',
            verticalAlign: 'text-bottom',
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      {displaySymbol}
    </span>
  );
}
