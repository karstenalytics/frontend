import React, { useEffect, useMemo, useState } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import MetricCard from '@site/src/components/common/MetricCard';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useSolsticeData } from '@site/src/hooks/useSolsticeData';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';
import ChartToggle from '@site/src/components/common/ChartToggle';
import { tableStyles, tableRowHoverHandlers } from '@site/src/styles/tableStyles';

const ACCENT = '#00A3B4';
const ACCENT_DARK = '#007A87';

/**
 * Compute rolling APY from yield pipeline and TVL arrays.
 * Returns { current, previous } for the change badge.
 */
function computeRollingApy(
  yieldData: { harvs_distribute_yield_usx: number }[],
  tvlData: { vault_usx_balance: number }[],
  windowDays: number,
): { current: number | null; previous: number | null } {
  if (yieldData.length < windowDays + 1 || tvlData.length < windowDays + 1) {
    return { current: null, previous: null };
  }

  const n = yieldData.length;

  function apyAtIndex(endIdx: number): number | null {
    let sumRate = 0;
    let validDays = 0;
    for (let i = endIdx - windowDays + 1; i <= endIdx; i++) {
      if (i < 1) continue;
      const vaultBalance = tvlData[i - 1]?.vault_usx_balance ?? 0;
      if (vaultBalance <= 0) continue;
      const dailyYield = yieldData[i]?.harvs_distribute_yield_usx ?? 0;
      sumRate += dailyYield / vaultBalance;
      validDays++;
    }
    if (validDays === 0) return null;
    return (sumRate / validDays) * 365 * 100;
  }

  return {
    current: apyAtIndex(n - 1),
    previous: apyAtIndex(n - 1 - windowDays),
  };
}

/** Shared hook for derived yield metrics (used by both YieldMetrics and YieldChart). */
function useYieldDerived() {
  const data = useSolsticeData();
  const { yieldPipeline, tvl } = data;

  const apy = useMemo(
    () => computeRollingApy(yieldPipeline, tvl, 7),
    [yieldPipeline, tvl],
  );

  const apyChange = useMemo(() => {
    if (apy.current == null || apy.previous == null) return null;
    return apy.current - apy.previous;
  }, [apy]);

  const eusxPriceChange = useMemo(() => {
    if (tvl.length < 31) return null;
    const current = tvl[tvl.length - 1]?.usx_per_eusx ?? 0;
    const prev = tvl[tvl.length - 31]?.usx_per_eusx ?? 0;
    if (prev === 0) return null;
    return ((current - prev) / prev) * 100;
  }, [tvl]);

  return { ...data, apy, apyChange, eusxPriceChange };
}

/** Key metric cards for the yield pipeline page. */
export function YieldMetrics(): JSX.Element {
  const { keyMetrics, summary, loading, error, apy, apyChange, eusxPriceChange } = useYieldDerived();

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'var(--ifm-color-danger)' }}>Error loading data: {error}</div>;

  return (
    <div className="usage-summary-grid">
      <MetricCard
        title="Current APY (7d)"
        value={apy.current}
        format="percent"
        decimals={2}
        change={apyChange}
        changeUnit="pp"
        tooltip={"Annualized yield rate based on 7-day average daily HARVS distributions into the YieldVault.\nChange compares the current 7-day APY to the value 7 days ago."}
      />
      <MetricCard
        title="Cumulative Yield Distributed"
        value={summary?.cumulative_yield_distributed_usx ?? null}
        format="number"
        decimals={0}
        suffix=" USX"
        tooltip={"Total USX distributed by HARVS into the YieldVault since protocol inception. This value only increases over time and reflects the compounding power of the HARVS distribution mechanism."}
      />
      <MetricCard
        title="eUSX Price"
        value={keyMetrics?.usx_per_eusx ?? null}
        format="number"
        decimals={6}
        suffix=" USX"
        change={eusxPriceChange}
        tooltip={"USX backing per eUSX share. Grows as yield compounds into the vault, increasing the value of each eUSX.\nChange shows the increase in backing ratio over the last 30 days."}
      />
    </div>
  );
}

/** HARVS yield pipeline inventory chart + events table.
 *
 *  Chart: staircase area showing the HARVS staging buffer balance (fills on
 *  add_yield, drains on distribute_yield).  Secondary axis shows cumulative
 *  distributed.  No markers -- events are listed in the table below.
 *
 *  Table: Recent add_yield and distribute_yield events with dates and amounts.
 */
const VIEW_OPTIONS = [
  { value: 'buffer' as const, label: 'Harvester Balance' },
  { value: 'distribution' as const, label: 'Distribution' },
];
type ViewMode = typeof VIEW_OPTIONS[number]['value'];

export function YieldChart(): JSX.Element {
  const { yieldPipeline, tvl, loading, error } = useSolsticeData();
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
  const [view, setView] = useState<ViewMode>('buffer');

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'var(--ifm-color-danger)' }}>Error loading data: {error}</div>;

  const Plot = require('react-plotly.js').default;

  // Start 3 days before first meaningful HARVS activity to show the ramp-up from ~0
  let firstEventIdx = 0;
  for (let i = 0; i < yieldPipeline.length; i++) {
    if (yieldPipeline[i].harvs_add_yield_usx > 1 || yieldPipeline[i].harvs_distribute_yield_usx > 1) {
      firstEventIdx = Math.max(0, i - 3);
      break;
    }
  }

  // Compute series from first event onwards
  const dates: string[] = [];
  const buffer: number[] = [];
  const distributeYield: number[] = [];
  const yieldPerEusx: number[] = [];
  const vaultNetFlow: number[] = [];
  const eusxPriceChange: number[] = [];

  let runningBuffer = 0;
  for (let i = 0; i < yieldPipeline.length; i++) {
    const d = yieldPipeline[i];
    runningBuffer += d.harvs_add_yield_usx;
    runningBuffer -= d.harvs_distribute_yield_usx;
    if (runningBuffer < 0) runningBuffer = 0;

    if (i >= firstEventIdx) {
      dates.push(d.date);
      buffer.push(runningBuffer);
      distributeYield.push(d.harvs_distribute_yield_usx);
      const prevSupply = i > 0 ? (tvl[i - 1]?.eusx_supply ?? 0) : 0;
      yieldPerEusx.push(prevSupply > 0 ? (d.harvs_distribute_yield_usx / prevSupply) * 1_000_000 : 0);
      vaultNetFlow.push(tvl[i]?.vault_usx_net_flow ?? 0);
      const prevPrice = i > 0 ? (tvl[i - 1]?.usx_per_eusx ?? 0) : 0;
      const currPrice = tvl[i]?.usx_per_eusx ?? 0;
      eusxPriceChange.push(prevPrice > 0 ? (currPrice - prevPrice) * 1_000_000 : 0);
    }
  }

  const template = getPlotlyTemplate(isDark);
  const config = getResponsivePlotlyConfig();

  // Primary trace depends on view mode
  const primaryTrace = view === 'buffer'
    ? {
        x: dates,
        y: buffer,
        type: 'scatter' as const,
        mode: 'lines' as const,
        fill: 'tozeroy' as const,
        line: { shape: 'hv' as const, color: 'rgba(0, 163, 180, 0.7)', width: 1.5 },
        fillcolor: isDark ? 'rgba(0, 163, 180, 0.15)' : 'rgba(0, 163, 180, 0.12)',
        name: 'Harvester Balance',
        yaxis: 'y',
        hovertemplate: '%{x}<br>Harvester Balance: %{y:,.0f} USX<extra></extra>',
      }
    : {
        x: dates,
        y: distributeYield,
        type: 'scatter' as const,
        mode: 'lines' as const,
        fill: 'tozeroy' as const,
        line: { shape: 'hv' as const, color: 'rgba(0, 163, 180, 0.7)', width: 1.5 },
        fillcolor: isDark ? 'rgba(0, 163, 180, 0.15)' : 'rgba(0, 163, 180, 0.12)',
        name: 'Daily Distribution',
        yaxis: 'y',
        hovertemplate: '%{x}<br>Distributed: %{y:,.0f} USX<extra></extra>',
      };

  // Build eUSX price series for the buffer view
  const eusxPrice = dates.map((_, idx) => tvl[idx + firstEventIdx]?.usx_per_eusx ?? 0);

  // Secondary trace differs per view:
  // - Buffer: eUSX price (cumulative) -- staging cycle feeds steady price growth
  // - Distribution: yield per eUSX -- shows dilution when supply grows faster than yield
  const secondaryTrace = view === 'buffer'
    ? {
        x: dates,
        y: eusxPrice,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'eUSX Price',
        line: { shape: 'hv' as const, color: '#E6B422', width: 2 },
        yaxis: 'y2',
        hovertemplate: '%{x}<br>eUSX Price: %{y:.6f} USX<extra></extra>',
      }
    : {
        x: dates,
        y: yieldPerEusx,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: 'Yield per eUSX',
        line: { shape: 'hv' as const, color: '#E6B422', width: 1.5 },
        yaxis: 'y2',
        hovertemplate: '%{x}<br>Yield per eUSX: %{y:.1f} micro-USX<extra></extra>',
      };

  const primaryLabel = view === 'buffer' ? 'Harvester Balance (USX)' : 'Daily Distribution (USX)';
  const secondaryLabel = view === 'buffer' ? 'eUSX Price (USX)' : 'Yield per eUSX (micro-USX)';

  return (
    <>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        padding: isMobile ? '0 16px 8px' : '0 0 8px',
      }}>
        <h3 style={{ margin: 0, fontSize: isMobile ? 15 : 18, fontWeight: 600 }}>
          Yield Pipeline
        </h3>
        <div style={{ flexShrink: 0 }}>
          <ChartToggle value={view} onChange={setView} options={VIEW_OPTIONS} variant="primary" />
        </div>
      </div>
      <Plot
        data={[
          primaryTrace,
          secondaryTrace,
        ]}
        layout={{
          ...template.layout,
          autosize: true,
          height: isMobile ? 350 : 500,
          margin: {
            l: isMobile ? 45 : 70,
            r: isMobile ? 45 : 70,
            t: 8,
            b: isMobile ? 60 : 50,
          },
          xaxis: {
            ...template.layout?.xaxis,
            title: undefined,
          },
          yaxis: {
            ...template.layout?.yaxis,
            title: {
              text: isMobile ? undefined : primaryLabel,
              standoff: 20,
            },
            side: 'left',
            rangemode: 'tozero',
          },
          yaxis2: {
            ...template.layout?.yaxis,
            title: {
              text: isMobile ? undefined : secondaryLabel,
              standoff: 20,
            },
            side: 'right',
            overlaying: 'y',
            showgrid: false,
          },
          legend: {
            x: 0,
            y: 1.12,
            orientation: 'h',
            font: { size: 12 },
          },
          hovermode: 'x unified',
          dragmode: isMobile ? false : 'zoom',
        }}
        config={config}
        useResizeHandler
        style={{ width: '100%' }}
      />
      {isMobile && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--ifm-color-emphasis-600)',
          padding: '0 4px',
          marginTop: 4,
        }}>
          <span>{primaryLabel}</span>
          <span>{secondaryLabel}</span>
        </div>
      )}
    </>
  );
}

const ITEMS_PER_PAGE = 10;

/** Events table showing add_yield and distribute_yield transactions with pagination. */
export function YieldEventsTable(): JSX.Element {
  const { yieldPipeline, tvl, loading, error } = useSolsticeData();
  const [page, setPage] = useState(0);

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'var(--ifm-color-danger)' }}>Error: {error}</div>;

  // Build date lookups from TVL data
  const vaultNetFlowByDate: Record<string, number> = {};
  const eusxSupplyByDate: Record<string, number> = {};
  for (const d of tvl) {
    vaultNetFlowByDate[d.date] = d.vault_usx_net_flow;
    eusxSupplyByDate[d.date] = d.eusx_supply;
  }

  // Collect all events
  const events: { date: string; type: string; amount: number; balance: number; cumulative: number; vaultChange: number; eusxSupply: number }[] = [];
  let runningBuffer = 0;
  let runningCumulative = 0;
  for (const d of yieldPipeline) {
    if (d.harvs_add_yield_usx > 0) {
      runningBuffer += d.harvs_add_yield_usx;
      events.push({
        date: d.date,
        type: 'add_yield',
        amount: d.harvs_add_yield_usx,
        balance: runningBuffer,
        cumulative: runningCumulative,
        vaultChange: vaultNetFlowByDate[d.date] ?? 0,
        eusxSupply: eusxSupplyByDate[d.date] ?? 0,
      });
    }
    if (d.harvs_distribute_yield_usx > 0) {
      runningBuffer -= d.harvs_distribute_yield_usx;
      if (runningBuffer < 0) runningBuffer = 0;
      runningCumulative += d.harvs_distribute_yield_usx;
      events.push({
        date: d.date,
        type: 'distribute_yield',
        amount: d.harvs_distribute_yield_usx,
        balance: runningBuffer,
        cumulative: runningCumulative,
        vaultChange: vaultNetFlowByDate[d.date] ?? 0,
        eusxSupply: eusxSupplyByDate[d.date] ?? 0,
      });
    }
  }

  // Most recent first
  const allEvents = events.reverse();
  const totalPages = Math.ceil(allEvents.length / ITEMS_PER_PAGE);
  const pageEvents = allEvents.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <div style={tableStyles.container}>
      <table style={tableStyles.table}>
        <thead>
          <tr style={tableStyles.headerRow}>
            <th style={tableStyles.headerCell}>Date</th>
            <th style={tableStyles.headerCell}>Event</th>
            <th style={{ ...tableStyles.headerCell, textAlign: 'right' }}>Amount (USX)</th>
            <th style={{ ...tableStyles.headerCell, textAlign: 'right' }}>USX Balance After</th>
            <th style={{ ...tableStyles.headerCell, textAlign: 'right' }}>eUSX Supply</th>
            <th style={{ ...tableStyles.headerCell, textAlign: 'right' }}>YieldVault Balance Change</th>
            <th style={{ ...tableStyles.headerCell, textAlign: 'right' }}>Cumulative Distributed</th>
          </tr>
        </thead>
        <tbody>
          {pageEvents.map((e, i) => (
            <tr key={`${page}-${i}`} style={tableStyles.bodyRow} {...tableRowHoverHandlers}>
              <td style={tableStyles.dateCell}>
                {new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </td>
              <td style={tableStyles.cell}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: e.type === 'add_yield'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(0, 163, 180, 0.15)',
                  color: e.type === 'add_yield' ? '#10B981' : '#00A3B4',
                }}>
                  {e.type === 'add_yield' ? 'Staged' : 'Distributed'}
                </span>
              </td>
              <td style={{
                ...tableStyles.amountCell,
                textAlign: 'right',
                color: e.type === 'add_yield' ? '#10B981' : 'var(--accent)',
              }}>
                {e.type === 'add_yield' ? '+' : '-'}{e.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </td>
              <td style={{ ...tableStyles.cell, textAlign: 'right', color: 'var(--ifm-color-emphasis-600)' }}>
                {e.balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </td>
              <td style={{ ...tableStyles.cell, textAlign: 'right', color: 'var(--ifm-color-emphasis-600)' }}>
                {e.eusxSupply.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </td>
              <td style={{
                ...tableStyles.cell,
                textAlign: 'right',
                fontWeight: 600,
                color: e.vaultChange >= 0 ? '#10B981' : '#EF4444',
              }}>
                {e.vaultChange >= 0 ? '+' : ''}{e.vaultChange.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </td>
              <td style={{ ...tableStyles.cell, textAlign: 'right', color: 'var(--ifm-color-emphasis-600)' }}>
                {e.cumulative.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 4px 0',
          fontSize: '13px',
          color: 'var(--ifm-color-emphasis-600)',
        }}>
          <span>
            Showing {page * ITEMS_PER_PAGE + 1}-{Math.min((page + 1) * ITEMS_PER_PAGE, allEvents.length)} of {allEvents.length} events
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '4px 12px',
                border: '1px solid var(--ifm-toc-border-color)',
                borderRadius: '4px',
                background: 'var(--ifm-background-surface-color)',
                color: page === 0 ? 'var(--ifm-color-emphasis-400)' : 'var(--ifm-color-emphasis-700)',
                cursor: page === 0 ? 'default' : 'pointer',
                fontSize: '13px',
              }}
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                padding: '4px 12px',
                border: '1px solid var(--ifm-toc-border-color)',
                borderRadius: '4px',
                background: 'var(--ifm-background-surface-color)',
                color: page >= totalPages - 1 ? 'var(--ifm-color-emphasis-400)' : 'var(--ifm-color-emphasis-700)',
                cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                fontSize: '13px',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Combined component (default export for backward compat). */
export default function YieldDistributionChart(): JSX.Element {
  return (
    <>
      <YieldMetrics />
      <YieldChart />
    </>
  );
}
