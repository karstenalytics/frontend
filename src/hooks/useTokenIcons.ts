/**
 * Hook and utilities for accessing token icons
 */

import { useState, useEffect } from 'react';

interface TokenIconInfo {
  symbol: string;
  name: string;
  icon: string | null;
}

interface TokenIconsMap {
  [mint: string]: TokenIconInfo;
}

// Cache the token icons data
let cachedIcons: TokenIconsMap | null = null;

/**
 * Hook to load and access token icons
 */
export function useTokenIcons() {
  const [icons, setIcons] = useState<TokenIconsMap>(cachedIcons || {});
  const [loading, setLoading] = useState(!cachedIcons);

  useEffect(() => {
    if (cachedIcons) {
      setIcons(cachedIcons);
      setLoading(false);
      return;
    }

    fetch('/img/icons/token_icons.json')
      .then(res => res.json())
      .then(data => {
        cachedIcons = data;
        setIcons(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load token icons:', err);
        setLoading(false);
      });
  }, []);

  return { icons, loading };
}

/**
 * Get the icon path for a token mint address
 */
export function getTokenIconPath(mint: string, icons: TokenIconsMap): string | null {
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

/**
 * TokenIcon component for displaying token icons inline
 */
interface TokenIconProps {
  mint: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function TokenIcon({ mint, size = 20, style, className }: TokenIconProps) {
  const { icons, loading } = useTokenIcons();

  if (loading) {
    return null;
  }

  const iconPath = getTokenIconPath(mint, icons);

  if (!iconPath) {
    return null;
  }

  return (
    <img
      src={iconPath}
      alt=""
      width={size}
      height={size}
      style={{
        borderRadius: '50%',
        verticalAlign: 'middle',
        ...style,
      }}
      className={className}
      onError={(e) => {
        // Hide broken images
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

export default useTokenIcons;
