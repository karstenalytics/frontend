# Social Media Sharing Guide

This guide explains how to make your Plotly charts shareable on social media (Twitter/X, Discord) with automatic branding and rich previews.

## Overview

The sharing system includes two main components:

1. **ShareButton** - Exports charts with branding overlay and provides one-click social sharing
2. **ChartPageSEO** - Adds Open Graph meta tags for rich social media previews when sharing page URLs

## ShareButton Component

### Features

- **Branded Image Export**: Automatically adds logo watermark, URL footer, and timestamp
- **Optimized Dimensions**: Exports at 1200×675px (perfect for Twitter/X)
- **One-Click Sharing**: Pre-filled captions for Twitter/X and Discord
- **Analytics Tracking**: Tracks which charts get shared and to which platforms
- **Multiple Options**: Download PNG, share to Twitter/X, or copy to Discord

### How to Use

#### 1. Import the Component

```tsx
import { ShareButton } from '@site/src/components/ShareButton';
```

#### 2. Add to Your Chart Component

```tsx
export default function MyChart(): React.ReactElement {
  const plotRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={plotRef}>
      {/* Add ShareButton before or after the chart */}
      <ShareButton
        plotRef={plotRef}
        chartName="My Chart Name"
        shareText="Check out this amazing chart from karstenalytics! 📊"
      />

      {/* Your Plotly chart */}
      <Plot data={data} layout={layout} />
    </div>
  );
}
```

#### 3. Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `plotRef` | `React.RefObject<HTMLDivElement>` | ✅ | Reference to the chart container div |
| `chartName` | `string` | ✅ | Chart name for analytics and file naming |
| `shareText` | `string` | ❌ | Custom share text (default: auto-generated) |
| `showTwitter` | `boolean` | ❌ | Show Twitter/X button (default: true) |
| `showDiscord` | `boolean` | ❌ | Show Discord button (default: true) |
| `showDownload` | `boolean` | ❌ | Show download button (default: true) |

### Example: Full Integration

```tsx
import React, { useRef } from 'react';
import Plot from 'react-plotly.js';
import { ShareButton } from '@site/src/components/ShareButton';

export default function ApyChart(): React.ReactElement {
  const plotRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={plotRef} style={{
      background: 'var(--ifm-background-surface-color)',
      border: '1px solid var(--ifm-toc-border-color)',
      borderRadius: 'var(--ifm-global-radius)',
      padding: '16px',
    }}>
      {/* Header with Share Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <div style={{ flex: 1 }} />
        <ShareButton
          plotRef={plotRef}
          chartName="TUNA Staking APR"
          shareText="Check out the TUNA Staking APR trends! 📊"
        />
      </div>

      {/* Plotly Chart */}
      <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '500px' }}
      />
    </div>
  );
}
```

### What Gets Exported

When a user clicks "Share" → "Download PNG", they get a 1200×675px image with:

- ✅ The chart at perfect Twitter/X dimensions
- ✅ Semi-transparent footer bar with "karstenalytics" branding
- ✅ URL "karstenalytics.com" in teal accent color
- ✅ Date stamp (e.g., "Nov 15, 2025")
- ✅ Logo watermark in bottom right (40% opacity)

### Analytics Tracking

All shares are automatically tracked via GoatCounter:

```
Share → Twitter: /event/Share/twitter/Chart-Name
Share → Discord: /event/Share/discord/Chart-Name
Download PNG:    /event/Share/download/Chart-Name
```

View your share analytics at: https://karstenalytics.goatcounter.com

---

## ChartPageSEO Component

### Features

- **Rich Social Media Previews**: Auto-generates Open Graph and Twitter Card meta tags
- **SEO Optimization**: Adds keywords, descriptions, and canonical URLs
- **Dynamic URLs**: Auto-detects current page URL
- **Platform Support**: Works with Twitter, Discord, Facebook, LinkedIn, Slack

### How to Use

#### 1. Import in MDX Pages

```mdx
---
title: My Chart Page
---

import ChartPageSEO from '@site/src/components/SEO/ChartPageSEO';

<ChartPageSEO
  title="TUNA Staking APR"
  description="Interactive chart showing TUNA staking APR over time"
  chartType="line"
  keywords={['TUNA', 'staking', 'APR', 'DeFi']}
/>

# My Chart Page

Your content here...
```

#### 2. Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | ✅ | Page title for social media preview |
| `description` | `string` | ✅ | Description text (160-200 chars recommended) |
| `chartType` | `'line' \| 'bar' \| 'pie' \| 'scatter' \| 'area' \| 'heatmap'` | ❌ | Type of chart (appends to description) |
| `imageUrl` | `string` | ❌ | Custom OG image URL (default: site logo) |
| `keywords` | `string[]` | ❌ | SEO keywords |

### Example: Complete MDX Page

```mdx
---
title: Revenue Breakdown
---

import BrowserOnly from '@docusaurus/BrowserOnly';
import LoadingSpinner from '@site/src/components/common/LoadingSpinner';
import ChartPageSEO from '@site/src/components/SEO/ChartPageSEO';

<ChartPageSEO
  title="Revenue Breakdown by Pool"
  description="Analyze DefiTuna protocol revenue distribution across different liquidity pools. Interactive visualization with daily, weekly, and monthly views."
  chartType="bar"
  keywords={['revenue', 'pools', 'liquidity', 'DefiTuna', 'analytics']}
/>

# Revenue Breakdown

<BrowserOnly fallback={<LoadingSpinner />}>
  {() => {
    const BreakdownChart = require('@site/src/components/Dashboard/BreakdownChart').default;
    return <BreakdownChart />;
  }}
</BrowserOnly>
```

### What Gets Generated

The component auto-generates these meta tags:

```html
<!-- Standard SEO -->
<meta name="description" content="..." />
<meta name="keywords" content="karstenalytics, Solana analytics, DeFi, ..." />
<link rel="canonical" href="https://karstenalytics.com/current-page" />

<!-- Open Graph (Facebook, LinkedIn, Slack) -->
<meta property="og:type" content="article" />
<meta property="og:url" content="https://karstenalytics.com/current-page" />
<meta property="og:title" content="Your Title | karstenalytics" />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://karstenalytics.com/img/logo.png" />
<meta property="og:site_name" content="karstenalytics" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Your Title | karstenalytics" />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="https://karstenalytics.com/img/logo.png" />
```

---

## Optional: Branding Watermark in Charts

You can add a permanent watermark to charts that appears even when using Plotly's default download:

### How to Use

```tsx
import { getPlotlyTemplate } from '@site/src/utils/plotlyTheme';

const template = getPlotlyTemplate(isDark, { showBranding: true });
```

This adds a subtle "karstenalytics.com" watermark at the bottom of the chart.

**Note:** The ShareButton already adds more prominent branding, so this is optional.

---

## Quick Start Checklist

For each new chart page:

- [ ] Add `ShareButton` component to your chart component
- [ ] Add `ChartPageSEO` component to your MDX page
- [ ] Test the share flow:
  - [ ] Click ShareButton → Download PNG
  - [ ] Verify branding appears in exported image
  - [ ] Share page URL on Twitter/Discord
  - [ ] Verify rich preview appears

---

## Examples in Codebase

### Charts with ShareButton

- ✅ `/src/components/Dashboard/ApyChart.tsx`

### Pages with SEO

- ✅ `/docs/analysis/defituna/staking-apy.mdx`

---

## Customization

### Change Branding Text

Edit `/src/components/ShareButton/ShareButton.tsx`:

```tsx
// Line ~138
ctx.fillText('karstenalytics', 20, 655);
ctx.fillText('karstenalytics.com', 200, 655);
```

### Change Export Dimensions

Edit `/src/components/ShareButton/ShareButton.tsx`:

```tsx
// Line ~51
const imgData = await Plotly.toImage(plotlyDiv, {
  format: 'png',
  width: 1200,   // Change width
  height: 675,   // Change height
  scale: 2,      // Change DPI
});
```

### Change OG Image

```tsx
<ChartPageSEO
  title="..."
  description="..."
  imageUrl="https://example.com/custom-image.png"  // Custom image
/>
```

---

## Troubleshooting

### ShareButton doesn't appear

- ✅ Check that `plotRef` is correctly passed
- ✅ Ensure component is inside the ref container
- ✅ Check browser console for errors

### Exported image is blank

- ✅ Wait for chart to fully render before clicking share
- ✅ Check that Plotly chart is visible on page
- ✅ Try again after chart animation completes

### OG preview doesn't show

- ✅ Wait 1-2 minutes for social media platforms to cache
- ✅ Use Twitter Card Validator: https://cards-dev.twitter.com/validator
- ✅ Use Facebook Debugger: https://developers.facebook.com/tools/debug/
- ✅ Check that `imageUrl` is publicly accessible

### Share tracking not working

- ✅ Check GoatCounter script is loaded in browser
- ✅ Verify `window.goatcounter` exists in console
- ✅ Check analytics dashboard after 5-10 minutes

---

## Best Practices

1. **Keep share text concise** - Twitter has 280 char limit (including URL)
2. **Use emojis** - Makes tweets more engaging (📊 📈 💹 💰)
3. **Include current data** - e.g., "APR is currently 45.2%!"
4. **Test on mobile** - Verify buttons are easily clickable
5. **Update OG images** - Consider creating custom chart preview images

---

## Future Enhancements

Potential improvements to consider:

- [ ] Server-side chart image generation for OG tags
- [ ] Custom branded templates (dark/light variants)
- [ ] LinkedIn share support
- [ ] Copy share link button
- [ ] QR code generation
- [ ] Embed code generator
- [ ] Social media post scheduler

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/karstenalytics/karstenalytics.com/issues
- Documentation: https://karstenalytics.com
