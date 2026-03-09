/**
 * ShareButton Component
 *
 * Provides social media sharing functionality for Plotly charts with:
 * - Branded image export (logo watermark + URL)
 * - Pre-filled Twitter/X captions
 * - Discord-optimized sharing
 * - Share tracking via analytics
 */

import React, { useState } from 'react';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { useColorMode } from '@docusaurus/theme-common';
import { Copy, DownloadSimple, XLogo } from '@phosphor-icons/react';
import { trackCustomEvent } from '@site/src/utils/analytics';

interface ShareButtonProps {
  /** Reference to the Plotly chart div */
  plotRef: React.RefObject<HTMLDivElement>;
  /** Chart name for analytics and captions */
  chartName: string;
  /** Optional custom share text (defaults to generated text) */
  shareText?: string;
  /** Hide download button on mobile */
  isMobile?: boolean;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  plotRef,
  chartName,
  shareText,
  isMobile = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  // Only render on client-side (avoid SSR issues)
  if (!ExecutionEnvironment.canUseDOM) {
    return null;
  }

  /**
   * Export chart as PNG with branding overlay
   * Returns blob for further processing
   */
  const exportChartWithBranding = async (): Promise<Blob | null> => {
    if (!plotRef.current || !ExecutionEnvironment.canUseDOM) return null;

    setIsExporting(true);
    try {
      // Dynamically import Plotly only when needed (avoids SSR issues)
      const Plotly = await import('plotly.js-dist-min');

      // Get the Plotly graph div (js-plotly-plot holds _fullLayout needed by toImage)
      const plotlyDiv = plotRef.current.querySelector('.js-plotly-plot') as HTMLElement;
      if (!plotlyDiv) {
        console.error('Plotly chart not found');
        return null;
      }

      // Snapshot original layout values we'll override for export
      const gd = plotlyDiv as any;
      const fl = gd._fullLayout || {};
      const orig = {
        'margin.t': fl.margin?.t ?? null,
        'margin.b': fl.margin?.b ?? null,
        'margin.r': fl.margin?.r ?? null,
        'legend.orientation': fl.legend?.orientation ?? null,
        'legend.x': fl.legend?.x ?? null,
        'legend.xanchor': fl.legend?.xanchor ?? null,
        'legend.y': fl.legend?.y ?? null,
        'legend.yanchor': fl.legend?.yanchor ?? null,
        'legend.font.size': fl.legend?.font?.size ?? null,
      };

      // Hide legendonly traces (user-hidden) so they don't clutter the export
      const hiddenTraceIndices: number[] = [];
      (gd.data || []).forEach((trace: any, i: number) => {
        if (trace.visible === 'legendonly') {
          hiddenTraceIndices.push(i);
        }
      });
      if (hiddenTraceIndices.length > 0) {
        const restyleUpdate: Record<string, any> = { visible: Array(hiddenTraceIndices.length).fill(false) };
        await Plotly.restyle(plotlyDiv, restyleUpdate, hiddenTraceIndices);
      }

      // Force horizontal bottom legend and tight margins for 1200x675 export
      const titleHeight = 36;
      await Plotly.relayout(plotlyDiv, {
        'margin.t': titleHeight,
        'margin.b': 80,
        'margin.r': 24,
        'legend.orientation': 'h',
        'legend.x': 0.5,
        'legend.xanchor': 'center',
        'legend.y': -0.15,
        'legend.yanchor': 'top',
        'legend.font.size': 10,
      });

      const imgData = await Plotly.toImage(plotlyDiv, {
        format: 'png',
        width: 1200,
        height: 675 - titleHeight,
      });

      // Restore hidden traces and original layout
      if (hiddenTraceIndices.length > 0) {
        const restoreUpdate: Record<string, any> = { visible: Array(hiddenTraceIndices.length).fill('legendonly') };
        await Plotly.restyle(plotlyDiv, restoreUpdate, hiddenTraceIndices);
      }
      await Plotly.relayout(plotlyDiv, orig);

      // Create canvas with theme-appropriate background
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 675;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Fill background matching current theme
      ctx.fillStyle = isDark ? '#1b1b1d' : '#ffffff';
      ctx.fillRect(0, 0, 1200, 675);

      // Load chart image
      const chartImg = new Image();
      await new Promise((resolve, reject) => {
        chartImg.onload = resolve;
        chartImg.onerror = reject;
        chartImg.src = imgData;
      });

      // Draw chart below title area
      ctx.drawImage(chartImg, 0, titleHeight);

      // Add large centered logo watermark
      try {
        const logoSrc = isDark ? '/img/logo_dark.png' : '/img/logo.png';
        const logo = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('logo load failed'));
          img.src = logoSrc;
        });

        const targetWidth = 1000;
        const aspect = logo.naturalHeight / logo.naturalWidth;
        const targetHeight = targetWidth * aspect;
        ctx.globalAlpha = 0.08;
        ctx.drawImage(
          logo,
          (1200 - targetWidth) / 2,
          (675 - targetHeight) / 2,
          targetWidth,
          targetHeight,
        );
        ctx.globalAlpha = 1.0;
      } catch {
        // Continue without logo
      }

      // Add chart title top-left with protocol prefix
      const path = window.location.pathname;
      const protocol = path.includes('/flash-trade/') ? 'Flash.Trade'
        : path.includes('/defituna/') ? 'DefiTuna'
        : '';
      const exportTitle = protocol ? `${protocol}: ${chartName}` : chartName;
      ctx.fillStyle = isDark ? '#e3e3e3' : '#1b1b1d';
      ctx.font = 'bold 20px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(exportTitle, 16, 28);

      // Convert canvas to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      });
    } catch (error) {
      console.error('Error exporting chart:', error);
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async () => {
    const blob = await exportChartWithBranding();
    if (!blob) return;
    trackCustomEvent('Share', 'copy', chartName);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
    } catch {
      // Fallback: download instead
      downloadBlob(blob, `${chartName.toLowerCase().replace(/\s+/g, '-')}.png`);
    }
  };

  const downloadChart = async () => {
    const blob = await exportChartWithBranding();
    if (!blob) return;
    trackCustomEvent('Share', 'download', chartName);
    downloadBlob(blob, `${chartName.toLowerCase().replace(/\s+/g, '-')}.png`);
  };

  const shareOnX = async () => {
    const blob = await exportChartWithBranding();
    if (!blob) return;
    trackCustomEvent('Share', 'twitter', chartName);
    downloadBlob(blob, `${chartName.toLowerCase().replace(/\s+/g, '-')}.png`);
    const text = shareText || `Check out this ${chartName} from @karstenalytics`;
    const url = 'https://karstenalytics.com';
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank',
    );
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const defaultColor = 'var(--ifm-color-emphasis-600)';
  const hoverColor = isDark ? '#14BCCD' : '#00A3B4';
  const btnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: isExporting ? 'not-allowed' : 'pointer',
    opacity: isExporting ? 0.4 : 1,
    color: defaultColor,
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  };

  const onEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = hoverColor;
  };
  const onLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = defaultColor;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <button
        style={btnStyle}
        onClick={copyToClipboard}
        disabled={isExporting}
        title="Copy image"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <Copy size={16} color="currentColor" />
      </button>
      {!isMobile && (
        <button
          style={btnStyle}
          onClick={downloadChart}
          disabled={isExporting}
          title="Download PNG"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          <DownloadSimple size={16} color="currentColor" />
        </button>
      )}
      <button
        style={btnStyle}
        onClick={shareOnX}
        disabled={isExporting}
        title="Share on X"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <XLogo size={16} color="currentColor" />
      </button>
    </div>
  );
};
