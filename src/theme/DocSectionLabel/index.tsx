import React from 'react';
import clsx from 'clsx';
import {useDoc, useDocsSidebar, useSidebarBreadcrumbs} from '@docusaurus/plugin-content-docs/client';
import {ThemeClassNames} from '@docusaurus/theme-common';
import styles from './styles.module.css';

type BreadcrumbItem = {
  label: string;
  type: string;
};

function extractTextFromHtml(value: string): string | null {
  const match = value.match(/>([^<>]+)</);
  if (match) {
    return match[1].trim();
  }
  const stripped = value.replace(/<[^>]+>/g, '').trim();
  return stripped || null;
}

function normalizePermalink(permalink: string | undefined): string | null {
  if (!permalink) {
    return null;
  }
  return permalink.endsWith('/') ? permalink : `${permalink}/`;
}

function findHeadingLabel(
  items: ReturnType<typeof useDocsSidebar>['items'],
  activePermalink: string,
  currentHeading: string | null = null,
): string | null {
  const normalizedActive = normalizePermalink(activePermalink);
  for (const item of items) {
    if (item.type === 'html') {
      const text = extractTextFromHtml(item.value);
      currentHeading = text ?? currentHeading;
      continue;
    }
    if (item.type === 'link') {
      const linkPermalink =
        'href' in item ? normalizePermalink(item.href) : undefined;
      if (linkPermalink && linkPermalink === normalizedActive) {
        return currentHeading;
      }
    }
    if (item.type === 'category') {
      const result = findHeadingLabel(item.items, activePermalink, currentHeading);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

function getSectionLabel(
  breadcrumbs: BreadcrumbItem[] | undefined,
  sidebarItems: ReturnType<typeof useDocsSidebar>['items'],
  activePermalink: string,
): string | null {
  const headingFromSidebar = findHeadingLabel(sidebarItems ?? [], activePermalink);
  if (headingFromSidebar) {
    return headingFromSidebar;
  }
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }
  const category = [...breadcrumbs]
    .reverse()
    .find((item) => item.type === 'category');
  if (category?.label) {
    return category.label;
  }
  return breadcrumbs[0]?.label ?? null;
}

export default function DocSectionLabel(): JSX.Element | null {
  const breadcrumbs = useSidebarBreadcrumbs();
  const sidebar = useDocsSidebar();
  const {metadata} = useDoc();
  const label = getSectionLabel(
    breadcrumbs as BreadcrumbItem[] | undefined,
    sidebar?.items ?? [],
    metadata.permalink,
  );
  if (!label) {
    return null;
  }
  return (
    <div className={clsx(ThemeClassNames.docs.docBreadcrumbs, styles.sectionLabel)}>
      <span>{label}</span>
    </div>
  );
}
