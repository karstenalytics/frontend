/**
 * Swizzled DocItem/Metadata that auto-injects enhanced Open Graph and
 * Twitter Card meta tags for analysis pages.
 *
 * For pages under /analysis/:
 *   - Adds protocol-prefixed og:title (DefiTuna / Flash.Trade / Solstice)
 *   - Sets og:image to /img/og/{slug}.png when chart_type is in frontmatter
 *   - Adds twitter:card, twitter:site, og:type, og:site_name, canonical, etc.
 *
 * Pages outside /analysis/ get the default Docusaurus behaviour unchanged.
 *
 * New pages only need frontmatter -- no manual imports or registries:
 *   ---
 *   title: Supply & Unlock
 *   description: eUSX supply with cooldown breakdown...
 *   chart_type: area
 *   ---
 */

import React, {type ReactNode} from 'react';
import Head from '@docusaurus/Head';
import {PageMetadata} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation} from '@docusaurus/router';

const PROTOCOL_MAP: Record<string, string> = {
  '/defituna/': 'DefiTuna',
  '/flash-trade/': 'Flash.Trade',
  '/solstice/': 'Solstice',
};

function deriveProtocol(pathname: string): string {
  for (const [segment, name] of Object.entries(PROTOCOL_MAP)) {
    if (pathname.includes(segment)) return name;
  }
  return '';
}

function deriveSlug(pathname: string): string {
  return pathname
    .replace(/^\/analysis\//, '')
    .replace(/\//g, '-')
    .replace(/^-|-$/g, '');
}

function AnalysisPageOG(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const location = useLocation();
  const {metadata, frontMatter} = useDoc();

  const protocol = deriveProtocol(location.pathname);
  const ogTitle = protocol
    ? `${protocol}: ${metadata.title} | ${siteConfig.title}`
    : `${metadata.title} | ${siteConfig.title}`;

  const chartType = frontMatter.chart_type as string | undefined;
  const description = chartType
    ? `${metadata.description} | Interactive ${chartType} chart`
    : metadata.description;

  const slug = deriveSlug(location.pathname);
  const ogImage = chartType
    ? `${siteConfig.url}/img/og/${slug}.png`
    : `${siteConfig.url}/img/og-preview.png`;

  const pageUrl = `${siteConfig.url}${location.pathname}`;

  return (
    <Head>
      {/* Open Graph */}
      <meta property="og:type" content="article" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={ogTitle} />
      <meta property="og:site_name" content={siteConfig.title} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@karstenalytics" />
      <meta name="twitter:creator" content="@karstenalytics" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogTitle} />

      {/* Additional SEO */}
      <meta name="author" content={siteConfig.title} />
      <link rel="canonical" href={pageUrl} />
    </Head>
  );
}

export default function DocItemMetadata(): ReactNode {
  const {metadata, frontMatter, assets} = useDoc();
  const location = useLocation();
  const isAnalysisPage = location.pathname.startsWith('/analysis/');

  return (
    <>
      <PageMetadata
        title={metadata.title}
        description={metadata.description}
        keywords={frontMatter.keywords as string[]}
        image={assets.image ?? (frontMatter.image as string)}
      />
      {isAnalysisPage && <AnalysisPageOG />}
    </>
  );
}
