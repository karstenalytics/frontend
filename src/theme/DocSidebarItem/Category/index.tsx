import React, {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useMemo,
} from 'react';
import clsx from 'clsx';
import {
  ThemeClassNames,
  useThemeConfig,
  usePrevious,
  Collapsible,
  useCollapsible,
} from '@docusaurus/theme-common';
import {isSamePath} from '@docusaurus/theme-common/internal';
import {
  isActiveSidebarItem,
  findFirstSidebarItemLink,
  useDocSidebarItemsExpandedState,
  useVisibleSidebarItems,
} from '@docusaurus/plugin-content-docs/client';
import Link from '@docusaurus/Link';
import {translate} from '@docusaurus/Translate';
import useIsBrowser from '@docusaurus/useIsBrowser';
import DocSidebarItems from '@theme/DocSidebarItems';
import DocSidebarItemLink from '@theme/DocSidebarItem/Link';
import type {Props} from '@theme/DocSidebarItem/Category';
import type {
  PropSidebarItemCategory,
  PropSidebarItemLink,
} from '@docusaurus/plugin-content-docs';
import styles from './styles.module.css';
import {Folder, Vault, ChartPieSlice, ChartLineUp, Stack, type IconProps as PhosphorIconProps} from '@phosphor-icons/react';

function useAutoExpandActiveCategory({
  isActive,
  collapsed,
  updateCollapsed,
  activePath,
}: {
  isActive: boolean;
  collapsed: boolean;
  updateCollapsed: (b: boolean) => void;
  activePath: string;
}) {
  const wasActive = usePrevious(isActive);
  const previousActivePath = usePrevious(activePath);
  useEffect(() => {
    const justBecameActive = isActive && !wasActive;
    const stillActiveButPathChanged =
      isActive && wasActive && activePath !== previousActivePath;
    if ((justBecameActive || stillActiveButPathChanged) && collapsed) {
      updateCollapsed(false);
    }
  }, [
    isActive,
    wasActive,
    collapsed,
    updateCollapsed,
    activePath,
    previousActivePath,
  ]);
}

function useCategoryHrefWithSSRFallback(
  item: Props['item'],
): string | undefined {
  const isBrowser = useIsBrowser();
  return useMemo(() => {
    if (item.href && !item.linkUnlisted) {
      return item.href;
    }
    if (isBrowser || !item.collapsible) {
      return undefined;
    }
    return findFirstSidebarItemLink(item);
  }, [item, isBrowser]);
}

function CollapseButton({
  collapsed,
  categoryLabel,
  onClick,
}: {
  collapsed: boolean;
  categoryLabel: string;
  onClick: ComponentProps<'button'>['onClick'];
}) {
  return (
    <button
      aria-label={
        collapsed
          ? translate(
              {
                id: 'theme.DocSidebarItem.expandCategoryAriaLabel',
                message: "Expand sidebar category '{label}'",
                description: 'The ARIA label to expand the sidebar category',
              },
              {label: categoryLabel},
            )
          : translate(
              {
                id: 'theme.DocSidebarItem.collapseCategoryAriaLabel',
                message: "Collapse sidebar category '{label}'",
                description: 'The ARIA label to collapse the sidebar category',
              },
              {label: categoryLabel},
            )
      }
      aria-expanded={!collapsed}
      type='button'
      className='clean-btn menu__caret'
      onClick={onClick}
    />
  );
}

function CategoryLinkLabel({
  label,
  icon,
  showPlaceholder,
}: {
  label: string;
  icon: ReactNode | null;
  showPlaceholder: boolean;
}) {
  return (
    <span className={styles.categoryLinkContent}>
      {icon ? (
        <span className={styles.categoryIcon} aria-hidden='true'>
          {icon}
        </span>
      ) : showPlaceholder ? (
        <span className={styles.categoryIconPlaceholder} aria-hidden='true' />
      ) : null}
      <span title={label} className={styles.categoryLinkLabel}>
        {label}
      </span>
    </span>
  );
}

export default function DocSidebarItemCategory(props: Props): ReactNode {
  const visibleChildren = useVisibleSidebarItems(
    props.item.items,
    props.activePath,
  );
  if (visibleChildren.length === 0) {
    return <DocSidebarItemCategoryEmpty {...props} />;
  } else {
    return <DocSidebarItemCategoryCollapsible {...props} />;
  }
}

function isCategoryWithHref(
  category: Props['item'],
): category is PropSidebarItemCategory & {href: string} {
  return typeof category.href === 'string';
}

function DocSidebarItemCategoryEmpty(props: Props): ReactNode {
  const {item, onItemClick, activePath, level, index} = props;
  const {label} = item;
  if (!isCategoryWithHref(item) && item.items.length > 0) {
    return <DocSidebarItemCategoryCollapsible {...props} />;
  }
  const linkItem: PropSidebarItemLink = {
    type: 'link',
    label,
    href: item.href ?? findFirstSidebarItemLink(item) ?? '#',
  };
  return (
    <DocSidebarItemLink
      item={linkItem}
      onItemClick={onItemClick}
      activePath={activePath}
      level={level}
      index={index}
    />
  );
}

function getCategoryIcon(
  level: number,
  isActive: boolean,
  customProps?: {icon?: string},
): ReactNode | null {
  const common: PhosphorIconProps = {
    size: level === 1 ? 18 : 16,
    weight: 'regular',
    'aria-hidden': true,
  };

  // If custom Phosphor icon name is provided, use it
  if (customProps?.icon) {
    switch (customProps.icon) {
      case 'Vault':
        return <Vault {...common} />;
      case 'ChartPieSlice':
        return <ChartPieSlice {...common} />;
      case 'ChartLineUp':
        return <ChartLineUp {...common} />;
      case 'Stack':
        return <Stack {...common} />;
      default:
        break;
    }
  }

  // Default icons by level
  if (level === 1) {
    return <Folder {...common} />;
  }
  if (level === 2) {
    return null;
  }
  return null;
}

function DocSidebarItemCategoryCollapsible({
  item,
  onItemClick,
  activePath,
  level,
  index,
  ...props
}: Props): ReactNode {
  const {items, label, collapsible, className, href, customProps} = item;
  const {
    docs: {
      sidebar: {autoCollapseCategories},
    },
  } = useThemeConfig();
  const hrefWithSSRFallback = useCategoryHrefWithSSRFallback(item);

  const isActive = isActiveSidebarItem(item, activePath);
  const isCurrentPage = isSamePath(href, activePath);
  const icon = getCategoryIcon(level, isActive, customProps as {icon?: string});
  const showPlaceholder = level === 1;

  const {collapsed, setCollapsed} = useCollapsible({
    initialState: () => {
      if (!collapsible) {
        return false;
      }
      return isActive ? false : item.collapsed;
    },
  });

  const {expandedItem, setExpandedItem} = useDocSidebarItemsExpandedState();
  const updateCollapsed = (toCollapsed: boolean = !collapsed) => {
    setExpandedItem(toCollapsed ? null : index);
    setCollapsed(toCollapsed);
  };
  useAutoExpandActiveCategory({
    isActive,
    collapsed,
    updateCollapsed,
    activePath,
  });
  useEffect(() => {
    if (
      collapsible &&
      expandedItem != null &&
      expandedItem !== index &&
      autoCollapseCategories
    ) {
      setCollapsed(true);
    }
  }, [collapsible, expandedItem, index, setCollapsed, autoCollapseCategories]);

  const handleItemClick: ComponentProps<'a'>['onClick'] = (e) => {
    onItemClick?.(item);
    if (collapsible) {
      if (href) {
        if (isCurrentPage) {
          e.preventDefault();
          updateCollapsed();
        } else {
          updateCollapsed(false);
        }
      } else {
        e.preventDefault();
        updateCollapsed();
      }
    }
  };

  return (
    <li
      className={clsx(
        ThemeClassNames.docs.docSidebarItemCategory,
        ThemeClassNames.docs.docSidebarItemCategoryLevel(level),
        'menu__list-item',
        {
          'menu__list-item--collapsed': collapsed,
        },
        className,
      )}>
      <div
        className={clsx('menu__list-item-collapsible', {
          'menu__list-item-collapsible--active': isCurrentPage,
        })}>
        <Link
          className={clsx(styles.categoryLink, 'menu__link', {
            'menu__link--sublist': collapsible,
            'menu__link--sublist-caret': !href && collapsible,
            'menu__link--active': isActive,
          })}
          onClick={handleItemClick}
          aria-current={isCurrentPage ? 'page' : undefined}
          role={collapsible && !href ? 'button' : undefined}
          aria-expanded={collapsible && !href ? !collapsed : undefined}
          href={collapsible ? hrefWithSSRFallback ?? '#' : hrefWithSSRFallback}
          {...props}>
          <CategoryLinkLabel
            label={label}
            icon={icon}
            showPlaceholder={showPlaceholder}
          />
        </Link>
        {href && collapsible && (
          <CollapseButton
            collapsed={collapsed}
            categoryLabel={label}
            onClick={(e) => {
              e.preventDefault();
              updateCollapsed();
            }}
          />
        )}
      </div>

      <Collapsible lazy as='ul' className='menu__list' collapsed={collapsed}>
        <DocSidebarItems
          items={items}
          tabIndex={collapsed ? -1 : 0}
          onItemClick={onItemClick}
          activePath={activePath}
          level={level + 1}
        />
      </Collapsible>
    </li>
  );
}









