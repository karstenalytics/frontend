import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // Intro sidebar
  introSidebar: [
    'index',
    'intro/tech-setup',
    'intro/about',
  ],

  // Analysis sidebar
  analysisSidebar: [
    'analysis/overview',
    'analysis/methodology',
    'analysis/data-quality',
    {
      type: 'html',
      value: '<span class="sidebar-heading">DEFITUNA</span>',
    },
    'analysis/defituna/overview',
    {
      type: 'category',
      label: 'Treasury Analysis',
      customProps: {
        icon: 'Vault',
      },
      items: [
        {
          type: 'category',
          label: 'Revenue Breakdown',
          customProps: {
            icon: 'ChartPieSlice',
          },
          items: [
            'analysis/defituna/revenue-breakdown/by-token',
            'analysis/defituna/revenue-breakdown/by-type',
            'analysis/defituna/revenue-breakdown/by-pool',
            'analysis/defituna/revenue-breakdown/pools-vs-types',
            {
              type: 'doc',
              id: 'analysis/defituna/revenue-breakdown/tx-type-per-day',
              label: 'Types per Day',
            },
            'analysis/defituna/revenue-breakdown/orca-vs-fusion',
          ],
        },
        {
          type: 'category',
          label: 'Users / Wallets',
          customProps: {
            icon: 'ChartLineUp',
          },
          items: [
            'analysis/defituna/usage-statistics/usage-statistics-overview',
            'analysis/defituna/usage-statistics/usage-statistics-stakers',
          ],
        },
        {
          type: 'category',
          label: 'Staking Analysis',
          customProps: {
            icon: 'Stack',
          },
          items: [
            'analysis/defituna/staked-tuna',
            'analysis/defituna/vesting-timeline',
            'analysis/defituna/staking/wallet-timeline',
            'analysis/defituna/staker-conviction',
          ],
        },
        'analysis/defituna/staking-apr',
        'analysis/defituna/pool-ramp-up',
      ],
    },
  ],
};

export default sidebars;





