# Deep Dive on Flash.Trade's FAF Stake Pool

*This article was originally published on [karstenalytics.com](https://karstenalytics.com/articles/2026/03/10/faf-staker-pool-deep-dive), where it includes tables, interactive charts, and additional detail sections.*

My [other Flash.Trade article](https://karstenalytics.com/articles/2026/03/05/how-flash-trade-fees-reach-faf-stakers) traced the USDC fee flow from traders to FAF stakers. This article looks at the other side: the FAF tokens themselves. Where did they come from, where did they go, and can every token be accounted for? I looked at 84,000+ on-chain events to find out.

- This article reflects my personal understanding of Flash.Trade's on-chain mechanics, derived entirely from observing on-chain state and transaction data. Data is from early March 2026. Check dashboards for live data.
- All FAF amounts are in whole tokens unless noted otherwise. On-chain values are tracked to 6 decimal places.
- The [Staking Overview](https://karstenalytics.com/analysis/flash-trade/staking/stake-pool-overview) dashboard shows the live version of the data discussed here.

## 1. The TGE: How 1 Billion FAF Were Split

Flash.Trade launched [FAF](https://solscan.io/token/FAFxVxnkzZHMCodkWyoccgUNgVScqMw2mhhQBYDFjFAF) with a fixed supply of [1,000,000,000 tokens](https://docs.flash.trade/flash-trade/flash-trade-protocol/tokenomics), with a distribution plan split across five categories:

- a) First Year Staking Rewards: 9.6% (96,000,000 FAF). Monthly epoch allocations.
- b) Incubation (Solana Labs): 5.4% (54,000,000 FAF). Streamflow linear vesting.
- c) Advisors: 1% (10,000,000 FAF). Streamflow linear vesting.
- d) Liquidity Provision: 4% (40,000,000 FAF). Raydium LP.
- e) Community (Beast NFTs + airdrops): 80% (800,000,000 FAF). Direct, no vesting.

Source: [Flash.Trade Tokenomics](https://docs.flash.trade/flash-trade/flash-trade-protocol/tokenomics)

This means: No VC allocation, and team compensation is not pre-allocated. It is determined by [futarchy governance](https://docs.flash.trade/flash-trade/flash-trade-protocol/tokenomics), where prediction markets guide key decisions including token parameters.

**a) Staking rewards (9.6%)** fund monthly distributions to active stakers. The team treasury sends a fixed allocation to the protocol multisig each month (8M FAF through November 2025, reduced to 5.6M from December onward), which is then deposited into the vault alongside harvested penalties. After 10 epochs, 72.8M of the 96M (75.8%) has been distributed, leaving 23.2M, roughly four more months at the current rate. Section 7 covers the full reward cycle.

**b) Incubation and c) advisors (6.4% combined)** vest linearly through [Streamflow](https://streamflow.finance/) contracts; my [Vesting Timeline](https://karstenalytics.com/analysis/flash-trade/staking/vesting-timeline) dashboard tracks unlock schedules, withdrawn amounts, and how much vesting recipients have re-staked. On-chain, the team treasury [sent exactly 54M FAF](https://solscan.io/tx/52P2ggEYSKvhjmnxfmEPaY5hdiHT7xz573tpsrJYoja13WbBTE9apvsjm2A9cwKEvv6zVsKjm1X4czL7JANqZqZf) for incubation vesting (matching the 5.4% allocation) and [4.25M for advisory contracts](https://solscan.io/tx/28Za7s7M8t4FnJqWpvwue8pWzgxWvZttPFmoRaWKspxDi7Fej9QHSJhTwLdBfv7F2WBwmsqVCHM3Sniv2ArFxiLZ), both to the [Streamflow intermediary vault](https://solscan.io/account/5Arakn7JSt3sPkXdWvy1887Bjd2d755b57BTEwBR7cW3). Of the 10M advisory allocation, only 4.25M (0.425%) has been distributed so far; the remaining 5.75M is still in the team treasury.

**d) Liquidity (4%)** went to a FAF/SOL pool on Raydium. The team deposited 37.7M FAF paired with 1,207 SOL across two tranches on April 14-15. On February 15, 2026, the LP was fully closed, returning 40.4M FAF (+7.1%) and 1,453 SOL (+20.3%) to the treasury.

**e) Community (80%)** dominates the allocation. No cliff, no vesting. Of that 800M, **788M FAF** was deposited into the staking pool as a reserve for Beast NFT holders. The remaining tokens went to airdrops: on April 19, the team treasury distributed ~12.0M FAF across 28 wallets in four tiers (771K, 429K, 343K, and 86K FAF per recipient). Only 23 of the 28 recipients ever staked their FAF, and as of this writing, 10 still hold a staking position (though one is effectively dust at ~0.004 FAF). All 23 can be looked up in the [Wallet Timeline](https://karstenalytics.com/analysis/flash-trade/staking/wallet-timeline).

Where did the 788M go? I traced every token on-chain. Here is the full picture in one chart:

[IMAGE: FAF Staker Pool Overview chart showing four stacked areas (purple=Reserved, teal=Staked, orange=Queued, gray=Unstaked) from April 2025 through February 2026, with numbered annotations marking key events: Day One reserve (2), Burn Window (3), Growth Phase (4), Unstake Queue (5), Epoch 10 Shift (6), Monthly Reward Machine (7)]

Source: [Staking Overview](https://karstenalytics.com/analysis/flash-trade/staking/stake-pool-overview) dashboard. Screenshot date: March 9, 2026

The chart shows four colored areas stacked on top of each other. Each represents a bucket of FAF tokens inside the staking pool that I defined:

- **Purple (Reserved):** FAF allocated to specific recipients but not yet distributed. Initially the 788M earmarked for Beast NFT holders; three events drain it: *burn_and_stake* (NFT burn, FAF auto-staked), *burn_and_claim* (NFT burn, FAF sent to wallet minus 5% penalty), and *withdraw_unclaimed_tokens* (protocol sweeps remaining reserve after the claim window closes). Penalty fees from *burn_and_claim* (5%) and instant unstakes (3%) flow back into this bucket, earmarked for redistribution to stakers, until the multisig harvests them via *withdraw_instant_fees* and re-deposits them as staking rewards.
- **Teal (Staked):** FAF actively staked and earning rewards. This is the area that grows as NFT holders burn-and-stake (and additional FAF bought on the open market is staked).
- **Orange (Queued):** FAF in the unstake queue, waiting to leave. Before Epoch 10 (February 15, 2026), this was a 30-day cliff: tokens were locked for 30 days, then fully withdrawable. After Epoch 10, the queue was replaced by a 90-day linear vesting schedule where 1/90th of the amount matures each day.
- **Gray (Unstaked):** FAF that has matured from the queue and is ready for withdrawal. Once a user calls *withdraw_token*, the FAF leaves the staking pool entirely and vanishes from the chart. It only reappears if the user deposits and stakes it again via *deposit_token_stake*.

The numbered annotations on the chart mark the sections below. Each section zooms into one phase of the timeline. Lets walk through!

## 2. Day One: The Reserve

On April 12, 2025, the protocol multisig [deposited 788M FAF](https://solscan.io/tx/2czaHJEzymum4Ztatj227GNjJJwNubsENrh6cfuwfdVdZFCJ8Sueik2cYxE1D6Jj8QxNMWA2AuQQitmymd2kGFeD) into the staking pool (none of it was staked). The entire amount sat in a virtual "reserved" bucket (this is my wording, not Flash.Trade's) inside the accounts on-chain state, earmarked for Beast NFT holders who would later burn their NFTs to claim an allocation. The reserved FAF was dormant: it did not earn rewards, did not count toward the staked supply, and could not be withdrawn by anyone except the NFT holders. It existed solely as a distribution pool waiting to be claimed.

On Day One the chart is almost entirely purple: 788M reserved, 0 staked, 0 queued. That is 78.8% of the entire FAF supply sitting there, waiting for NFT holders to decide its fate.

The wait was short. Within the first week, NFT holders claimed 615M of the 788M reserve (78%). The biggest single day was April 14, when the reserved bucket dropped from 788M to 302M as nearly half a billion FAF moved into staking in a single day. By April 18, only 173M remained in the reserve.

## 3. The Burn Window (April - October 2025)

NFT holders could claim their FAF allocation via two paths, but the choice came with consequences:

- **BurnAndStake:** Burn NFT, FAF auto-staked. No penalty. Tokens stay in the pool earning rewards.
- **BurnAndClaim:** Burn NFT, FAF sent to wallet. **5% penalty.** Tokens leave the pool entirely.

The 5% BurnAndClaim penalty was a deliberate incentive: keep your FAF staked, or pay for liquidity. Most holders chose staking.

**The numbers tell the story.** Over 4,325 burn events across the six-month window, the split was decisive:

- BurnAndStake: 3,397 events, 536,938,283 FAF distributed (73.4%)
- BurnAndClaim: 928 events, 194,608,722 FAF received (26.6%)
- **Total: 4,325 events, 731,547,005 FAF**

The BurnAndClaim recipients actually had allocations totaling 204.9M FAF, but they received only 194.6M after the 5% penalty. The 10.2M difference stayed in the staking vault, quietly accumulating for later redistribution (more on this in section 7).

Activity was heaviest in April, the month of TGE: 3,585 burns accounting for 88% of all distributed FAF. On April 14 alone, staked FAF jumped from 37,000 to 315 million, nearly the entire first wave of BurnAndStake in a single day. By October, only a trickle of stragglers remained.

The batch-burn pattern is worth noting: 1,298 of 2,099 BurnAndStake transactions contained *two* burn instructions, with holders burning multiple NFTs in a single Solana transaction.

**The deadline: October 15, 2025.** The TGE claim window closed, and October 15 was the busiest day for the multisig. Four operations executed in sequence:

1. **WithdrawInstantFees**: harvest 3.76M in accumulated penalties
2. **DistributeTokenReward**: redistribute 11.76M (8M allocation + 3.76M penalties)
3. **WithdrawUnclaimedTokens**: sweep the remaining 46.2M unclaimed FAF from the reserve
4. The unclaimed tokens were **returned to the team treasury** (not burned)

My data confirms the cliff: the reserved bucket dropped from 50.9M on October 14 to zero on October 15. The 46.2M FAF that was never claimed by NFT holders, roughly 5.9% of the original 788M reserve, was returned to the team treasury.

## 4. Growth Phase

The teal area does not grow from *burn_and_stake* alone. NFT holders steadily converted their claims into staked FAF, but a larger source of growth came from direct deposits via *deposit_token_stake*: users who acquired FAF on the open market (or received it via *burn_and_claim*) and chose to stake it.

Over the full period, the cumulative inflows into staking tell a clear story:

- *burn_and_stake* (from reserve): 3,397 events, 537M cumulative FAF staked
- *deposit_token_stake* (from outside): 13,346 events, 1,291M cumulative FAF staked

These are lifetime totals, not the current balance: FAF that was staked, unstaked, and re-staked counts each time. The 1,291M from outside deposits potentially includes FAF that cycled through the pool multiple times. Still, outside deposits contributed **2.4x more staked FAF** than the reserve burns, showing that the staking pool attracted far more capital than the initial NFT allocation alone.

## 5. The Unstake Queue

FAF price climbed steadily from $0.0012 at its May low to a peak of **$0.0123 on September 21**, a 10x move in four months. As the price rose through August and September, some stakers wanted to begin taking profits: the orange (queued) band on the chart starts growing visibly around this time, as *unstake_token_request* activity picked up. After the September peak, the price dropped sharply to $0.0068 by September 25, and staked FAF fell from 701M to 643M as more holders moved tokens into the queue.

Stakers who want to leave have two paths: wait or pay. The queue path (*unstake_token_request* followed by *withdraw_token* after 30 days) is free but slow. The instant path (*unstake_token_instant*) skips the wait but costs a 3% penalty. A third instruction, *cancel_unstake_token_request*, lets stakers change their mind and return queued tokens to staking.

- *unstake_token_request*: Tokens enter the 30-day queue. No cost, but locked.
- *withdraw_token*: Matured tokens leave the pool. No cost.
- *cancel_unstake_token_request*: Queued tokens return to staking. No cost.
- *unstake_token_instant*: Tokens leave immediately. **3% penalty.**

**The impatience tax.** The 3% instant unstake penalty creates an interesting dynamic. When someone pays 3% to skip the 30-day wait, those penalty tokens do not disappear. They accumulate inside the vault, waiting to be recycled.

Over the protocol's lifetime, 2,316 instant unstakes moved 808M FAF out of staking, generating **20.9M FAF in penalties**, all of which flowed back to remaining stakers as rewards. FAF stakers rejoice.

The orange band on the chart is most visible around September-October 2025, when a wave of unstake requests temporarily pushed the queued balance above 20M FAF. Some of those requests were later cancelled, while others matured and transitioned into the gray (unstaked/withdrawable) band.

## 6. The Epoch 10 Shift (February 15, 2026)

Staked FAF hit its all-time high of **737M on February 9, 2026**. Six days later, staked amount went south.

**The pre-epoch rush.** In the days before Epoch 10, stakers who wanted out rushed to enter the old 30-day queue before the rules switched to 90-day vesting. Between February 9 and 14, staked FAF dropped from 737M to 670M as 64M entered the queue. On February 14 alone, 14 delayed unstake requests moved 42M FAF into the queue, the single largest day of queue entries in the protocol's history.

**Rollover day.** On February 15, the epoch rolled over. Three things happened simultaneously:

1. **All existing queue entries matured instantly.** The 69M FAF sitting in the 30-day queue became immediately withdrawable. The orange band collapsed from 69M to 3.3M (new entries under the 90-day regime).
2. **Massive outflow.** 97M FAF was withdrawn from the pool that day, the largest single-day outflow ever.
3. **Partial re-staking.** 63M FAF was staked on the same day, as some holders re-staked their matured tokens and the monthly *distribute_token_reward* added 7M in rewards.

The net effect: staked FAF recovered from 670M to 684M, but total FAF in the pool dropped from 748M to 714M. Over 33M FAF left the staking pool permanently.

**The new regime.** As of March 9, the pool sits at **689M staked**, 36.4M queued, 11.4M unstaked. The queued balance has grown significantly under the new 90-day vesting regime, rising from 3.3M on rollover day to 36.4M as new unstake requests outpace daily queue maturation. Staked FAF remains 49M below the February 9 ATH (a 6.6% decline) and has not yet recovered.

## 7. The Monthly Reward Machine

The 96M staking rewards from the TGE allocation fund a monthly distribution cycle ("Epoch Rewards"). Every month on the 15th, a three-step process recycles penalties and distributes fresh rewards:

1. **Team allocation arrives**: The team treasury sends a fixed monthly allocation to the protocol multisig (8M FAF through November 2025, reduced to 5.6M from December onward)
2. **Penalties are harvested**: WithdrawInstantFees pulls all accumulated penalties from the staker pool, both the 3% instant unstake fees and the 5% BurnAndClaim fees
3. **Combined redistribution**: The multisig deposits the combined total back into the staker pool via DistributeTokenReward, where it is distributed proportionally to all active stakers

**Penalty recycling over time:**

- 2025-05-15: Epoch Allocation 8,000,000 + Penalties 14,811,324 = Total 22,811,324
- 2025-06-15: Epoch Allocation 8,000,000 + Penalties 1,185,889 = Total 9,185,889
- 2025-07-15: Epoch Allocation 8,000,000 + Penalties 2,116,387 = Total 10,116,387
- 2025-08-15: Epoch Allocation 8,000,000 + Penalties 2,116,516 = Total 10,116,516
- 2025-09-15: Epoch Allocation 8,000,000 + Penalties 2,386,567 = Total 10,386,567
- 2025-10-15: Epoch Allocation 8,000,000 + Penalties 3,758,644 = Total 11,758,644
- 2025-11-15: Epoch Allocation 8,000,000 + Penalties 1,358,920 = Total 9,358,920
- 2025-12-15: Epoch Allocation 5,600,000 + Penalties 1,082,076 = Total 6,682,076
- 2026-01-15: Epoch Allocation 5,600,000 + Penalties 884,891 = Total 6,484,891
- 2026-02-15: Epoch Allocation 5,600,000 + Penalties 1,424,309 = Total 7,024,309

The May 15 penalty harvest stands out at 14.8M, almost double the epoch allocation. That spike came from the massive wave of BurnAndClaim activity before May 15: 837 claims generating 9.6M in 5% penalties, plus 189 instant unstakes adding another 5.2M in 3% penalties. After the initial burn window closed, penalty harvests settled into a steady 1-3M per month.

**Two penalty sources, one destination.** Over the full period, the penalty accounting shows >31M FAF:

- BurnAndClaim 5% fees: 10,242,564 FAF
- InstantUnstake 3% fees: 20,882,960 FAF
- **Total generated: 31,125,523 FAF**
- **Total harvested (10 WithdrawInstantFees events): 31,125,523 FAF**

Every FAF of penalty was recycled back to stakers. Nothing was burned, nothing was lost.

## 8. The Full Picture

Let's summarize. Where did 788,000,000 FAF go? Here is every token accounted for:

- BurnAndStake (entered staking): 536,938,283 FAF (68.1%). NFT burn, auto-staked.
- BurnAndClaim (left the pool): 194,608,722 FAF (24.7%). NFT burn, sent to wallet (after 5% penalty).
- BurnAndClaim penalties (recycled): 10,242,564 FAF (1.3%). 5% fee, redistributed to stakers.
- Unclaimed (returned to team): 46,210,430 FAF (5.9%). WithdrawUnclaimedTokens on Oct 15.
- **Total: 788,000,000 FAF (100%)**

The 10.2M in BurnAndClaim penalties stayed in the vault and was redistributed to stakers via the monthly reward cycle, alongside the 20.9M in InstantUnstake penalties that accumulated separately.

The 536.9M that entered via BurnAndStake did not all stay staked. Over the following months, stakers unstaked, re-staked, claimed rewards, and moved in and out of the queue. But that initial 68% chose the long-term path, and that decision built the 689M staked base that exists today.

**Where is the full 1 billion now?** FAF has a fixed supply of 1,000,000,000. Where are all of them? I pulled every non-zero FAF token account on-chain (1,827 accounts) and categorized them:

- [Staking pool](https://solscan.io/account/7tULeZXC2UyPPzHyE9BhFJmFtfNedACJrVywyWYSwzJP): 740,862,000 FAF (74.1%)
- [Team treasury](https://solscan.io/account/GzqP64zjbSQJ5MFREwMTZhvhUzfwMDVit4bPxWH52Xm) (Squads vault): 41,519,000 FAF (4.2%)
- Liquidity: [FutarchyAMM](https://solscan.io/account/Dg9okAkkXoGaj9pXdrMBbUeLtb11SpM6uwGfK59EKPm9), Meteora (25 pools), Orca (6 pools): 77,825,000 FAF (7.8%)
- Streamflow vesting (5 contracts) + vesting wallet: 45,439,000 FAF (4.5%)
- [MetaDAO multisig](https://solscan.io/account/6awyHMshBGVjJ3ozdSJdyyDE1CTAXUwrpNMaRGMsb4sf): 651,000 FAF (0.1%)
- Individual wallets (1,785 addresses): 93,702,000 FAF (9.4%)
- **Total: ~1,000,000,000 FAF (100%)**

The staking pool dominates: 74.1% of all FAF sits here. I can break this down further into 689M staked, 36M queued, and 11M unstaked (as of March 9).

The team treasury's current 42M FAF can be fully verified. Every FAF token that entered or left this account is on-chain. The full 1B was minted here at TGE, and across 49 transactions the treasury distributed it all. Two major returns topped it back up: the 46.2M FAF that NFT holders did not claim on October 15 and the 40.4M Raydium LP closure on February 15. After subtracting all outflows (original 788M staking reserve, 72.8M in epoch allocations, 54M to Streamflow for incubation vesting, 4.25M to Streamflow for advisory vesting, 70.8M to FutarchyAMM (40.3M at launch + [30.6M on March 7](https://solscan.io/tx/YnWs4Hh2dBLFYdDZi9vPub3U67eA3Kd1saz8Fk2NF63nbcq2e7AKkcA6VVLnbtUVL1dLUVRExzkPqyH4EFBViWm)), 37.7M to Raydium LP, 12M in airdrops, and [5.5M to a Streamflow airdrop distributor](https://solscan.io/tx/4YFd6GQ2Xse2caAnzSTTHSZ5mTPhcfWiWoimcwChmeH4soBWbEE79tS6vKZSooxkFC39NWLVqTmXoXGENZoZq8df) for Voltage Points rewards), the computed balance is 41,518,894, one atom off the on-chain figure. The 5.5M VP airdrop was created on July 24, 2025, coinciding with the [Epoch 4 system change](https://docs.flash.trade/flash-trade/flash-trade-protocol/tokenomics/voltage-points-and-faf-rewards-system#current-system-epoch-4) that introduced non-staker rewards; 232 traders and LPs [claimed from the distributor](https://solscan.io/account/7J8s9m1uw42VHL3U7VZvLD6Enm39YRSz5nbUZAf3Dvxs) between July and December 2025. Of the original 96M staking reward budget, 23.2M remains, roughly four more months at the current 5.6M/month rate.

The remaining 94M FAF (9.4% of supply) is spread across 1,785 individual wallets. The distribution is top-weighted: 32 wallets hold more than 1M FAF each (66M total), 64 hold between 100K and 1M (22M total), and the remaining 1,689 wallets hold less than 100K each.

---

*Read the full version of this article, including distribution metrics and validation data, on [karstenalytics.com](https://karstenalytics.com/articles/2026/03/10/faf-staker-pool-deep-dive).*
