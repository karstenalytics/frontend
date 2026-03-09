import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data } from 'plotly.js';
import { useColorMode } from '@docusaurus/theme-common';
import { getPlotlyTemplate, getResponsivePlotlyConfig } from '@site/src/utils/plotlyTheme';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';
import ChartToggle from '@site/src/components/common/ChartToggle';
import ChartHeader from '@site/src/components/common/ChartHeader';

interface TierData {
  tier: string;
  compound_rate: number;
  compound_rate_faf: number;
  total_wallets: number;
}

interface EpochData {
  epoch: string;
  compound_rate: number;
  compound_rate_faf: number;
  compounders: number;
  non_compounders: number;
  claimed_faf: number;
  by_stake_size: TierData[];
}

interface ConvictionData {
  compound_rate: number;
  compound_rate_faf: number;
  total_claimed_faf: number;
  compounded_faf: number;
  compound_count: number;
  claim_count: number;
  compounders: number;
  non_compounders: number;
  faf_token_claimers: number;
  faf_token_claim_count: number;
  compound_by_epoch: EpochData[];
}

type WeightMode = 'wallets' | 'faf';

const WEIGHT_OPTIONS = [
  { value: 'wallets' as WeightMode, label: 'By Wallets' },
  { value: 'faf' as WeightMode, label: 'By FAF Amount' },
];

// Tier display labels (match data tier keys to cleaner labels)
const TIER_LABELS: Record<string, string> = {
  '<10K': '< 10K',
  '10K-100K': '10K - 100K',
  '100K-1M': '100K - 1M',
  '1M-10M': '1M - 10M',
  '10M+': '10M+',
};

// Tier colors - distinct hues for easy identification
const TIER_COLORS: Record<string, string> = {
  '<10K': '#2ECC71',
  '10K-100K': '#F39C12',
  '100K-1M': '#3498DB',
  '1M-10M': '#E74C3C',
  '10M+': '#8E44AD',
};

export default function ConvictionEpochChart(): React.ReactElement {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const template = getPlotlyTemplate(isDark);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConvictionData | null>(null);
  const [weight, setWeight] = useState<WeightMode>('wallets');

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 996 : false
  );
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 996);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const plotRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (plotRef.current) {
      const updateWidth = () => {
        if (plotRef.current) setContainerWidth(plotRef.current.offsetWidth);
      };
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  useEffect(() => {
    fetch('/data/flash-trade/staker_conviction.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load conviction data');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSpinner />;

  if (error || !data) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-emphasis-600)',
      }}>
        {error || 'Data not yet available.'}
      </div>
    );
  }

  // Filter out epochs with no activity
  const epochs = data.compound_by_epoch.filter(
    ep => ep.compounders + ep.non_compounders > 0
  );
  const hasActiveEpoch = epochs.some(ep => ep.epoch.endsWith('-active'));

  if (epochs.length === 0) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: 'var(--ifm-color-emphasis-600)',
      }}>
        No epoch data available.
      </div>
    );
  }

  const epochLabels = epochs.map((ep) => {
    const clean = ep.epoch.replace('-active', '');
    const [y, m] = clean.split('-');
    const epochNum = (parseInt(y) - 2025) * 12 + (parseInt(m) - 5) + 1;
    const suffix = ep.epoch.endsWith('-active') ? '*' : '';
    if (isMobile) {
      return `Epoch ${epochNum}${suffix}`;
    }
    const endDate = `${y}/${m}/14`;
    return `Epoch ${epochNum}${suffix}<br><span style="font-size:8px">through ${endDate}</span>`;
  });

  // Dynamic legend sizing
  const numLegendItems = 6; // 5 tiers + All Stakers
  const effectiveWidth = containerWidth > 0 ? containerWidth : (typeof window !== 'undefined' ? window.innerWidth : 600);
  const avgItemWidth = isMobile ? 130 : 250;
  const availableWidth = effectiveWidth - (isMobile ? 50 : 80);
  const estimatedColumns = Math.max(1, Math.floor(availableWidth / avgItemWidth));
  const estimatedRows = Math.ceil(numLegendItems / estimatedColumns);
  const rowHeight = isMobile ? 25 : 22;
  const legendHeight = estimatedRows * rowHeight;
  const legendY = isMobile ? -0.1 : -0.2;
  const bottomMargin = isMobile ? legendHeight + 10 : 80;
  const plotAreaBase = isMobile ? 350 : 450;
  const chartHeight = isMobile ? 30 + plotAreaBase + bottomMargin : 500;

  // Get tier keys from first epoch with data
  const tierKeys = epochs[0].by_stake_size.map(t => t.tier);

  const rateKey = weight === 'faf' ? 'compound_rate_faf' : 'compound_rate';

  // Build traces: one line per tier + one "All Stakers" line
  const traces: Data[] = [];

  // Tier lines
  for (const tierKey of tierKeys) {
    const yValues = epochs.map(ep => {
      const tier = ep.by_stake_size.find(t => t.tier === tierKey);
      if (!tier || tier.total_wallets === 0) return null;
      return tier[rateKey];
    });

    // Build hover text with sample size
    const hoverTexts = epochs.map((ep, i) => {
      const tier = ep.by_stake_size.find(t => t.tier === tierKey);
      const rate = yValues[i];
      if (rate === null || !tier) return '';
      return `${TIER_LABELS[tierKey] || tierKey}: ${rate.toFixed(1)}% (n=${tier.total_wallets})`;
    });

    traces.push({
      x: epochLabels,
      y: yValues,
      name: TIER_LABELS[tierKey] || tierKey,
      type: 'scatter',
      mode: 'lines+markers',
      line: {
        color: TIER_COLORS[tierKey],
        width: 2,
      },
      marker: {
        size: 5,
        color: TIER_COLORS[tierKey],
      },
      connectgaps: true,
      text: hoverTexts,
      hovertemplate: '%{text}<extra></extra>',
    });
  }

  // "All Stakers" line - thicker + dashed
  const allY = epochs.map(ep => ep[rateKey]);
  const allHover = epochs.map((ep, i) => {
    const n = ep.compounders + ep.non_compounders;
    return `All Stakers: ${allY[i].toFixed(1)}% (n=${n})`;
  });

  traces.push({
    x: epochLabels,
    y: allY,
    name: 'All Stakers',
    type: 'scatter',
    mode: 'lines+markers',
    line: {
      color: isDark ? '#E6E9EE' : '#333333',
      width: 3,
      dash: 'dash',
    },
    marker: {
      size: 6,
      color: isDark ? '#E6E9EE' : '#333333',
    },
    text: allHover,
    hovertemplate: '<b>%{text}</b><extra></extra>',
  });

  const chartTitle = weight === 'faf'
    ? 'Compound Rate by Epoch (FAF-weighted)'
    : 'Compound Rate by Epoch (by wallet count)';

  return (
    <div ref={plotRef} style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      padding: isMobile ? '16px 0px 16px 0px' : '16px',
      marginBottom: '24px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    }}>
      <ChartHeader
        title={chartTitle}
        plotRef={plotRef}
        isMobile={isMobile}
        toggle={<ChartToggle value={weight} onChange={setWeight} options={WEIGHT_OPTIONS} variant="secondary" />}
      />

      <Plot
        data={traces}
        layout={{
          ...template.layout,
          title: undefined,
          xaxis: {
            ...template.layout.xaxis,
            title: isMobile ? '' : undefined,
            tickfont: { size: isMobile ? 9 : 10 },
            tickangle: isMobile ? -90 : 0,
            type: 'category',
          },
          yaxis: {
            ...template.layout.yaxis,
            title: isMobile ? '' : {
              text: 'Compound Rate (%)',
              font: { size: 14 },
              standoff: 20,
            },
            tickfont: { size: isMobile ? 8 : 12 },
            ticksuffix: '%',
            range: [0, 105],
          },
          showlegend: true,
          legend: {
            orientation: 'h' as const,
            y: legendY,
            yanchor: 'top' as const,
            x: 0.5,
            xanchor: 'center' as const,
            font: { size: isMobile ? 10 : 12 },
          },
          dragmode: isMobile ? false : 'zoom',
          ...(isMobile ? {
            margin: { l: 25, r: 5, t: 20, b: bottomMargin },
          } : {
            margin: { l: 70, r: 24, t: 20, b: bottomMargin },
          }),
          hovermode: 'x unified' as const,
        }}
        config={{
          ...getResponsivePlotlyConfig(),
          staticPlot: false,
          scrollZoom: !isMobile,
        }}
        style={{ width: '100%', height: `${chartHeight}px` }}
        useResizeHandler={true}
      />
      {isMobile && (
        <div style={{
          fontSize: '13px',
          color: 'var(--ifm-color-secondary)',
          marginTop: '0px',
          marginLeft: '25px',
          lineHeight: '1.6',
        }}>
          <div>{'\u2191'} Compound Rate (%)</div>
          <div>{'\u2192'} Epoch</div>
        </div>
      )}
      {hasActiveEpoch && (
        <div style={{
          fontSize: '12px',
          color: 'var(--ifm-color-emphasis-600)',
          textAlign: 'center',
          marginTop: '4px',
          paddingLeft: isMobile ? '16px' : '0px',
          paddingRight: isMobile ? '16px' : '0px',
        }}>
          * Current epoch — numbers may change as the epoch progresses.
        </div>
      )}
    </div>
  );
}
