import React from 'react';
import { useLocation } from '@docusaurus/router';
import Link from '@docusaurus/Link';
import {
  HouseSimple,
  NewspaperClipping,
  ChartLineUp,
  type IconProps,
  Compass,
  ChartBarIcon,
  NotepadIcon,
} from '@phosphor-icons/react';
import { useManifest } from '@site/src/hooks/useManifest';
import './styles.css';

interface NavTab {
  label: string;
  to: string;
  activePattern: RegExp;
  Icon: React.ComponentType<IconProps>;
  disabled?: boolean;
}

const tabs: NavTab[] = [
  {
    label: 'Intro',
    to: '/',
    activePattern: /^\/(frontend\/)?(intro\/.*)?$/,
    Icon: Compass,
  },
  {
    label: 'Articles',
    to: '/blog',
    activePattern: /^\/(frontend\/)?blog/,
    Icon: NotepadIcon,
    disabled: true,
  },
  {
    label: 'Analysis',
    to: '/analysis/overview',
    activePattern: /^\/(frontend\/)?analysis\//,
    Icon: ChartBarIcon,
  },
];

export default function NavbarTabs(): JSX.Element {
  const location = useLocation();
  const timestamp = useManifest();

  const isTabActive = (tab: NavTab): boolean => tab.activePattern.test(location.pathname);

  const isLive = React.useMemo(() => {
    if (!timestamp) return false;
    const dataDate = new Date(timestamp + 'T00:00:00Z');
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

    return dataDate.getTime() === todayUTC.getTime() ||
           dataDate.getTime() === yesterdayUTC.getTime();
  }, [timestamp]);

  return (
    <div className="navbar-tabs">
      <div className="navbar-tabs__inner">
        {tabs.map((tab) => {
          const active = isTabActive(tab);
          const { Icon } = tab;
          const className = `navbar-tabs__link ${active ? 'navbar-tabs__link--active' : ''} ${tab.disabled ? 'navbar-tabs__link--disabled' : ''}`;

          if (tab.disabled) {
            return (
              <span
                key={tab.label}
                className={className}
              >
                <Icon
                  size={18}
                  weight="regular"
                  className="navbar-tabs__icon"
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
              </span>
            );
          }

          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={className}
            >
              <Icon
                size={18}
                weight={active ? 'fill' : 'regular'}
                className="navbar-tabs__icon"
                aria-hidden="true"
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
        {timestamp && (
          <span className="navbar-tabs__timestamp">
            <span
              className={`navbar-tabs__indicator ${isLive ? 'navbar-tabs__indicator--live' : 'navbar-tabs__indicator--stale'}`}
            />
            Last full day available: {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
