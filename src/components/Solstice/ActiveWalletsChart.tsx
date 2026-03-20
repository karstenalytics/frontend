import React, { useEffect, useRef, useState } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import MetricCard from '@site/src/components/common/MetricCard';
import ChartHeader from '@site/src/components/common/ChartHeader';
import ChartToggle from '@site/src/components/common/ChartToggle';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useSolsticeData, SolsticeAdoptionDay } from '@site/src/hooks/useSolsticeData';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';

const TEAL_LIGHT = '#00A3B4';
const TEAL_DARK = '#14BCCD';
const ORANGE_QUEUED = '#F39C12';
const SLATE = '#94A3B8';

const START_DATE = '2025-08-15';

const TIME_OPTIONS = [
  { value: 'daily' as const, label: 'Daily' },
  { value: 'weekly' as const, label: 'Weekly' },
];
const SCOPE_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'new' as const, label: 'New' },
];
type TimeMode = typeof TIME_OPTIONS[number]['value'];
type ScopeMode = typeof SCOPE_OPTIONS[number]['value'];

function sum7d(data: SolsticeAdoptionDay[], endIdx: number): number {
  let total = 0;
  for (let i = Math.max(0, endIdx - 6); i <= endIdx; i++) {
    total += data[i].unique_active_wallets;
  }
  return total;
}

function sumNew7d(data: SolsticeAdoptionDay[], endIdx: number): number {
  let total = 0;
  for (let i = Math.max(0, endIdx - 6); i <= endIdx; i++) {
    total += data[i].new_depositors + data[i].new_unlockers + data[i].new_withdrawers;
  }
  return total;
}

/** Key metric cards. */
export function ActiveWalletsMetrics(): JSX.Element {
  const { adoption, loading, error } = useSolsticeData();

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'var(--ifm-color-danger)' }}>Error loading data: {error}</div>;
  if (adoption.length < 7) return <LoadingSpinner />;

  const n = adoption.length;
  const active7d = sum7d(adoption, n - 1);
  const activePrev7d = n >= 14 ? sum7d(adoption, n - 8) : null;
  const activeChange = activePrev7d != null && activePrev7d > 0
    ? ((active7d - activePrev7d) / activePrev7d) * 100
    : null;

  const new7d = sumNew7d(adoption, n - 1);
  const newPrev7d = n >= 14 ? sumNew7d(adoption, n - 8) : null;
  const newChange = newPrev7d != null && newPrev7d > 0
    ? ((new7d - newPrev7d) / newPrev7d) * 100
    : null;

  return (
    <div className="usage-summary-grid">
      <MetricCard
        title="7d Active Wallets"
        value={active7d}
        format="number"
        decimals={0}
        change={activeChange}
        tooltip={"Sum of daily unique eUSX vault wallets over the last 7 days.\nChange compares to the prior 7-day period."}
      />
      <MetricCard
        title="7d New Wallets"
        value={new7d}
        format="number"
        decimals={0}
        change={newChange}
        tooltip={"Total first-time depositors, unlockers, and withdrawers over the last 7 days.\nChange compares to the prior 7-day period."}
      />
    </div>
  );
}

/** Stacked bar chart with Daily/Weekly + All/New dual toggles. */
export function ActiveWalletsChartView(): JSX.Element {
  const { adoption, weeklyAdoption, loading, error } = useSolsticeData();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 996 : false
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 996);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const [timeView, setTimeView] = useState<TimeMode>('daily');
  const [scopeView, setScopeView] = useState<ScopeMode>('all');
  const plotRef = useRef<HTMLDivElement>(null);

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'var(--ifm-color-danger)' }}>Error loading data: {error}</div>;

  const Plot = require('react-plotly.js').default;
  const template = getPlotlyTemplate(isDark);
  const config = getResponsivePlotlyConfig();
  const accentColor = isDark ? TEAL_DARK : TEAL_LIGHT;

  const isDaily = timeView === 'daily';
  const isNew = scopeView === 'new';

  // Filter from START_DATE
  let dates: string[];
  let depositors: number[];
  let unlockers: number[];
  let withdrawers: number[];

  if (isDaily) {
    const startIdx = adoption.findIndex(d => d.date >= START_DATE);
    const sliced = startIdx >= 0 ? adoption.slice(startIdx) : adoption;
    dates = sliced.map(d => d.date);
    depositors = sliced.map(d => isNew ? d.new_depositors : d.unique_depositors);
    unlockers = sliced.map(d => isNew ? d.new_unlockers : d.unique_unlockers);
    withdrawers = sliced.map(d => isNew ? d.new_withdrawers : d.unique_withdrawers);
  } else {
    const startIdx = weeklyAdoption.findIndex(d => d.date >= START_DATE);
    const sliced = startIdx >= 0 ? weeklyAdoption.slice(startIdx) : weeklyAdoption;
    dates = sliced.map(d => d.date);
    depositors = sliced.map(d => isNew ? d.new_depositors : d.depositors);
    unlockers = sliced.map(d => isNew ? d.new_unlockers : d.unlockers);
    withdrawers = sliced.map(d => isNew ? d.new_withdrawers : d.withdrawers);
  }

  const numLegendItems = 3;
  const legendY = isMobile ? -0.1 : -0.15;
  const bottomMargin = isMobile ? numLegendItems * 25 + 10 : 60;
  const plotAreaBase = isMobile ? 350 : 370;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 450;

  const traces = [
    {
      x: dates,
      y: depositors,
      type: 'bar' as const,
      name: 'Depositors (lock)',
      marker: { color: accentColor },
      hovertemplate: '<b>%{y}</b> depositors<extra></extra>',
    },
    {
      x: dates,
      y: unlockers,
      type: 'bar' as const,
      name: 'Unlockers (cooldown)',
      marker: { color: ORANGE_QUEUED },
      hovertemplate: '<b>%{y}</b> unlockers<extra></extra>',
    },
    {
      x: dates,
      y: withdrawers,
      type: 'bar' as const,
      name: 'Withdrawers',
      marker: { color: SLATE },
      hovertemplate: '<b>%{y}</b> withdrawers<extra></extra>',
    },
  ];

  const timeLabel = isDaily ? 'Daily' : 'Weekly';
  const scopeLabel = isNew ? 'New' : 'Active';
  const chartTitle = `${timeLabel} ${scopeLabel} eUSX Vault Wallets`;
  const yLabel = isNew ? 'New Wallets' : (isDaily ? 'Wallets' : 'Wallets (7-day)');

  return (
    <div
      ref={plotRef}
      style={{
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-toc-border-color)',
        borderRadius: 'var(--ifm-global-radius)',
        padding: isMobile ? '16px 0px 16px 0px' : '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      <ChartHeader
        title={chartTitle}
        plotRef={plotRef}
        isMobile={isMobile}
        toggle={
          <div style={{ display: 'flex', gap: '8px' }}>
            <ChartToggle value={timeView} onChange={setTimeView} options={TIME_OPTIONS} variant="primary" />
            <ChartToggle value={scopeView} onChange={setScopeView} options={SCOPE_OPTIONS} variant="secondary" />
          </div>
        }
      />
      <Plot
        data={traces}
        layout={{
          ...template.layout,
          autosize: true,
          height: chartHeight,
          hovermode: 'x unified',
          uirevision: 'stable',
          barmode: 'stack',
          xaxis: {
            ...template.layout?.xaxis,
            title: isMobile ? '' : { text: 'Date (UTC)', font: { size: 14 } },
            type: 'date',
            tickfont: { size: isMobile ? 9 : 12 },
          },
          yaxis: {
            ...template.layout?.yaxis,
            title: isMobile ? '' : {
              text: yLabel,
              font: { size: 14 },
            },
            tickfont: { size: isMobile ? 8 : 12 },
            rangemode: 'tozero',
          },
          legend: {
            orientation: 'h' as const,
            yanchor: 'top' as const,
            y: legendY,
            xanchor: 'center' as const,
            x: 0.5,
            font: { size: isMobile ? 10 : 12 },
          },
          dragmode: isMobile ? false : 'zoom',
          margin: isMobile
            ? { l: 25, r: 5, t: 16, b: bottomMargin }
            : { l: 70, r: 24, t: 16, b: bottomMargin },
        }}
        config={{
          ...config,
          staticPlot: false,
          scrollZoom: !isMobile,
          doubleClick: 'reset',
        }}
        style={{ width: '100%', height: `${chartHeight}px` }}
      />
      {isMobile && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: '0px',
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>{'\u2191'} {yLabel}</div>
          <div>{'\u2192'} Date (UTC)</div>
        </div>
      )}
    </div>
  );
}

export default function ActiveWalletsChart(): JSX.Element {
  return (
    <>
      <ActiveWalletsMetrics />
      <ActiveWalletsChartView />
    </>
  );
}
