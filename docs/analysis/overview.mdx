---
title: Analysis Overview
sidebar_custom_props:
  icon: ChartBar
---

# About this section

This section is the heart of this project and provides analytics for Solana-based DeFi protocols, with a focus on **high data quality and easy to understand on-chain data**. I try to keep this as fact-based as possible, and use the Blog section if I want to share opinions about the data or longer explanations.

Visualization of the data is done via plotly charts. You can zoom in and out as you want, if required. Some of the charts are enriched with tables that allow a deep dive into transactions or wallets. This should help to understand which type of transactions are behind the data and also do some sanity checks.

If you want to understand the details about how the information you are seeing on this page is created, please check out the next page. My ambition is to make it as clear as possible what the numbers mean, in case you want to get into the details. 

## Protocol Coverage

### DefiTuna Treasury Analytics

The DefiTuna protocol treasury is my primary focus, with comprehensive coverage including:

- **Revenue Attribution**: Multi-dimensional breakdowns by token, transaction type, and liquidity pool
- **Staking APR**: Historical yield calculations based on treasury inflows and token metrics
- **Daily Trends**: Time-series analysis of revenue patterns and growth
- **Usage Statistics**: Cohort views of stakers plus daily and weekly active wallets developments
- **TUNA Treasury Allocation**: Daily split of treasury-held TUNA between staked and liquid balances
- **Top Transactions**: Detailed views of largest revenue events

Navigate to the **DefiTuna** section in the sidebar to explore interactive dashboards and detailed analytics.

For DefiTuna, other aspects might be interesting like analysing Positions. They are not completely covered via Treasury because e.g. manual closing if Positions is not an event that touches the treasury.

### Which protocol comes next?

After going live I want to clean up first and react on user feedback (if there is any). Then I intend to cover additional DeFi protocols that fit into my scope - stay tuned!


## My Approach

### Data Collection & Classification

My analytics system captures every on-chain transaction involving protocol treasuries and classifies them using **log-based analysis** to achieve perfect attribution accuracy:

1. **Transaction Enumeration**: Identify all transactions involving treasury addresses (PDAs and associated token accounts)
2. **RPC Batch Loading**: Fetch complete transaction data including log messages via Helius API
3. **Pattern Matching**: Classify transactions by analyzing on-chain logs and instruction data
4. **Revenue Attribution**: Convert cross-token inflows to SOL equivalents and attribute to specific sources

This approach ensures that every SOL flowing into the treasury is correctly attributed to its source (pool, token, transaction type).

### Backend Architecture

The analytics pipeline consists of several key components:

- **`full_cache_reload.py`**: Main data loader using RPC batch requests with guaranteed log messages
- **`tx_classifier.py`**: Transaction classification engine with configurable pattern matching
- **`tools/generate_realized_types.py`**: Revenue attribution generator creating daily breakdown files
- **`treasury_analytics.py`**: Full-range analytics aggregator and reporter

All classification logic is defined in `transaction_types_config.json`, making the system transparent and auditable.

### Accuracy Standard

My system maintains a **100% attribution accuracy standard** verified through dual accounting:

1. **Simple Method**: Direct WSOL inflows from transaction metadata
2. **Realized Types Method**: Transaction-by-transaction attribution with type classification

These two methods must reconcile to within rounding errors (≤0.01 SOL per day). Any discrepancy triggers investigation and system refinement.


## Data Freshness

All analytics are generated from the latest available on-chain data. Check the **"Last updated"** timestamp in the site header for data freshness. The backend pipeline can be run daily to incorporate new transactions.

## Technical Documentation

For developers and technical users interested in the backend implementation, please reach out via the contact links in the footer. Detailed documentation covering the revenue attribution design, classification logic, and daily workflow runbooks is available on request because the operational repository is private.

---

Use the sidebar navigation to explore specific analytics for each protocol.

As mentioned above, I have a high priority on data quality and several checks in place. Nevertheless, something might slip through. Feel free to let me know via indicated channels in case you detect something suspicious.

