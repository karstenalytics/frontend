import React, {memo, type ReactNode} from 'react';
import {useThemeConfig} from '@docusaurus/theme-common';
import {groupBlogSidebarItemsByYear} from '@docusaurus/plugin-content-blog/client';
import Heading from '@theme/Heading';
import type {Props} from '@theme/BlogSidebar/Content';

function BlogSidebarYearGroup({
  year,
  yearGroupHeadingClassName,
  children,
}: {
  year: string;
  yearGroupHeadingClassName?: string;
  children: ReactNode;
}) {
  return (
    <div role="group">
      <Heading as="h3" className={yearGroupHeadingClassName}>
        {year}
      </Heading>
      {children}
    </div>
  );
}

function BlogSidebarContent({
  items,
  yearGroupHeadingClassName,
  ListComponent,
}: Props): ReactNode {
  // Always render without year grouping to match Analysis sidebar style
  return <ListComponent items={items} />;
}

export default memo(BlogSidebarContent);
