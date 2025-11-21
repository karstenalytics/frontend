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
import { trackCustomEvent } from '@site/src/utils/analytics';
import styles from './ShareButton.module.css';

interface ShareButtonProps {
  /** Reference to the Plotly chart div */
  plotRef: React.RefObject<HTMLDivElement>;
  /** Chart name for analytics and captions */
  chartName: string;
  /** Optional custom share text (defaults to generated text) */
  shareText?: string;
  /** Show Twitter/X button (default: true) */
  showTwitter?: boolean;
  /** Show Discord button (default: true) */
  showDiscord?: boolean;
  /** Show download button (default: true) */
  showDownload?: boolean;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  plotRef,
  chartName,
  shareText,
  showTwitter = true,
  showDiscord = true,
  showDownload = true,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

      // Get Plotly element
      const plotlyDiv = plotRef.current.querySelector('.plotly') as HTMLElement;
      if (!plotlyDiv) {
        console.error('Plotly chart not found');
        return null;
      }

      // Export chart as PNG at high resolution (optimized for Twitter)
      const imgData = await Plotly.toImage(plotlyDiv, {
        format: 'png',
        width: 1200,
        height: 675, // 16:9 aspect ratio
        scale: 2, // High DPI for crisp rendering
      });

      // Create canvas for branding overlay
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 675;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Load chart image
      const chartImg = new Image();
      await new Promise((resolve, reject) => {
        chartImg.onload = resolve;
        chartImg.onerror = reject;
        chartImg.src = imgData;
      });

      // Draw chart
      ctx.drawImage(chartImg, 0, 0);

      // Add semi-transparent footer bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 625, 1200, 50);

      // Add branding text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px Inter, Arial, sans-serif';
      ctx.fillText('karstenalytics', 20, 655);

      ctx.fillStyle = '#00A3B4';
      ctx.font = '16px Inter, Arial, sans-serif';
      ctx.fillText('karstenalytics.com', 200, 655);

      // Add timestamp (YYYY/MM/DD format)
      const nowDate = new Date();
      const year = nowDate.getFullYear();
      const month = String(nowDate.getMonth() + 1).padStart(2, '0');
      const day = String(nowDate.getDate()).padStart(2, '0');
      const now = `${year}/${month}/${day}`;
      ctx.fillStyle = '#CCCCCC';
      ctx.font = '14px Inter, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(now, 1180, 655);

      // Try to add logo (optional - won't fail if logo doesn't load)
      try {
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          logo.onload = resolve;
          logo.onerror = resolve; // Don't fail if logo doesn't load
          logo.src = '/img/logo.png';
          setTimeout(resolve, 1000); // Timeout after 1s
        });

        if (logo.complete && logo.naturalWidth > 0) {
          // Draw logo in bottom right with 40% opacity
          ctx.globalAlpha = 0.4;
          const logoSize = 80;
          ctx.drawImage(logo, 1100, 540, logoSize, logoSize);
          ctx.globalAlpha = 1.0;
        }
      } catch (e) {
        console.log('Logo not loaded, continuing without it');
      }

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

  /**
   * Share on Twitter/X
   */
  const shareOnTwitter = async () => {
    const blob = await exportChartWithBranding();
    if (!blob) {
      alert('Failed to export chart. Please try again.');
      return;
    }

    // Track share event
    trackCustomEvent('Share', 'twitter', chartName);

    // Generate share text
    const text = shareText || `Check out this ${chartName} from karstenalytics`;
    const url = 'https://karstenalytics.com';
    const hashtags = 'Solana,DeFi,Analytics';

    // For Twitter, we need to download the image and let user upload manually
    // (Twitter API doesn't support direct image sharing from web without auth)
    downloadBlob(blob, `${chartName.toLowerCase().replace(/\s+/g, '-')}.png`);

    // Open Twitter with pre-filled text
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(hashtags)}`;
    window.open(twitterUrl, '_blank');
  };

  /**
   * Share on Discord (copies image to clipboard)
   */
  const shareOnDiscord = async () => {
    const blob = await exportChartWithBranding();
    if (!blob) {
      alert('Failed to export chart. Please try again.');
      return;
    }

    // Track share event
    trackCustomEvent('Share', 'discord', chartName);

    try {
      // Copy image to clipboard (works in modern browsers)
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);

      // Also copy text
      const text = `Check out this ${chartName} from karstenalytics\nhttps://karstenalytics.com`;
      await navigator.clipboard.writeText(text);

      alert('Chart copied to clipboard! Paste it in Discord.');
    } catch (error) {
      // Fallback: just download the image
      console.error('Clipboard API failed:', error);
      downloadBlob(blob, `${chartName.toLowerCase().replace(/\s+/g, '-')}.png`);
      alert('Chart downloaded! Upload it to Discord manually.');
    }
  };

  /**
   * Download chart as PNG
   */
  const downloadChart = async () => {
    const blob = await exportChartWithBranding();
    if (!blob) {
      alert('Failed to export chart. Please try again.');
      return;
    }

    // Track download event
    trackCustomEvent('Share', 'download', chartName);

    downloadBlob(blob, `${chartName.toLowerCase().replace(/\s+/g, '-')}.png`);
  };

  /**
   * Helper to download blob as file
   */
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

  return (
    <div className={styles.shareContainer}>
      <button
        className={styles.shareButton}
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        title="Share chart"
      >
        {isExporting ? '⏳' : '📤'} Share
      </button>

      {showMenu && (
        <div className={styles.shareMenu}>
          {showTwitter && (
            <button
              className={styles.menuItem}
              onClick={shareOnTwitter}
              disabled={isExporting}
            >
              <span className={styles.icon}>𝕏</span> Share on X/Twitter
            </button>
          )}
          {showDiscord && (
            <button
              className={styles.menuItem}
              onClick={shareOnDiscord}
              disabled={isExporting}
            >
              <span className={styles.icon}>💬</span> Share on Discord
            </button>
          )}
          {showDownload && (
            <button
              className={styles.menuItem}
              onClick={downloadChart}
              disabled={isExporting}
            >
              <span className={styles.icon}>⬇️</span> Download PNG
            </button>
          )}
        </div>
      )}
    </div>
  );
};
