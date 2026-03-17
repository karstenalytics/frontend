# DefiTuna: From Fee to Revenue

*This article was originally published on [karstenalytics.com](https://karstenalytics.com/articles/2026/03/15/defituna-from-fee-to-revenue), where it includes tables, interactive charts, and additional detail sections.*

DefiTuna was the first protocol I started tracking on karstenalytics. The [dashboards](https://karstenalytics.com/analysis/defituna/overview) have been live for a while, but I never wrote the companion article explaining how the fee pipeline actually works. After publishing the [Flash.Trade fee flow](https://karstenalytics.com/articles/2026/03/05/how-flash-trade-fees-reach-faf-stakers) deep dive, it was time to give DefiTuna the same treatment. The fee journey turned out to be surprisingly different: fees arrive in dozens of different tokens from pools across two AMMs, all of which need to be converted to SOL before stakers see a single lamport.

- Everything in this article comes from observing on-chain state and transaction data. I have no access to DefiTuna's source code, so the behavioral explanations below are inferences from those traces.
- The mechanics described below are based on on-chain activity observed through March 15, 2026.

## Where Does Your SOL Come From?

So, you stake TUNA. Periodically, SOL appears on your [Stake $TUNA](https://defituna.com/stake) page, ready to claim or compound. But where does it actually come from? And how does a fee paid in FARTCOIN on an Orca whirlpool end up as SOL in your staking position?

I wanted to verify that fees are properly transformed into staker revenue, with nothing materially lost along the way. After tracing every transaction in my dataset, I can confirm the pipeline is accurate within the 0.01 SOL tolerance used in this analytics system. This article walks through how it works.

## The Fee-to-Revenue Journey

The first thing to notice: unlike Flash.Trade, which accumulates fees in internal on-chain accounting fields and periodically sweeps them through multiple stages, DefiTuna routes every fee directly to the [treasury PDA](https://solscan.io/account/G9XfJoY81n8A9bZKaJFhJYomRrcvFkuJ22em2g8rZuCh) within the same transaction that generates it. No staging areas, no hourly consolidation. But the fee arrives in whatever tokens the pool trades in, which creates a conversion challenge.

Let's trace a single fee with round numbers. A user deposits 10 SOL as collateral and borrows 20 SOL to open a 3x leveraged LP position on the SOL-USDC Orca whirlpool. DefiTuna's docs describe the protocol fee as a percentage of the borrowed funds amount. At the most common observed rate in my dataset, 10 bps (0.10%), that is a fee of **0.02 SOL of value**. Because this is a two-token pool, the fee reaches the treasury split across both tokens: roughly 0.01 SOL and another 0.01 SOL-equivalent in USDC.

The 0.01 SOL is ready for distribution to stakers immediately; it is already in the right denomination. (Technically, the treasury holds it as WSOL, SOL wrapped as an SPL token so it can be handled by the token program like any other token. This article uses "SOL" when talking about value and "WSOL" in technical contexts where the wrapped form matters.) The USDC sits in the treasury's USDC token account, accumulating alongside USDC from dozens of other transactions, until a *swap_reward* instruction converts the batch to SOL. Three hours later, a *deposit_reward* instruction deposits all accumulated SOL into the [staking contract](https://solscan.io/account/tUnst2Y2sbmgSgARBpSBZhqPzpoy2iUsdCwb5ToYVJa), where it becomes claimable by TUNA stakers proportional to their stake.

That is the simple case. Now imagine the same fee from a SOL-FARTCOIN pool: half arrives as FARTCOIN. Or from a USDC-WhiteWhale pool: it arrives as USDC and WhiteWhale tokens. Across more than 50 pools and more than 30 different tokens, the treasury is constantly collecting, converting, and depositing.

All treasury revenue is distributed through the staking contract. There is no on-chain split like Flash.Trade's 50/50 split between stakers and a separate protocol-treasury leg; wallets controlled by the team appear to earn through the same staking mechanism as other TUNA holders.

The following sections zoom into each stage of this journey: how fees are charged, how non-SOL tokens are converted, and how SOL reaches stakers.

**The Fee Model** 
DefiTuna is a **leveraged liquidity provision protocol**. Users deposit collateral, borrow additional capital from DefiTuna's lending pools, and deploy the combined amount as concentrated liquidity on Orca Whirlpools or Fusion AMM pools (for LP positions), or as directional bets (for leveraged spot positions).

An important detail: [Fusion AMM](https://fusionamm.com/) is not a third-party AMM. It is built by the DefiTuna team, a hybrid CLMM + on-chain orderbook. Fusion AMM is the underlying trading venue, while DefiTuna is the lending and leverage layer on top. Revenue from both shows up in the same treasury-to-staking pipeline traced here.

DefiTuna charges a **protocol fee** on position management (opening, compounding, trigger order execution) and a **liquidation fee** (the docs describe it as 10%) on liquidated positions. The docs illustrate the protocol fee as 0.05% of borrowed funds, but from analyzing 240,000+ scanned treasury transactions I found the most common observed tier is 10 bps (0.10%), with other pools at 5 or 3 bps.

Lenders who supply capital to the lending pools earn borrowing interest. As of this writing, no lending protocol fee appears to flow to the treasury: in the on-chain data I have observed, all borrower interest goes to lenders.

**The *swap_reward* Conversion Pipeline** 
Non-SOL tokens accumulate in the treasury's associated token accounts (ATAs) until a *swap_reward* instruction converts them to WSOL. DefiTuna uses several variants depending on the token and the routing path:

- *swap_reward_orca*: Single-hop swap via Orca Whirlpool
- *swap_reward_fusion*: Single-hop swap via Fusion AMM
- *swap_reward_two_hop_orca*: Two-hop swap via Orca (e.g. FARTCOIN to USDC to SOL)
- *swap_reward_two_hop_fusion*: Two-hop swap via Fusion

The conversions are part of the same keeper bot cycle as *deposit_reward*. Every ~3 hours, the bot converts whatever non-SOL tokens have accumulated, down to dust amounts, then decides whether to deposit based on the total WSOL balance (see below). USDC appears in about 99% of conversion cycles because it accumulates fast enough to have a balance every 3 hours. Niche tokens like cbBTC (present in about 6% of cycles) may go days between conversions, not because the bot waits for a minimum balance, but because it takes that long for any fees in that token to appear.

*swap_reward* transactions create an accounting challenge. When a conversion turns 100 USDC into 0.7 SOL, that 0.7 SOL is not new revenue. It is the SOL-equivalent of USDC fees that were already earned by earlier transactions. If you count both the original USDC inflow and the *swap_reward* SOL output, you double-count.

I solve this by tracking a ledger of pending ATA balances per mint and per originating transaction type. When a *swap_reward* fires, its SOL output is attributed proportionally back to the original transactions that earned the ATA tokens. The conversion itself is never counted as new revenue.

**The *deposit_reward* Cycle** 
Once fees have been converted to SOL, a *deposit_reward* instruction deposits the accumulated WSOL into the [TUNA staking contract](https://solscan.io/account/tUnst2Y2sbmgSgARBpSBZhqPzpoy2iUsdCwb5ToYVJa). When *deposit_reward* fires, it simultaneously updates three fields on the Treasury account: *total_reward* and *total_unclaimed_reward* both increase by the exact deposit amount (confirming nothing is skimmed), while *acc_reward_per_share* increases proportionally. This is the accumulator the contract uses to calculate each staker's claimable share. When stakers call *claim_reward*, only *total_unclaimed_reward* decreases. When they *compound_reward*, it decreases (claimed SOL) and *total_staked_shares* increases (re-staked).

I analyzed all 1,291 *deposit_reward* events in my dataset to understand the cadence and determine what triggers a cycle.

**The base interval is roughly 3 hours.** During high-volume periods like October 2025, events fire at near-steady 3-hour intervals. On October 1, the first four events landed at 01:49, 04:50, 07:52, and 10:54 UTC. The gaps are 3h01m, 3h02m, and 3h02m; not exactly 3 hours, but close. The small drift that accumulates over successive cycles suggests a timer-based mechanism rather than a fixed cron schedule.

**The trigger threshold is 1.0 SOL.** When revenue is low, cycles get skipped. By tracking WSOL inflows to the treasury between consecutive deposits, I found a sharp cutoff: across all 1,291 events, not a single normal deposit fired with less than 1.0 SOL accumulated. The smallest deposits barely cleared the line:

- 2026-02-10: 6.1h gap, 1.003 SOL collected
- 2025-11-27: 3.0h gap, 1.005 SOL collected
- 2026-01-27: 6.0h gap, 1.006 SOL collected
- 2026-01-04: 3.0h gap, 1.007 SOL collected

The tiny overshoot above 1.0 (3,000,000 to 8,000,000 lamports) is revenue that trickled in between the balance check and the deposit transaction landing on-chain. The threshold itself is almost certainly exactly 1,000,000,000 lamports.

**During low-volume periods, skipped cycles become common.** In February 2026, only about 37% of inter-deposit gaps were simple ~3-hour intervals. Over the full dataset, the 1,290 gaps between consecutive deposits break down as:

- ~3 hours: 983 (76.2%), meaning >= 1 SOL available, deposit fires
- ~6 hours: 227 (17.6%), one cycle skipped
- ~9 hours: 53 (4.1%), two cycles skipped
- ~12+ hours: 27 (2.1%), three or more cycles skipped

The behavioral model: every ~3 hours, the keeper checks the treasury's WSOL balance. If >= 1.0 SOL is available, it fires *deposit_reward* to sweep the full balance into the staking contract. If not, it waits for the next cycle.

## What Flows Through the Pipeline

Now that the mechanics are clear, let's look at what actually flowed through this pipeline. Over the 235 days in my dataset (July 24, 2025 to March 15, 2026), the treasury collected **8,381 SOL**.

**Revenue by Source**

- Orca Leveraged LP: 4,268 SOL (50.9%). Position opens, closes, liquidations, compounding
- Orca Direct transfers: 146 SOL (1.7%). Revenue collected before the current fee system was in place
- Fusion AMM trading fees: 2,544 SOL (30.4%). *collect_protocol_fees* sweeps from Fusion pool accounts
- Fusion Leveraged LP: 1,339 SOL (16.0%). Position opens, closes, liquidations, compounding
- Fusion Spot positions: 84 SOL (1.0%). Leveraged spot trading
- **Total: 8,381 SOL**

The **Fusion AMM trading fees** deserve a note: *collect_protocol_fees* is a periodic sweep of accumulated swap fees from Fusion pool accounts. Multiple types of trading activity on Fusion contribute to these fees, but the on-chain instruction aggregates them into a single collection event. Breaking down what trading activity sits behind each sweep would require caching all Fusion pool transactions, not just treasury transactions, which my pipeline currently does not do. There is also a difference in how the two AMMs surface fees: on Orca, fees are collected as part of position management transactions (open, close, compound), while on Fusion, the dedicated *collect_protocol_fees* sweep is the largest single revenue category.

On both Orca and Fusion, **liquidations account for a significant share of LP revenue**. This is inherent to leveraged concentrated liquidity: when prices move outside a position's range, the position stops earning fees and becomes increasingly exposed to impermanent loss. With leverage amplifying the losses, positions can hit their [liquidation threshold](https://docs.defituna.com/dive-into-defituna/provide-liquidity/platform-info/liquidations) during volatile moves. The liquidation fee (10% per the docs) is substantially larger per event than the protocol fee (typically 10 bps) charged at position opening.

This also means treasury revenue is sensitive to market volatility. During volatile periods, liquidation volume spikes and so does revenue. During low-volatility regimes, such as early March 2026, liquidations dry up and revenue drops significantly.

Explore the full breakdown on the [revenue by type dashboard](https://karstenalytics.com/analysis/defituna/fees-revenue/by-type).

**Revenue by Pool**

- Fusion SOL-USDC: 3,053 SOL (36.4%)
- Orca SOL-USDC: 2,237 SOL (26.7%)
- Fusion USDC-WhiteWhale: 469 SOL (5.6%)
- Orca SOL-CBBTC: 344 SOL (4.1%)
- Orca SOL-FARTCOIN: 303 SOL (3.6%)
- Other: 1,974 SOL (23.6%)

SOL-USDC pools on both AMMs account for 63% of revenue, but the remaining 37% comes from a diverse long tail of token pairs. This creates the accounting challenge described in the *swap_reward* section: when DefiTuna collects a protocol fee from the SOL-FARTCOIN pool, part of that fee arrives as FARTCOIN tokens that must be converted to SOL before distribution.

The treasury receives fees in more than 30 different token mints: 57% as direct SOL (ready immediately), 24% as USDC, and the remaining 18% spread across FARTCOIN, WhiteWhale, cbBTC, TUNA, ORE, BONK, and many others. Everything except SOL must pass through the *swap_reward* conversion pipeline before stakers see it.

Explore the full breakdown on the [revenue by pool dashboard](https://karstenalytics.com/analysis/defituna/fees-revenue/by-pool).

**The Liquidation Dependency** 
The data above reveals a structural pattern: DefiTuna's revenue is heavily dependent on liquidations. The protocol fee on position opens is small (typically 10 bps), while the liquidation fee (10% per the docs) generates far more per event.

How much more? Counting all 190,000 revenue events in the dataset (one transaction can contain multiple revenue-generating instructions):

- **Liquidations**: 8,904 events (4.7%), 4,467 SOL (53.3%)
- Fusion trading fees: 7,103 events (3.7%), 2,544 SOL (30.4%)
- LP operations (incl. SL/TP): 169,735 events (89.5%), 1,140 SOL (13.6%)
- Spot positions: 3,963 events (2.1%), 84 SOL (1.0%)
- Other: 3 events (0.0%), 146 SOL (1.7%)

Nearly 90% of all revenue events are routine LP operations (opens, compounds, fee collections), but they contribute just 14% of revenue. Liquidations are fewer than 5% of events yet account for more than half of all SOL earned. During volatile months like October 2025, liquidation-driven revenue pushed daily totals well above average. During calm stretches like early March 2026, liquidations nearly disappeared and revenue dropped to a fraction.

The chart below visualizes this, breaking down the top 10 pools by revenue (covering ~89% of total). Each column is a liquidity pool; column width reflects the pool's share of total revenue. Within each column, colored segments show transaction types, with height indicating their share of that pool's revenue. A large area means a high-revenue combination.

Red segments are liquidation fees. In the Orca SOL-USDC column, red dominates: most of that pool's revenue comes from liquidations. The Fusion SOL-USDC column tells a different story; the largest segment is *collect_protocol_fees* (teal), the periodic sweep of trading fees from the Fusion AMM. This is the revenue source that does not depend on liquidations. Across the smaller pools on the right, liquidation red is present nearly everywhere.

[IMAGE: Revenue by Pool and Transaction Type chart]

*Interactive version: [Revenue by Pool and Transaction Type](https://karstenalytics.com/analysis/defituna/fees-revenue/pools-vs-types)*

A protocol that earns most of its revenue from liquidations needs volatile markets to sustain staker returns.

The DefiTuna team is actively working to change this. They plan to wind down support for Orca pools and consolidate all activity on their own Fusion AMM. That will mean a short-term revenue hit, Orca currently accounts for over 50% of total revenue. But combined with permissionless pool creation on Fusion, which is also in the pipeline, this could fundamentally shift the revenue mix. TUNA staker revenue would become less dependent on liquidations.

But regardless of where the fees come from or how the mix shifts, the pipeline would stay the same: fees arrive in dozens of tokens from LP positions and trading, the keeper bot converts and deposits on roughly three-hour checks, and the revenue ultimately lands in the TUNA staking contract. That is what I set out to verify, and it holds across the full history covered here. The machinery works. What flows through it is the part that will change.

---

*Revenue data covers July 24, 2025 through March 15, 2026 (235 days). The live version of this data is on the [DefiTuna dashboards](https://karstenalytics.com/analysis/defituna/overview), updated daily.*

*Read the full version of this article, including a worked example tracing a single deposit_reward cycle end-to-end, on [karstenalytics.com](https://karstenalytics.com/articles/2026/03/15/defituna-from-fee-to-revenue).*
