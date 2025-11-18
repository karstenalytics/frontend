import React, {type ReactNode} from 'react';
import {useColorMode, useThemeConfig} from '@docusaurus/theme-common';
import {Sun, Moon, Monitor} from '@phosphor-icons/react';
import type {Props} from '@theme/Navbar/ColorModeToggle';
import styles from './styles.module.css';
import { safeGetItem, safeSetItem } from '@site/src/utils/localStorage';

type ColorModeType = 'light' | 'dark' | 'system';

export default function NavbarColorModeToggle({className}: Props): ReactNode {
  const {disableSwitch} = useThemeConfig().colorMode;
  const {colorMode, setColorMode} = useColorMode();

  if (disableSwitch) {
    return null;
  }

  // Determine the current mode selection
  // Docusaurus doesn't have a built-in 'system' mode, so we'll use localStorage to track user preference
  const [selectedMode, setSelectedMode] = React.useState<ColorModeType>(() => {
    if (typeof window !== 'undefined') {
      const stored = safeGetItem('theme-preference', 'system');
      return stored as ColorModeType;
    }
    return 'system';
  });

  const handleModeChange = (mode: ColorModeType) => {
    setSelectedMode(mode);
    if (typeof window !== 'undefined') {
      safeSetItem('theme-preference', mode);
    }

    if (mode === 'system') {
      // Apply system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setColorMode(prefersDark ? 'dark' : 'light');
    } else {
      setColorMode(mode);
    }
  };

  // Listen for system theme changes when in system mode
  React.useEffect(() => {
    if (selectedMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setColorMode(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [selectedMode, setColorMode]);

  const iconSize = 18;
  const iconWeight = 'regular' as const;

  return (
    <div className={`${styles.themeSwitcher} ${className || ''}`}>
      <button
        className={`${styles.themeButton} ${selectedMode === 'light' ? styles.themeButtonActive : ''}`}
        onClick={() => handleModeChange('light')}
        aria-label="Light theme"
        title="Light theme"
      >
        <Sun size={iconSize} weight={iconWeight} />
      </button>
      <button
        className={`${styles.themeButton} ${selectedMode === 'system' ? styles.themeButtonActive : ''}`}
        onClick={() => handleModeChange('system')}
        aria-label="System theme"
        title="System theme"
      >
        <Monitor size={iconSize} weight={iconWeight} />
      </button>
      <button
        className={`${styles.themeButton} ${selectedMode === 'dark' ? styles.themeButtonActive : ''}`}
        onClick={() => handleModeChange('dark')}
        aria-label="Dark theme"
        title="Dark theme"
      >
        <Moon size={iconSize} weight={iconWeight} />
      </button>
    </div>
  );
}
