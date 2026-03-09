/**
 * Chart Page SEO Component
 *
 * Adds Open Graph and Twitter meta tags for rich social media previews
 * when sharing chart pages.
 *
 * Usage in MDX pages:
 * ```mdx
 * import ChartPageSEO from '@site/src/components/SEO/ChartPageSEO';
 *
 * <ChartPageSEO
 *   title="TUNA Staking APR"
 *   description="Historical development of TUNA staking APR based on treasury revenue"
 *   chartType="line"
 * />
 * ```
 */

import React from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation } from '@docusaurus/router';

interface ChartPageSEOProps {
  /** Page title (appears in social media preview) */
  title: string;
  /** Page description (appears in social media preview) */
  description: string;
  /** Type of chart for better context */
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'heatmap';
  /** Optional custom image URL (defaults to site logo) */
  imageUrl?: string;
  /** Optional keywords for SEO */
  keywords?: string[];
}

export const ChartPageSEO: React.FC<ChartPageSEOProps> = ({
  title,
  description,
  chartType,
  imageUrl,
  keywords = [],
}) => {
  const { siteConfig } = useDocusaurusContext();
  const location = useLocation();

  // Build full URL for current page
  const pageUrl = `${siteConfig.url}${location.pathname}`;

  // Derive OG image from URL path: /analysis/defituna/staking/staked-tuna -> defituna-staking-staked-tuna.png
  const slug = location.pathname
    .replace(/^\/analysis\//, '')
    .replace(/\//g, '-')
    .replace(/^-|-$/g, '');
  const ogImage = imageUrl || `${siteConfig.url}/img/og/${slug}.png`;

  // Derive protocol prefix from URL path
  const protocol = location.pathname.includes('/flash-trade/') ? 'Flash.Trade'
    : location.pathname.includes('/defituna/') ? 'DefiTuna'
    : '';
  const ogTitle = protocol ? `${protocol}: ${title}` : title;

  // Add chart type to description if provided
  const fullDescription = chartType
    ? `${description} | Interactive ${chartType} chart`
    : description;

  // Combine site tagline with custom keywords
  const allKeywords = [
    'karstenalytics',
    'Solana analytics',
    'DeFi',
    'treasury analytics',
    chartType ? `${chartType} chart` : null,
    ...keywords,
  ].filter(Boolean);

  return (
    <Head>
      {/* Standard meta tags */}
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={allKeywords.join(', ')} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="article" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={`${ogTitle} | karstenalytics`} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={ogTitle} />
      <meta property="og:site_name" content="karstenalytics" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@karstenalytics" />
      <meta name="twitter:creator" content="@karstenalytics" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={`${ogTitle} | karstenalytics`} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogTitle} />

      {/* Additional SEO */}
      <meta name="author" content="karstenalytics" />
      <link rel="canonical" href={pageUrl} />
    </Head>
  );
};

export default ChartPageSEO;
