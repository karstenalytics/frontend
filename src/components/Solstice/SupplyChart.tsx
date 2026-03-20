import React, { useEffect, useRef, useState } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import MetricCard from '@site/src/components/common/MetricCard';
import ChartHeader from '@site/src/components/common/ChartHeader';
import ChartToggle from '@site/src/components/common/ChartToggle';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import { useSolsticeData } from '@site/src/hooks/useSolsticeData';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';
import { tableStyles, tableRowHoverHandlers, linkHoverHandlers } from '@site/src/styles/tableStyles';

const TEAL_LIGHT = '#00A3B4';
const TEAL_DARK = '#14BCCD';
const ORANGE_QUEUED = '#F39C12';
const SLATE = '#94A3B8';
const INDIGO = '#6366F1';

const START_DATE = '2025-08-15';

const VIEW_OPTIONS = [
  { value: 'eusx' as const, label: 'eUSX Supply' },
  { value: 'usx' as const, label: 'USX Supply' },
];
type ViewMode = typeof VIEW_OPTIONS[number]['value'];

/** Key metric cards for the supply page. */
export function SupplyMetrics(): JSX.Element {
  const { cooldownLedger, tvl, loading, error } = useSolsticeData();

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'var(--ifm-color-danger)' }}>Error loading data: {error}</div>;

  const lastTvl = tvl.length > 0 ? tvl[tvl.length - 1] : null;
  const prevTvl = tvl.length > 7 ? tvl[tvl.length - 8] : null;
  const lastCooldown = cooldownLedger.length > 0 ? cooldownLedger[cooldownLedger.length - 1] : null;
  const prevCooldown = cooldownLedger.length > 7 ? cooldownLedger[cooldownLedger.length - 8] : null;

  const queuedTotal = (lastCooldown?.cooldown_total_outstanding ?? 0) + (lastCooldown?.matured_not_withdrawn ?? 0);
  const eusxSupply = lastTvl?.eusx_supply ?? 0;
  const vaultUsx = lastTvl?.vault_usx_balance ?? 0;
  // Both terms in USX: vault balance (USX backing eUSX) + withdrawal queue (queued + withdrawable)
  const withdrawalShare = vaultUsx > 0
    ? (queuedTotal / (vaultUsx + queuedTotal)) * 100
    : null;

  // 7-day changes
  const usxChange = (prevTvl && lastTvl && prevTvl.usx_supply > 0)
    ? ((lastTvl.usx_supply - prevTvl.usx_supply) / prevTvl.usx_supply) * 100
    : null;
  const eusxChange = (prevTvl && lastTvl && prevTvl.eusx_supply > 0)
    ? ((lastTvl.eusx_supply - prevTvl.eusx_supply) / prevTvl.eusx_supply) * 100
    : null;
  const prevQueuedTotal = (prevCooldown?.cooldown_total_outstanding ?? 0) + (prevCooldown?.matured_not_withdrawn ?? 0);
  const prevVaultUsx = prevTvl?.vault_usx_balance ?? 0;
  const prevShare = prevVaultUsx > 0
    ? (prevQueuedTotal / (prevVaultUsx + prevQueuedTotal)) * 100
    : null;
  const shareChange = (withdrawalShare != null && prevShare != null)
    ? withdrawalShare - prevShare
    : null;

  return (
    <div className="usage-summary-grid">
      <MetricCard
        title="USX Supply"
        value={lastTvl?.usx_supply ?? null}
        format="number"
        decimals={0}
        suffix=" USX"
        change={usxChange}
        tooltip={"Total USX stablecoin supply. USX is minted by depositing USDC collateral and redeemed back to USDC.\nChange shows the 7-day percentage change."}
      />
      <MetricCard
        title="eUSX Supply"
        value={eusxSupply || null}
        format="number"
        decimals={0}
        suffix=" eUSX"
        change={eusxChange}
        tooltip={"Total eUSX tokens in circulation. eUSX represents locked USX positions in the YieldVault.\nChange shows the 7-day percentage change."}
      />
      <MetricCard
        title="eUSX Withdrawal Queue"
        value={withdrawalShare}
        format="percent"
        decimals={2}
        change={shareChange}
        changeUnit="pp"
        tooltip={"Share of eUSX-related USX in the withdrawal queue (queued + withdrawable).\nFormula: (queued + withdrawable) / (vault USX + queued + withdrawable).\nChange shows the 7-day shift in percentage points."}
      />
    </div>
  );
}

/** Supply chart with eUSX/USX toggle, matching StakingBalanceChart layout. */
export function SupplyChartView(): JSX.Element {
  const { tvl, cooldownLedger, loading, error } = useSolsticeData();
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
  const [view, setView] = useState<ViewMode>('eusx');
  const plotRef = useRef<HTMLDivElement>(null);

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'var(--ifm-color-danger)' }}>Error loading data: {error}</div>;

  const Plot = require('react-plotly.js').default;
  const template = getPlotlyTemplate(isDark);
  const config = getResponsivePlotlyConfig();
  const accentColor = isDark ? TEAL_DARK : TEAL_LIGHT;
  const accentTransparent = isDark ? 'rgba(20, 188, 205, 0.2)' : 'rgba(0, 163, 180, 0.2)';

  // Build cooldown lookup by date
  const cooldownByDate: Record<string, { c1d: number; c7d: number; matured: number }> = {};
  for (const d of cooldownLedger) {
    cooldownByDate[d.date] = {
      c1d: d.cooldown_1d_outstanding,
      c7d: d.cooldown_7d_outstanding,
      matured: d.matured_not_withdrawn,
    };
  }

  // Filter from START_DATE
  const startIdx = tvl.findIndex(d => d.date >= START_DATE);
  const sliced = startIdx >= 0 ? tvl.slice(startIdx) : tvl;

  const dates = sliced.map(d => d.date);
  const eusxSupply = sliced.map(d => d.eusx_supply);
  const usxSupply = sliced.map(d => d.usx_supply);
  const cooldown1d = dates.map(d => cooldownByDate[d]?.c1d ?? 0);
  const cooldown7d = dates.map(d => cooldownByDate[d]?.c7d ?? 0);
  const maturedNotWithdrawn = dates.map(d => cooldownByDate[d]?.matured ?? 0);
  // eUSX-bound share: vault USX balance / USX supply (%)
  const eusxBoundPct = sliced.map(d =>
    d.usx_supply > 0 ? (d.vault_usx_balance / d.usx_supply) * 100 : 0
  );

  // Symmetric range for mint/redeem bars (zero centered)
  const maxMintRedeem = Math.max(
    ...sliced.map(d => d.usx_gross_minted || 0),
    ...sliced.map(d => d.usx_gross_redeemed || 0),
    1,
  );
  const mintRedeemRange: [number, number] = [-maxMintRedeem * 1.05, maxMintRedeem * 1.05];

  // Latest values for badges
  const latest = sliced.length > 0 ? sliced[sliced.length - 1] : null;
  const lastCd = latest ? cooldownByDate[latest.date] : null;

  // Legend sizing (matching StakingBalanceChart pattern)
  const numLegendItems = view === 'eusx' ? 5 : 3;
  const legendY = isMobile ? -0.1 : -0.15;
  const bottomMargin = isMobile ? numLegendItems * 25 + 10 : 60;
  const plotAreaBase = isMobile ? 350 : 370;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 450;

  const traces = view === 'eusx'
    ? [
        {
          x: dates,
          y: eusxSupply,
          type: 'scatter' as const,
          mode: 'lines' as const,
          name: 'Active eUSX',
          stackgroup: 'one',
          line: { color: accentColor },
          fillcolor: accentTransparent,
          hovertemplate: '<b>%{y:,.0f}</b> eUSX<extra></extra>',
        },
        {
          x: dates,
          y: maturedNotWithdrawn,
          type: 'scatter' as const,
          mode: 'lines' as const,
          name: 'Withdrawable (USX)',
          stackgroup: 'one',
          line: { color: SLATE },
          fillcolor: 'rgba(148, 163, 184, 0.3)',
          hovertemplate: '<b>%{y:,.0f}</b> USX withdrawable<extra></extra>',
        },
        {
          x: dates,
          y: cooldown1d,
          type: 'scatter' as const,
          mode: 'lines' as const,
          name: 'Queued 1d (USX)',
          stackgroup: 'one',
          line: { color: ORANGE_QUEUED },
          fillcolor: 'rgba(243, 156, 18, 0.3)',
          hovertemplate: '<b>%{y:,.0f}</b> USX queued (1d)<extra></extra>',
        },
        {
          x: dates,
          y: cooldown7d,
          type: 'scatter' as const,
          mode: 'lines' as const,
          name: 'Queued 7d (USX)',
          stackgroup: 'one',
          line: { color: INDIGO },
          fillcolor: 'rgba(99, 102, 241, 0.3)',
          hovertemplate: '<b>%{y:,.0f}</b> USX queued (7d)<extra></extra>',
        },
        {
          x: dates,
          y: eusxBoundPct,
          type: 'scatter' as const,
          mode: 'lines' as const,
          name: 'USX Locked in YieldVault',
          yaxis: 'y2' as const,
          line: { color: ORANGE_QUEUED, width: 2, dash: 'dot' as const },
          hovertemplate: '<b>%{y:.1f}%</b> of USX locked in YieldVault<extra></extra>',
        },
      ]
    : [
        {
          x: dates,
          y: usxSupply,
          type: 'scatter' as const,
          mode: 'lines' as const,
          name: 'USX Supply',
          fill: 'tozeroy' as const,
          line: { color: accentColor },
          fillcolor: accentTransparent,
          hovertemplate: '<b>%{y:,.0f}</b> USX<extra></extra>',
        },
        {
          x: dates,
          y: sliced.map(d => d.usx_gross_minted || 0),
          type: 'bar' as const,
          name: 'Minted',
          marker: { color: 'rgba(16, 185, 129, 0.7)' },
          yaxis: 'y2' as const,
          hovertemplate: '<b>+%{y:,.0f}</b> USX minted<extra></extra>',
        },
        {
          x: dates,
          y: sliced.map(d => -(d.usx_gross_redeemed || 0)),
          customdata: sliced.map(d => d.usx_gross_redeemed || 0),
          type: 'bar' as const,
          name: 'Redeemed',
          marker: { color: 'rgba(239, 68, 68, 0.7)' },
          yaxis: 'y2' as const,
          hovertemplate: '<b>-%{customdata:,.0f}</b> USX redeemed<extra></extra>',
        },
      ];

  const chartTitle = view === 'eusx' ? 'eUSX Supply & Unlock' : 'USX Total Supply';

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
        toggle={<ChartToggle value={view} onChange={setView} options={VIEW_OPTIONS} variant="primary" />}
      />
      {latest && view === 'eusx' && (
        <div
          style={{
            display: isMobile ? 'grid' : 'flex',
            gridTemplateColumns: isMobile ? '1fr 1fr' : undefined,
            gap: isMobile ? '8px' : '16px',
            marginBottom: '16px',
            flexWrap: isMobile ? undefined : 'wrap',
            alignItems: 'center',
            marginLeft: isMobile ? '16px' : 0,
            marginRight: isMobile ? '16px' : 0,
          }}
        >
          <div className="badge badge--primary" style={{
            padding: isMobile ? '8px 12px' : '12px 16px',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center',
          }}>
            <strong>{latest.eusx_supply.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> eUSX
          </div>
          <div className="badge" style={{
            padding: isMobile ? '8px 12px' : '12px 16px',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center',
            backgroundColor: SLATE,
            color: 'white',
          }}>
            <strong>{(lastCd?.matured ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> USX withdrawable
          </div>
          <div className="badge" style={{
            padding: isMobile ? '8px 12px' : '12px 16px',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center',
            backgroundColor: ORANGE_QUEUED,
            color: 'white',
          }}>
            <strong>{(lastCd?.c1d ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> USX queued 1d
          </div>
          <div className="badge" style={{
            padding: isMobile ? '8px 12px' : '12px 16px',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center',
            backgroundColor: INDIGO,
            color: 'white',
          }}>
            <strong>{(lastCd?.c7d ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> USX queued 7d
          </div>
        </div>
      )}
      <Plot
        data={traces}
        layout={{
          ...template.layout,
          autosize: true,
          height: chartHeight,
          hovermode: 'x unified',
          uirevision: 'stable',
          xaxis: {
            ...template.layout?.xaxis,
            title: isMobile ? '' : { text: 'Date (UTC)', font: { size: 14 } },
            type: 'date',
            tickfont: { size: isMobile ? 9 : 12 },
          },
          yaxis: {
            ...template.layout?.yaxis,
            title: isMobile ? '' : {
              text: view === 'eusx' ? 'eUSX + Queued + Withdrawable' : 'USX Supply',
              font: { size: 14 },
            },
            tickfont: { size: isMobile ? 8 : 12 },
            rangemode: 'tozero',
          },
          yaxis2: view === 'eusx' ? {
            ...template.layout?.yaxis,
            title: isMobile ? '' : {
              text: 'USX Locked in YieldVault (%)',
              font: { size: 14, color: ORANGE_QUEUED },
              standoff: 10,
            },
            tickfont: { size: isMobile ? 8 : 12, color: ORANGE_QUEUED },
            ticksuffix: '%',
            overlaying: 'y' as const,
            side: 'right' as const,
            showgrid: false,
            rangemode: 'tozero',
          } : {
            ...template.layout?.yaxis,
            title: isMobile ? '' : {
              text: 'Mint / Redeem (USX)',
              font: { size: 14 },
              standoff: 10,
            },
            tickfont: { size: isMobile ? 8 : 12 },
            overlaying: 'y' as const,
            side: 'right' as const,
            showgrid: false,
            range: mintRedeemRange,
            zeroline: true,
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
            ? { l: 25, r: 25, t: 16, b: bottomMargin }
            : { l: 70, r: 70, t: 16, b: bottomMargin },
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
          <div>{'\u2191'} {view === 'eusx' ? 'eUSX + Queued + Withdrawable' : 'USX Supply'}</div>
          <div>{'\u2192'} Date (UTC)</div>
        </div>
      )}
    </div>
  );
}

/** Table showing top active cooldown positions. */
export function CooldownTable(): JSX.Element {
  const { activeCooldowns, loading, error } = useSolsticeData();

  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: 'var(--ifm-color-danger)' }}>Error: {error}</div>;
  if (activeCooldowns.length === 0) {
    return <div style={{ color: 'var(--ifm-color-emphasis-600)', padding: '16px' }}>No queued positions.</div>;
  }

  return (
    <div style={tableStyles.container}>
      <table style={tableStyles.table}>
        <thead>
          <tr style={tableStyles.headerRow}>
            <th style={tableStyles.headerCell}>#</th>
            <th style={tableStyles.headerCell}>Wallet</th>
            <th style={{ ...tableStyles.headerCell, textAlign: 'right' }}>USX Amount</th>
            <th style={tableStyles.headerCell}>Duration</th>
            <th style={tableStyles.headerCell}>Unlocked</th>
            <th style={tableStyles.headerCell}>Matures</th>
            <th style={tableStyles.headerCell}>Tx</th>
          </tr>
        </thead>
        <tbody>
          {activeCooldowns.map((pos, i) => (
            <tr key={`${pos.wallet}-${pos.maturity_ts}-${i}`} style={tableStyles.bodyRow} {...tableRowHoverHandlers}>
              <td style={{ ...tableStyles.cell, color: 'var(--ifm-color-emphasis-500)' }}>{i + 1}</td>
              <td style={tableStyles.addressCell}>
                <a
                  href={`https://solscan.io/account/${pos.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}
                  {...linkHoverHandlers}
                >
                  {pos.wallet.slice(0, 4)}...{pos.wallet.slice(-4)}
                </a>
              </td>
              <td style={{ ...tableStyles.amountCell, textAlign: 'right' }}>
                {pos.usx.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </td>
              <td style={tableStyles.cell}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: pos.duration === '1d'
                    ? 'rgba(243, 156, 18, 0.15)'
                    : 'rgba(99, 102, 241, 0.15)',
                  color: pos.duration === '1d' ? ORANGE_QUEUED : INDIGO,
                }}>
                  {pos.duration}
                </span>
              </td>
              <td style={tableStyles.dateCell}>
                {new Date(pos.unlock_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </td>
              <td style={tableStyles.dateCell}>
                {new Date(pos.maturity_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </td>
              <td style={tableStyles.addressCell}>
                {pos.signature && (
                  <a
                    href={`https://solscan.io/tx/${pos.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent)', textDecoration: 'none' }}
                    {...linkHoverHandlers}
                  >
                    {pos.signature.slice(0, 4)}...{pos.signature.slice(-4)}
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SupplyChart(): JSX.Element {
  return (
    <>
      <SupplyMetrics />
      <SupplyChartView />
    </>
  );
}
