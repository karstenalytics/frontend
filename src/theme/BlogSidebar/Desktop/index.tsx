import React, {memo} from 'react';
import {translate} from '@docusaurus/Translate';
import {useLocation} from '@docusaurus/router';
import {
  useVisibleBlogSidebarItems,
} from '@docusaurus/plugin-content-blog/client';
import type {Props} from '@theme/BlogSidebar/Desktop';

function BlogSidebarDesktop({sidebar}: Props): React.JSX.Element {
  const items = useVisibleBlogSidebarItems(sidebar.items);
  const {pathname} = useLocation();

  return (
    <div className="theme-doc-sidebar-container">
      <nav
        className="menu thin-scrollbar theme-doc-sidebar-menu"
        aria-label={translate({
          id: 'theme.blog.sidebar.navAriaLabel',
          message: 'Blog recent posts navigation',
          description: 'The ARIA label for recent posts in the blog sidebar',
        })}>
        <div className="sidebar-heading">
          {sidebar.title}
        </div>
        <ul className="menu__list">
          {items.map((item) => {
            const isActive = pathname === item.permalink;
            return (
              <li key={item.permalink} className="menu__list-item">
                <a
                  className={`menu__link${isActive ? ' menu__link--active' : ''}`}
                  href={item.permalink}>
                  {item.title}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export default memo(BlogSidebarDesktop);
