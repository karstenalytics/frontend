import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'karstenalytics',
  tagline: 'Tailored On-Chain Analytics for Solana DeFi',
  favicon: 'img/logo.png',

  // Set the production url of your site here
  url: 'https://karstenalytics.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'karstenalytics',
  projectName: 'frontend',
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',

  markdown: {
    format: 'mdx',
    mermaid: true,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // GoatCounter analytics - privacy-friendly, GDPR-compliant
  // Only loads in production to avoid CORS/404 errors in development
  scripts: process.env.NODE_ENV === 'production' ? [
    {
      src: 'https://gc.zgo.at/count.js',
      async: true,
      'data-goatcounter': 'https://karstenalytics.goatcounter.com/count',
    },
  ] : [],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            from: '/analysis/staking/wallet-timeline',
            to: '/analysis/defituna/staking/wallet-timeline',
          },
          {
            from: '/analysis/usage-statistics/usage-statistics-overview',
            to: '/analysis/defituna/usage-statistics/wallet-usage',
          },
          {
            from: '/analysis/usage-statistics/usage-statistics-stakers',
            to: '/analysis/defituna/usage-statistics/active-stakers',
          },
          {
            from: '/analysis/defituna/orca-vs-fusion',
            to: '/analysis/defituna/revenue-breakdown/orca-vs-fusion',
          },
          {
            from: '/analysis/defituna/tx-type-per-day',
            to: '/analysis/defituna/revenue-breakdown/tx-type-per-day',
          },
          {
            from: '/analysis/defituna/staking-apy',
            to: '/analysis/defituna/staking-apr',
          },
        ],
      },
    ],
    function webpackPolyfillPlugin() {
      return {
        name: 'webpack-polyfill-plugin',
        configureWebpack() {
          return {
            resolve: {
              fallback: {
                buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify'),
                assert: require.resolve('assert/'),
              },
            },
          };
        },
      };
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          // Remove this to remove the "edit this page" links.
          editUrl: undefined,
        },
        blog: false,  // Disabled - reserved for future articles
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: true,
        docsRouteBasePath: '/',
        ignoreFiles: [],
      },
    ],
  ],

  themeConfig: {
    // Social media preview image (1200x675px for Twitter/X optimization)
    image: 'img/og-preview.png',
    navbar: {
      title: '',
      logo: {
        alt: 'karstenalytics Logo',
        src: 'img/logo.png',
        srcDark: 'img/logo_dark.png',
      },
      hideOnScroll: false,
      items: [
        // Tabs (Intro, Blog, Analysis) moved to separate NavbarTabs component
        // Search bar is added automatically by @easyops-cn/docusaurus-search-local
      ],
    },
    footer: undefined, // Footer removed - GitHub link moved to navbar
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
