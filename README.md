# karstenalytics

On-chain analytics for Solana DeFi protocols, focusing on transparency and data quality.

**Live Site:** https://karstenalytics.com

## What is this?

This repository contains the public frontend for karstenalytics - a platform providing deep-dive analytics for Solana DeFi protocols. The site features interactive dashboards, revenue attribution analysis, and staking metrics, all built from on-chain transaction data.

## Technology

- **Framework**: Docusaurus v3 (React-based static site generator)
- **Charts**: Plotly.js with custom light/dark mode theming
- **Styling**: Custom CSS with teal accent theme (#00A3B4)
- **Search**: Local search (no external services)
- **Analytics**: GoatCounter (privacy-friendly, GDPR compliant)

## Data Access

All processed analytics data is available as static JSON files in `/static/data/`:

- **Transaction data**: Protocol revenue, staking metrics, wallet analytics
- **Time-series**: Daily aggregations, historical trends
- **Attribution**: Multi-dimensional revenue breakdowns (token, type, pool, wallet)

These files are updated daily via automated GitHub Actions and can be used for custom analysis or integrations.

## Quick Start

**Prerequisites:** Node.js >= 18.0

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Visit http://localhost:3000/ - the site rebuilds automatically on file changes.

## Repository Structure

```
frontend/
├── docs/              # Markdown content (analysis pages, guides)
├── src/               # React components and custom theme
├── static/            # Static assets and data files
│   └── data/          # Analytics JSON files (updated daily)
├── docusaurus.config.ts
└── sidebars.ts
```

## Contributing

The frontend is open source. The backend analytics pipeline (Python) is private, but all output data is publicly accessible through the static JSON files.

Contributions welcome for:
- UI/UX improvements
- New chart types or visualizations
- Documentation enhancements
- Bug fixes

## License

MIT License - Copyright © 2025 karstenalytics
