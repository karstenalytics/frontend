import React from 'react';
import clsx from 'clsx';
import {useSidebarBreadcrumbs} from '@docusaurus/plugin-content-docs/client';
import {ThemeClassNames} from '@docusaurus/theme-common';
import styles from './styles.module.css';

type BreadcrumbItem = {
  label: string;
  type: string;
};

function getSectionLabel(items: BreadcrumbItem[] | undefined): string | null {
  if (!items || items.length === 0) {
    return null;
  }
  const category = [...items].reverse().find((item) => item.type === 'category');
  if (category) {
    return category.label;
  }
  return items[0]?.label ?? null;
}

export default function DocBreadcrumbs(): JSX.Element | null {
  const breadcrumbs = useSidebarBreadcrumbs();
  const label = getSectionLabel(breadcrumbs as BreadcrumbItem[] | undefined);
  if (!label) {
    return null;
  }
  return (
    <div
      className={clsx(
        ThemeClassNames.docs.docBreadcrumbs,
        styles.sectionLabel,
      )}>
      <span>{label}</span>
    </div>
  );
}
