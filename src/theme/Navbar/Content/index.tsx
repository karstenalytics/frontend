import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {
  useThemeConfig,
  ErrorCauseBoundary,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import {
  splitNavbarItems,
  useNavbarMobileSidebar,
} from '@docusaurus/theme-common/internal';
import NavbarItem, {type Props as NavbarItemConfig} from '@theme/NavbarItem';
import NavbarColorModeToggle from '@theme/Navbar/ColorModeToggle';
import SearchBar from '@theme/SearchBar';
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle';
import NavbarLogo from '@theme/Navbar/Logo';
import NavbarSearch from '@theme/Navbar/Search';
import { useManifest } from '@site/src/hooks/useManifest';
import { GithubLogo } from '@phosphor-icons/react';

import styles from './styles.module.css';

function useNavbarItems() {
  // TODO temporary casting until ThemeConfig type is improved
  return useThemeConfig().navbar.items as NavbarItemConfig[];
}

function NavbarItems({items}: {items: NavbarItemConfig[]}): ReactNode {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          key={i}
          onError={(error) =>
            new Error(
              `A theme navbar item failed to render.
Please double-check the following navbar item (themeConfig.navbar.items) of your Docusaurus config:
${JSON.stringify(item, null, 2)}`,
              {cause: error},
            )
          }>
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  );
}

function NavbarContentLayout({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="navbar__inner">
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerLeft,
          'navbar__items',
        )}>
        {left}
      </div>
      <div
        className={clsx(
          ThemeClassNames.layout.navbar.containerRight,
          'navbar__items navbar__items--right',
        )}>
        {right}
      </div>
    </div>
  );
}

export default function NavbarContent(): ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();
  const timestamp = useManifest();

  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);

  const searchBarItem = items.find((item) => item.type === 'search');

  // Check if data is from yesterday or today (UTC) - yesterday is the last complete day
  const isLive = React.useMemo(() => {
    if (!timestamp) return false;
    const dataDate = new Date(timestamp + 'T00:00:00Z'); // Parse as UTC
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

    return dataDate.getTime() === todayUTC.getTime() ||
           dataDate.getTime() === yesterdayUTC.getTime();
  }, [timestamp]);

  return (
    <NavbarContentLayout
      left={
        // TODO stop hardcoding items?
        <>
          {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
          <NavbarLogo />
          <NavbarItems items={leftItems} />
        </>
      }
      right={
        // TODO stop hardcoding items?
        // Ask the user to add the respective navbar items => more flexible
        <>
          <NavbarItems items={rightItems} />
          {timestamp && (
            <span className={styles.timestamp} style={{
              fontSize: '13px',
              color: 'var(--ifm-color-secondary)',
              marginLeft: '12px',
              marginRight: '16px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span
                className={isLive ? styles.liveIndicator : styles.staleIndicator}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  display: 'inline-block'
                }}
              />
              Last full day available: {timestamp}
            </span>
          )}
          <NavbarColorModeToggle className={styles.colorModeToggle} />
          {!searchBarItem && (
            <NavbarSearch>
              <SearchBar />
            </NavbarSearch>
          )}
          <a
            href="https://github.com/karstenalytics/frontend"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '12px',
              padding: '4px 8px',
              borderRadius: '6px',
              color: 'var(--ifm-color-secondary)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'color 120ms ease, background 120ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.background = 'var(--ifm-toc-border-color)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ifm-color-secondary)';
              e.currentTarget.style.background = 'transparent';
            }}
            title="View source on GitHub"
          >
            <GithubLogo size={20} weight="regular" className={styles.githubIcon} />
            <span className={styles.githubText}>GitHub Repo</span>
          </a>
        </>
      }
    />
  );
}
