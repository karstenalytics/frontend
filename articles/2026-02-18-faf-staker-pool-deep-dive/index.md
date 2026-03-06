---
title: "Deep Dive on Flash.Trade's FAF Stake Pool"
description: I traced every FAF token from TGE reserve through NFT burns, staking, unstaking, and protocol sweeps, building a complete picture of the FAF staker pool lifecycle.
authors:
  - name: by Karsten
tags: [flash.trade, staking, FAF, supply]
---

My [other Flash.Trade article](/articles/2026/02/12/how-flash-trade-fees-reach-faf-stakers) traced the USDC fee flow from traders to FAF stakers. This article looks at the other side: the FAF tokens themselves. Where did they come from, where did they go, and can every token be accounted for? I looked at 80,000+ on-chain events to find out.

<div className="note-small" style={{fontSize: '0.85em'}}>

:::note

- This article reflects my personal understanding of Flash.Trade's on-chain mechanics, derived entirely from observing on-chain state and transaction data. Data is from mid-end February 2026. Check dashboards for live data.
- All FAF amounts are in whole tokens unless noted otherwise. On-chain values are tracked to 6 decimal places.
- The [Staking Overview](/analysis/flash-trade/staking/stake-pool-overview) dashboard shows the live version of the data discussed here.

:::

</div>

<!-- truncate -->

## 1. The TGE: How 1 Billion FAF Were Split

Flash.Trade launched [FAF](https://solscan.io/token/FAFxVxnkzZHMCodkWyoccgUNgVScqMw2mhhQBYDFjFAF) with a fixed supply of [1,000,000,000 tokens](https://docs.flash.trade/flash-trade/flash-trade-protocol/tokenomics), with a distribution plan split across five categories:

| | Category | Share | FAF | Distribution |
|---|----------|-------|-----|-------------|
| a) | First Year Staking Rewards | 9.6% | 96,000,000 | Monthly epoch allocations |
| b) | Incubation (Solana Labs) | 5.4% | 54,000,000 | Streamflow linear vesting |
| c) | Advisors | 1% | 10,000,000 | Streamflow linear vesting |
| d) | Liquidity Provision | 4% | 40,000,000 | Raydium LP |
| e) | Community (Beast NFTs + airdrops) | 80% | 800,000,000 | Direct, no vesting |

<div style={{fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-700)'}}>

Source: [Flash.Trade Tokenomics](https://docs.flash.trade/flash-trade/flash-trade-protocol/tokenomics)

</div>

This means: No VC allocation, and team compensation is not pre-allocated. It is determined by [futarchy governance](https://docs.flash.trade/flash-trade/flash-trade-protocol/tokenomics), where prediction markets guide key decisions including token parameters.

**a) Staking rewards (9.6%)** fund monthly distributions to active stakers. The team treasury sends a fixed allocation to the protocol multisig each month (8M FAF through November 2025, reduced to 5.6M from December onward), which is then deposited into the vault alongside harvested penalties. After 10 epochs, 72.8M of the 96M (75.8%) has been distributed, leaving 23.2M, roughly four more months at the current rate. [Section 7](#7-the-monthly-reward-machine) covers the full reward cycle.

**b) Incubation and c) advisors (6.4% combined)** vest linearly through [Streamflow](https://streamflow.finance/) contracts; our [Vesting Timeline](/analysis/flash-trade/staking/vesting-timeline) dashboard tracks unlock schedules, withdrawn amounts, and how much vesting recipients have re-staked. On-chain, the team treasury sent exactly 54M FAF for incubation vesting (matching the 5.4% allocation) and 4.25M for advisory contracts. The five active Streamflow contracts total 44.4M FAF; the remaining 13.8M likely sits in the intermediary funding vault or in contracts I have not yet indexed.

**d) Liquidity (4%)** went to a FAF/SOL pool on Raydium. The team deposited 37.7M FAF paired with 1,207 SOL across two tranches on April 14-15. On February 15, 2026, the LP was fully closed, returning 40.4M FAF (+7.1%) and 1,453 SOL (+20.3%) to the treasury.

**e) Community (80%)** dominates the allocation. No cliff, no vesting. Of that 800M, **788M FAF** was deposited into the staking pool as a reserve for Beast NFT holders. The remaining tokens went to airdrops: on April 19, the team treasury distributed ~12.0M FAF across 28 wallets in four tiers (771K, 429K, 343K, and 86K FAF per recipient). Only 23 of the 28 recipients ever staked their FAF, and as of this writing, 10 still hold a staking position (though one is effectively dust at ~0.004 FAF). All 23 can be looked up in the [Wallet Timeline](/analysis/flash-trade/staking/wallet-timeline).

Where did the 788M go? I traced every token on-chain. Here is the full picture in one chart:

<div id="chart" style={{position: 'relative', display: 'inline-block', width: '100%'}}>
  <img src={require('./FAF_treasury_overview.png').default} alt="FAF Staker Pool Overview" style={{width: '100%', display: 'block'}} />
  {/* Section 2: Day One - left edge, purple at full height */}
  <a href="#2-day-one-the-reserve" title="2. Day One: The Reserve" style={{
    position: 'absolute', top: '18%', left: '6%',
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.7)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, textDecoration: 'none',
    border: '2px solid rgba(255,255,255,0.8)', cursor: 'pointer',
  }}>2</a>
  {/* Section 3: Burn Window - purple shrinking, teal growing */}
  <a href="#3-the-burn-window-april---october-2025" title="3. The Burn Window" style={{
    position: 'absolute', top: '42%', left: '26%',
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.7)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, textDecoration: 'none',
    border: '2px solid rgba(255,255,255,0.8)', cursor: 'pointer',
  }}>3</a>
  {/* Section 4: Growth Phase - teal climbing toward ATH */}
  <a href="#4-growth-phase" title="4. Growth Phase" style={{
    position: 'absolute', top: '40%', left: '43%',
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'rgba(94, 234, 212, 0.7)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, textDecoration: 'none',
    border: '2px solid rgba(255,255,255,0.8)', cursor: 'pointer',
  }}>4</a>
  {/* Section 5: Unstake Queue - orange/gray bands appearing */}
  <a href="#5-the-unstake-queue" title="5. The Unstake Queue" style={{
    position: 'absolute', top: '36%', left: '50%',
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'rgba(251, 191, 36, 0.7)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, textDecoration: 'none',
    border: '2px solid rgba(255,255,255,0.8)', cursor: 'pointer',
  }}>5</a>
  {/* Oct 15 Deadline - purple cliff drops to zero (subsection of 3) */}
  <a href="#the-deadline-october-15-2025" title="The Deadline: October 15" style={{
    position: 'absolute', top: '29%', left: '61%',
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.7)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, textDecoration: 'none',
    border: '2px solid rgba(255,255,255,0.8)', cursor: 'pointer',
  }}>3</a>
  {/* Section 6: Epoch 10 Shift - right edge, orange collapse */}
  <a href="#the-epoch-10-shift-february-15-2026" title="6. The Epoch 10 Shift" style={{
    position: 'absolute', top: '32%', left: '96%',
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'rgba(251, 191, 36, 0.7)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, textDecoration: 'none',
    border: '2px solid rgba(255,255,255,0.8)', cursor: 'pointer',
  }}>6</a>
  {/* Section 7: Monthly Reward Machine - Dec 2025 slope upwards */}
  <a href="#7-the-monthly-reward-machine" title="7. The Monthly Reward Machine" style={{
    position: 'absolute', top: '35%', left: '75%',
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'rgba(94, 234, 212, 0.7)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 700, textDecoration: 'none',
    border: '2px solid rgba(255,255,255,0.8)', cursor: 'pointer',
  }}>7</a>
</div>

<div style={{fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-700)'}}>

Source: [Staking Overview](/analysis/flash-trade/staking/stake-pool-overview) dashboard. Numbered bubbles link to the corresponding section below - you can click it! Screenshot date: February 22, 2026

</div>

The chart shows four colored areas stacked on top of each other. Each represents a bucket of FAF tokens inside the staking pool that I defined:

- **Purple (Reserved):** FAF allocated to specific recipients but not yet distributed. Initially the 788M earmarked for Beast NFT holders; three events drain it: `burn_and_stake` (NFT burn, FAF auto-staked), `burn_and_claim` (NFT burn, FAF sent to wallet minus 5% penalty), and `withdraw_unclaimed_tokens` (protocol sweeps remaining reserve after the claim window closes). Penalty fees from `burn_and_claim` (5%) and instant unstakes (3%) flow back into this bucket, earmarked for redistribution to stakers, until the multisig harvests them via `withdraw_instant_fees` and re-deposits them as staking rewards.
- **Teal (Staked):** FAF actively staked and earning rewards. This is the area that grows as NFT holders burn-and-stake (and additional FAF bought on the open market is staked).
- **Orange (Queued):** FAF in the unstake queue, waiting to leave. Before Epoch 10 (February 15, 2026), this was a 30-day cliff: tokens were locked for 30 days, then fully withdrawable. After Epoch 10, the queue was replaced by a 90-day linear vesting schedule where 1/90th of the amount matures each day.
- **Gray (Unstaked):** FAF that has matured from the queue and is ready for withdrawal. Once a user calls `withdraw_token`, the FAF leaves the staking pool entirely and vanishes from the chart. It only reappears if the user deposits and stakes it again via `deposit_token_stake`.

The numbered annotations on the chart mark the sections below. Each section zooms into one phase of the timeline. Lets walk through!

## 2. Day One: The Reserve

On April 12, 2025, the protocol multisig [deposited 788M FAF](https://solscan.io/tx/2czaHJEzymum4Ztatj227GNjJJwNubsENrh6cfuwfdVdZFCJ8Sueik2cYxE1D6Jj8QxNMWA2AuQQitmymd2kGFeD) into the staking pool (none of it was staked). The entire amount sat in a virtual "reserved" bucket (this is my wording, not Flash.Trade's) inside the accounts on-chain state, earmarked for Beast NFT holders who would later burn their NFTs to claim an allocation. The reserved FAF was dormant: it did not earn rewards, did not count toward the staked supply, and could not be withdrawn by anyone except the NFT holders. It existed solely as a distribution pool waiting to be claimed.

On Day One the chart is almost entirely purple: 788M reserved, 0 staked, 0 queued. That is 78.8% of the entire FAF supply sitting there, waiting for NFT holders to decide its fate.

The wait was short. Within the first week, NFT holders claimed 615M of the 788M reserve (78%). The biggest single day was April 14, when the reserved bucket dropped from 788M to 302M as nearly half a billion FAF moved into staking in a single day. By April 18, only 173M remained in the reserve.

<div style={{fontSize: '0.8rem'}}><a href="#chart">Back to chart</a></div>

## 3. The Burn Window (April - October 2025)

NFT holders could claim their FAF allocation via two paths, but the choice came with consequences:

| Path | What happens | Penalty | Result |
|------|-------------|---------|--------|
| **BurnAndStake** | Burn NFT, FAF auto-staked | None | Tokens stay in the pool earning rewards |
| **BurnAndClaim** | Burn NFT, FAF sent to wallet | **5%** | Tokens leave the pool entirely |

The 5% BurnAndClaim penalty was a deliberate incentive: keep your FAF staked, or pay for liquidity. Most holders chose staking.

### The numbers tell the story

Over 4,325 burn events across the six-month window, the split was decisive:

| Path | Events | FAF Distributed | Share |
|------|--------|----------------|-------|
| BurnAndStake | 3,397 | 536,938,283 | **73.4%** |
| BurnAndClaim | 928 | 194,608,722 (received) | **26.6%** |
| **Total** | **4,325** | **731,547,005** | |

The BurnAndClaim recipients actually had allocations totaling 204.9M FAF, but they received only 194.6M after the 5% penalty. The 10.2M difference stayed in the staking vault, quietly accumulating for later redistribution (more on this in [section 7](#7-the-monthly-reward-machine)).

Activity was heaviest in April, the month of TGE: 3,585 burns accounting for 88% of all distributed FAF. On April 14 alone, staked FAF jumped from 37,000 to 315 million, nearly the entire first wave of BurnAndStake in a single day. By October, only a trickle of stragglers remained.

The batch-burn pattern is worth noting: 1,298 of 2,099 BurnAndStake transactions contained *two* burn instructions, with holders burning multiple NFTs in a single Solana transaction.

### The deadline: October 15, 2025 {#the-deadline-october-15-2025}

The TGE claim window closed, and October 15 was the busiest day for the multisig. Four operations executed in sequence:

1. **WithdrawInstantFees**: harvest 3.76M in accumulated penalties
2. **DistributeTokenReward**: redistribute 11.76M (8M allocation + 3.76M penalties)
3. **WithdrawUnclaimedTokens**: sweep the remaining 46.2M unclaimed FAF from the reserve
4. The unclaimed tokens were **returned to the team treasury** (not burned)

My data confirms the cliff: the reserved bucket dropped from 50.9M on October 14 to zero on October 15. The 46.2M FAF that was never claimed by NFT holders, roughly 5.9% of the original 788M reserve, was returned to the team treasury.

<div style={{fontSize: '0.8rem'}}><a href="#chart">Back to chart</a></div>

## 4. Growth Phase

The teal area does not grow from `burn_and_stake` alone. NFT holders steadily converted their claims into staked FAF, but a larger source of growth came from direct deposits via `deposit_token_stake`: users who acquired FAF on the open market (or received it via `burn_and_claim`) and chose to stake it.

Over the full period, the cumulative inflows into staking tell a clear story:

| Source | Events | Cumulative FAF Staked |
|--------|--------|-----------|
| `burn_and_stake` (from reserve) | 3,397 | 537M |
| `deposit_token_stake` (from outside) | 12,849 | 1,258M |

These are lifetime totals, not the current balance: FAF that was staked, unstaked, and re-staked counts each time. The 1,258M from outside deposits potentially includes FAF that cycled through the pool multiple times. Still, outside deposits contributed **2.3x more staked FAF** than the reserve burns, showing that the staking pool attracted far more capital than the initial NFT allocation alone.

<div style={{fontSize: '0.8rem'}}><a href="#chart">Back to chart</a></div>

## 5. The Unstake Queue

FAF price climbed steadily from $0.0012 at its May low to a peak of **$0.0123 on September 21**, a 10x move in four months. As the price rose through August and September, some stakers wanted to begin taking profits: the orange (queued) band on the chart starts growing visibly around this time, as `unstake_token_request` activity picked up. After the September peak, the price dropped sharply to $0.0068 by September 25, and staked FAF fell from 701M to 643M as more holders moved tokens into the queue.

Stakers who want to leave have two paths: wait or pay. The queue path (`unstake_token_request` followed by `withdraw_token` after 30 days) is free but slow. The instant path (`unstake_token_instant`) skips the wait but costs a 3% penalty. A third instruction, `cancel_unstake_token_request`, lets stakers change their mind and return queued tokens to staking (LIFO order).

| Instruction | What happens | Cost |
|-------------|-------------|------|
| `unstake_token_request` | Tokens enter the 30-day queue | None, but locked |
| `withdraw_token` | Matured tokens leave the pool | None |
| `cancel_unstake_token_request` | Queued tokens return to staking (LIFO) | None |
| `unstake_token_instant` | Tokens leave immediately | **3% penalty** |

### The impatience tax

The 3% instant unstake penalty creates an interesting dynamic. When someone pays 3% to skip the 30-day wait, those penalty tokens do not disappear. They accumulate inside the vault, waiting to be recycled.

Over the protocol's lifetime, 2,316 instant unstakes moved 808M FAF out of staking, generating **20.9M FAF in penalties**, all of which flowed back to remaining stakers as rewards. FAF stakers rejoice.

The orange band on the chart is most visible around September-October 2025, when a wave of unstake requests temporarily pushed the queued balance above 20M FAF. Some of those requests were later cancelled, while others matured and transitioned into the gray (unstaked/withdrawable) band.

<div style={{fontSize: '0.8rem'}}><a href="#chart">Back to chart</a></div>

## 6. The Epoch 10 Shift (February 15, 2026) {#the-epoch-10-shift-february-15-2026}

Staked FAF hit its all-time high of **737M on February 9, 2026**. Six days later, staked amount went south.

### The pre-epoch rush

In the days before Epoch 10, stakers who wanted out rushed to enter the old 30-day queue before the rules switched to 90-day vesting. Between February 9 and 14, staked FAF dropped from 737M to 670M as 64M entered the queue. On February 14 alone, 14 delayed unstake requests moved 42M FAF into the queue, the single largest day of queue entries in the protocol's history.

### Rollover day

On February 15, the epoch rolled over. Three things happened simultaneously:

1. **All existing queue entries matured instantly.** The 69M FAF sitting in the 30-day queue became immediately withdrawable. The orange band collapsed from 69M to 3.3M (new entries under the 90-day regime).
2. **Massive outflow.** 97M FAF was withdrawn from the pool that day, the largest single-day outflow ever.
3. **Partial re-staking.** 63M FAF was staked on the same day, as some holders re-staked their matured tokens and the monthly `distribute_token_reward` added 7M in rewards.

The net effect: staked FAF recovered from 670M to 684M, but total FAF in the pool dropped from 748M to 714M. Over 33M FAF left the staking pool permanently.

### The new regime

As of February 22, the pool has stabilized: **687M staked**, 10.7M queued, 10.8M unstaked. Staked FAF remains 50M below the February 9 ATH (a 6.8% decline) and has not yet recovered.

<div style={{fontSize: '0.8rem'}}><a href="#chart">Back to chart</a></div>

## 7. The Monthly Reward Machine

The 96M staking rewards from the [TGE allocation](#1-the-tge-how-1-billion-faf-were-split) fund a monthly distribution cycle ("Epoch Rewards"). Every month on the 15th, a three-step process recycles penalties and distributes fresh rewards:

1. **Team allocation arrives**: The team treasury sends a fixed monthly allocation to the protocol multisig (8M FAF through November 2025, reduced to 5.6M from December onward)
2. **Penalties are harvested**: `WithdrawInstantFees` pulls all accumulated penalties from the staker pool, both the 3% instant unstake fees and the 5% BurnAndClaim fees
3. **Combined redistribution**: The multisig deposits the combined total back into the staker pool via `DistributeTokenReward`, where it is distributed proportionally to all active stakers

### Penalty recycling over time

| Epoch Date | Epoch Allocation | Penalties Harvested | Total Redistributed |
|------------|-----------------|--------------------|--------------------|
| 2025-05-15 | 8,000,000 | 14,811,324 | 22,811,324 |
| 2025-06-15 | 8,000,000 | 1,185,889 | 9,185,889 |
| 2025-07-15 | 8,000,000 | 2,116,387 | 10,116,387 |
| 2025-08-15 | 8,000,000 | 2,116,516 | 10,116,516 |
| 2025-09-15 | 8,000,000 | 2,386,567 | 10,386,567 |
| 2025-10-15 | 8,000,000 | 3,758,644 | 11,758,644 |
| 2025-11-15 | 8,000,000 | 1,358,920 | 9,358,920 |
| 2025-12-15 | 5,600,000 | 1,082,076 | 6,682,076 |
| 2026-01-15 | 5,600,000 | 884,891 | 6,484,891 |
| 2026-02-15 | 5,600,000 | 1,424,309 | 7,024,309 |

The May 15 penalty harvest stands out at 14.8M, almost double the epoch allocation. That spike came from the massive wave of BurnAndClaim activity before May 15: 837 claims generating 9.6M in 5% penalties, plus 189 instant unstakes adding another 5.2M in 3% penalties. After the initial burn window closed, penalty harvests settled into a steady 1-3M per month.

### Two penalty sources, one destination

Over the full period, the penalty accounting shows >31M FAF:

| Source | Total Penalties |
|--------|----------------|
| BurnAndClaim 5% fees | 10,242,564 FAF |
| InstantUnstake 3% fees | 20,882,960 FAF |
| **Total generated** | **31,125,523 FAF** |
| **Total harvested (10 WithdrawInstantFees events)** | **31,125,523 FAF** |

Every FAF of penalty was recycled back to stakers. Nothing was burned, nothing was lost.

<div style={{fontSize: '0.8rem'}}><a href="#chart">Back to chart</a></div>

## 8. The Full Picture

Let's summarize a bit. First - where did 788,000,000 FAF go? Here is every token accounted for:

| Destination | FAF | Share | Mechanism |
|-------------|-----|-------|-----------|
| BurnAndStake (entered staking) | 536,938,283 | 68.1% | NFT burn, auto-staked |
| BurnAndClaim (left the pool) | 194,608,722 | 24.7% | NFT burn, sent to wallet (after 5% penalty) |
| BurnAndClaim penalties (recycled) | 10,242,564 | 1.3% | 5% fee, redistributed to stakers |
| Unclaimed (returned to team) | 46,210,430 | 5.9% | WithdrawUnclaimedTokens on Oct 15 |
| **Total** | **788,000,000** | **100%** | |

The 10.2M in BurnAndClaim penalties stayed in the vault and was redistributed to stakers via the [monthly reward cycle](#7-the-monthly-reward-machine), alongside the 20.9M in InstantUnstake penalties that accumulated separately.

The 536.9M that entered via BurnAndStake did not all stay staked. Over the following months, stakers unstaked, re-staked, claimed rewards, and moved in and out of the queue. But that initial 68% chose the long-term path, and that decision built the 687M staked base that exists today.

### Where is the full 1 billion now?

Okay, okay, let's do the full work. FAF has a fixed supply of 1,000,000,000. Where are all of them? I pulled every non-zero FAF token account on-chain (1,801 accounts) and categorized them:

| Location | FAF | Share |
|----------|-----|-------|
| [Staking pool](https://solscan.io/account/7tULeZXC2UyPPzHyE9BhFJmFtfNedACJrVywyWYSwzJP) | 713,813,540 | 71.4% |
| [Team treasury](https://solscan.io/account/GzqP64zjbSQJ5MFREwMTZhvhUzfwMDVit4bPxWH52Xm) (Squads vault) | 72,071,418 | 7.2% |
| Liquidity: [FutarchyAMM](https://solscan.io/account/Dg9okAkkXoGaj9pXdrMBbUeLtb11SpM6uwGfK59EKPm9), Meteora (7 pools), Orca | 50,528,000 | 5.1% |
| Streamflow vesting (5 contracts) + vesting wallet | 40,871,000 | 4.1% |
| [MetaDAO multisig](https://solscan.io/account/6awyHMshBGVjJ3ozdSJdyyDE1CTAXUwrpNMaRGMsb4sf) | 591,000 | 0.1% |
| Individual wallets (1,782 addresses) | 122,123,000 | 12.2% |
| **Total** | **~1,000,000,000** | **100%** |

The staking pool dominates: 71.4% of all FAF sits here. We can break this down further into 687M staked, 10.7M queued, and 10.8M unstaked (as of February 22). Note that the ~5M difference between the cache total and the live on-chain balance reflects a few days activity after the last cache update.

The team treasury's current 72M FAF can be fully verified. Every FAF token that entered or left this account is on-chain. The full 1B was minted here at TGE, and across 47 transactions the treasury distributed it all. Two major returns topped it back up: the 46.2M FAF that NFT holders did not claim on October 15 and the 40.4M Raydium LP closure on February 15. After subtracting all outflows (original 788M staking reserve, 72.8M in epoch allocations, 58.3M to Streamflow, 40.3M to FutarchyAMM, 37.7M to Raydium LP, 12M in airdrops, and 5.5M in direct wallet allocations), the computed balance is 72,071,417, one atom off the on-chain figure. Of the original 96M staking reward budget, 23.2M remains, roughly four more months at the current 5.6M/month rate.

The remaining 122M FAF (12.2% of supply) is spread across 1,782 individual wallets. The distribution is top-weighted: 35 wallets hold more than 1M FAF each (96M total), 63 hold between 100K and 1M (21M total), and the remaining 1,684 wallets hold less than 100K each.

<details>
<summary>Distribution metrics for 1,782 individual wallets</summary>

**Concentration ratios** (share of the 122M free float):

| Top N wallets | FAF held | Share |
|---------------|----------|-------|
| Top 10 | 50,805,000 | 41.6% |
| Top 25 | 83,991,000 | 68.8% |
| Top 50 | 106,346,000 | 87.1% |
| Top 100 | 116,958,000 | 95.8% |

**Gini coefficient: 0.97** (0 = perfectly equal, 1 = maximally concentrated). For reference, Bitcoin's holder Gini is typically estimated around 0.99, and most DeFi governance tokens fall in the 0.95-0.99 range.

**Mean vs median:**

| Metric | Value |
|--------|-------|
| Mean holding | 68,531 FAF |
| Median holding | 24 FAF |
| Mean/median ratio | 2,829x |

The median holder owns 24 FAF (less than $1 at current prices), while the mean is inflated by a handful of large wallets. Half of all wallets hold less than 25 FAF, and 75% hold less than 1,000.

</details>

<details>
<summary>Validation against official reports (5 of 10 months within 0.1%)</summary>

I validated my on-chain data against Flash.Trade's official monthly protocol reports ([docs](https://docs.flash.trade/flash-trade/resources/monthly-protocol-reports), [Notion](https://flash-trade.notion.site/1df1d77c7290809280a0fcd6df397aed?v=1df1d77c7290802f90bf000cd62d99cb)), comparing end-of-month staked balances:

<div style={{fontSize: '0.75em'}}>

| Report | Official Staked FAF | My Data (month-end) | Diff |
|--------|-------------------|----------|------|
| April 2025 | 459,382,818 | 476,969,891 | +3.8% |
| May 2025 | 532,975,618 | 496,136,467 | -6.9% |
| June 2025 | 616,294,303 | 616,342,446 | +0.008% |
| July 2025 | 686,240,201 | 683,925,116 | -0.34% |
| August 2025 | 692,470,000 | 696,737,862 | +0.62% |
| September 2025 | 643,440,000 | 643,752,383 | +0.05% |
| October 2025 | 657,380,000 | 657,222,193 | -0.02% |
| November 2025 | 683,106,758 | 682,933,644 | -0.03% |
| December 2025 | 712,876,743 | 712,541,149 | -0.05% |
| January 2026 | 732,826,209 | 727,877,251 | -0.68% |

</div>

Five of ten months match within 0.1%. The larger deviations in April, May, July, August, and January may be explained by the reports capturing a snapshot at compilation time rather than at strict month-end: for example, the April report's official figure matches my April 24 data to the atom, and the May report's figure aligns closely with my June 2 data.

</details>

---

*All data sourced from on-chain transactions on Solana mainnet. The live data powers the [Staking Overview](/analysis/flash-trade/staking/stake-pool-overview) dashboard, updated daily. Data used in this article covers April 12, 2025 through February 22, 2026. Holder snapshot pulled via Helius DAS API on February 24, 2026.*
