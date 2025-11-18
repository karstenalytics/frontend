import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import type {Props} from '@theme/DocSidebarItem/Link';
import {isActiveSidebarItem} from '@docusaurus/plugin-content-docs/client';
import Link from '@docusaurus/Link';
import isInternalUrl from '@docusaurus/isInternalUrl';
import IconExternalLink from '@theme/Icon/ExternalLink';
import styles from './styles.module.css';
import {FileText, House, Gear, User, ChartBar, Info, TrendUp, Percent, Article, Newspaper, FlowArrow, SealCheck, type IconProps as PhosphorIconProps} from '@phosphor-icons/react';

function LinkLabel({
  label,
  icon,
  showPlaceholder,
}: {
  label: string;
  icon: ReactNode | null;
  showPlaceholder: boolean;
}) {
  return (
    <span className={styles.linkContent}>
      {icon ? (
        <span className={styles.linkIcon} aria-hidden='true'>
          {icon}
        </span>
      ) : showPlaceholder ? (
        <span className={styles.linkIconPlaceholder} aria-hidden='true' />
      ) : null}
      <span title={label} className={styles.linkLabel}>
        {label}
      </span>
    </span>
  );
}

function getLinkIcon(level: number, isActive: boolean, customProps?: {icon?: string}): ReactNode | null {
  const common: PhosphorIconProps = {
    size: level === 1 ? 16 : 14,
    weight: 'regular',
    'aria-hidden': true,
  };

  // If custom Phosphor icon name is provided in frontmatter, use it
  if (customProps?.icon) {
    switch (customProps.icon) {
      case 'House':
        return <House {...common} />;
      case 'Gear':
        return <Gear {...common} />;
      case 'User':
        return <User {...common} />;
      case 'ChartBar':
        return <ChartBar {...common} />;
      case 'Info':
        return <Info {...common} />;
      case 'TrendUp':
        return <TrendUp {...common} />;
      case 'Percent':
        return <Percent {...common} />;
      case 'Article':
        return <Article {...common} />;
      case 'Newspaper':
        return <Newspaper {...common} />;
      case 'FlowArrow':
        return <FlowArrow {...common} />;
      case 'SealCheck':
        return <SealCheck {...common} />;
      default:
        break;
    }
  }

  // Otherwise use default icon for level 1 items
  if (level === 1) {
    return <FileText {...common} />;
  }
  if (level === 2) {
    return null;
  }
  return null;
}

export default function DocSidebarItemLink({
  item,
  onItemClick,
  activePath,
  level,
  index,
  ...props
}: Props): ReactNode {
  const {href, label, className, autoAddBaseUrl, customProps} = item;
  const isActive = isActiveSidebarItem(item, activePath);
  const isInternalLink = isInternalUrl(href);
  const icon = getLinkIcon(level, isActive, customProps as {icon?: string});
  const showPlaceholder = level === 1;

  return (
    <li
      className={clsx(
        ThemeClassNames.docs.docSidebarItemLink,
        ThemeClassNames.docs.docSidebarItemLinkLevel(level),
        'menu__list-item',
        className,
      )}
      key={label}>
      <Link
        className={clsx(
          'menu__link',
          !isInternalLink && styles.menuExternalLink,
          {
            'menu__link--active': isActive,
          },
        )}
        autoAddBaseUrl={autoAddBaseUrl}
        aria-current={isActive ? 'page' : undefined}
        to={href}
        {...(isInternalLink && {
          onClick: onItemClick ? () => onItemClick(item) : undefined,
        })}
        {...props}>
        <LinkLabel label={label} icon={icon} showPlaceholder={showPlaceholder} />
        {!isInternalLink && <IconExternalLink />}
      </Link>
    </li>
  );
}


