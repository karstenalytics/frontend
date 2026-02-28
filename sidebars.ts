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
    'analysis/data-pipeline',
    'analysis/data-quality',
    {
      type: 'html',
      value: '<span class="sidebar-heading">DEFITUNA</span>',
    },
    'analysis/defituna/overview',
    {
      type: 'category',
      label: 'Fees & Revenue',
      customProps: {
        icon: 'ChartPieSlice',
      },
      items: [
        'analysis/defituna/fees-revenue/by-pool',
        'analysis/defituna/fees-revenue/tx-type-per-day',
        'analysis/defituna/fees-revenue/pools-vs-types',
        'analysis/defituna/fees-revenue/orca-vs-fusion',
        'analysis/defituna/fees-revenue/pool-ramp-up',
      ],
    },
    {
      type: 'category',
      label: 'Adoption',
      customProps: {
        icon: 'ChartLineUp',
      },
      items: [
        'analysis/defituna/adoption/wallet-usage',
        'analysis/defituna/adoption/active-stakers',
      ],
    },
    {
      type: 'category',
      label: 'Staking',
      customProps: {
        icon: 'Stack',
      },
      items: [
        'analysis/defituna/staking/staked-tuna',
        'analysis/defituna/staking/staking-apr',
        'analysis/defituna/staking/wallet-timeline',
        'analysis/defituna/staking/vesting-timeline',
        'analysis/defituna/staking/staker-conviction',
      ],
    },
    {
      type: 'html',
      value: '<span class="sidebar-heading">FLASH.TRADE</span>',
    },
    'analysis/flash-trade/overview',
    {
      type: 'category',
      label: 'Fees & Revenue',
      customProps: {
        icon: 'ChartPieSlice',
      },
      items: [
        'analysis/flash-trade/fees-revenue/by-pool',
        'analysis/flash-trade/fees-revenue/by-type',
        'analysis/flash-trade/fees-revenue/pools-vs-types',
        'analysis/flash-trade/fees-revenue/effective-take-rate',
      ],
    },
    {
      type: 'category',
      label: 'Adoption',
      customProps: {
        icon: 'ChartLineUp',
      },
      items: [
        'analysis/flash-trade/adoption/wallet-usage',
        'analysis/flash-trade/adoption/active-stakers',
      ],
    },
    {
      type: 'category',
      label: 'Staking',
      customProps: {
        icon: 'Stack',
      },
      items: [
        'analysis/flash-trade/staking/stake-pool-overview',
        'analysis/flash-trade/staking/faf-staking-apr',
        'analysis/flash-trade/staking/wallet-timeline',
        'analysis/flash-trade/staking/vesting-timeline',
        'analysis/flash-trade/staking/staker-conviction',
      ],
    },
  ],
};

export default sidebars;





