---
title: Data Quality
sidebar_custom_props:
  icon: SealCheck
---

# Data Quality

Data Quality isn't just about accuracy—it's about user confidence. When every number traces to its on-chain source and survives multiple validation layers, users can trust the analytics for informed decisions. The pipeline maintains different standards through automated validation during processing and manual verification tools for deep auditing.

From my professional experience, data quality is rarely 100% perfect. So I expect to find issues going forward. This is also why I sense-check every number I see. But something might slip. Feel free to drop me a comment if you see a number that doesn't make sense to you!

---

## Automated Quality Checks

These checks run automatically during data processing to ensure data quality:

### Accuracy Checks

**Attribution Reconciliation**

The revenue attribution system automatically reconciles two independent methods:
- **Raw WSOL tracking** - Direct summation of all WSOL inflows to treasury
- **Type attribution** - SOL attributed back to originating transaction types

During processing, the system detects and logs any discrepancies. Over-attribution (negative variance) triggers an error message.

**Result**: 100% attribution accuracy.

**Ledger Persistence**

Cross-day attribution accuracy is maintained through automatic ledger carryforward:
- End-of-day ledger state saved automatically
- Next-day processing loads previous ledger
- Enables correct attribution when tokens accumulate over multiple days before swapping

**Result**: Prevents revenue loss from ATA token accumulations that span multiple days.

### Completeness Checks

**Workflow Validation**

Before data deployment, automated validation verifies:
- All exported JSON files exist and are valid
- Structure consistency across all data files
- Target date presence in all time-series data
- **Workflow aborts if validation fails** - bad data never reaches production

**Transaction Coverage**

Pipeline smoke tests verify:
- Summary files exist and are valid
- Transaction totals match across aggregation methods
- Daily transaction files exist for target dates

---

## Quality Standards

### Accuracy Standards

**Attribution Accuracy**
- Total attributed SOL must equal raw WSOL inflows exactly
- System has consistently achieved 100% accuracy against verified benchmarks
- Critical safeguards prevent accidental modifications to attribution logic

**Chronological Processing**
- Transactions processed in timestamp order to maintain correct attribution
- Ensures SwapReward conversions correctly attribute to earlier token accumulations

### Completeness Standards

**Transaction Classification**

Every transaction must be:
- **Classified** - Assigned a transaction type via log-based classification
- **Attributed** - Labeled across all dimensions (token, type, pool, wallet, time)
- **Accounted** - Either counted in realized revenue or tracked in pending ledger

Two-pass classification system (fast pass + enrichment for unknowns) ensures all transactions receive type assignments.

**Data Coverage**

All time periods must have:
- Complete transaction enumeration from monitored accounts
- All expected data files generated and validated
- No gaps in time-series data

---

## Manual Verification Tools

These tools exist for deep auditing but require manual execution:

### Verification Scripts

**Comprehensive SOL Check**
- Compares daily realized SOL against test fixtures
- Validates total realized SOL against official DefiTuna numbers
- Identifies coverage gaps and missing date ranges
- Expected output: Confirmation of 100% accuracy with zero unattributed amounts

**Daily Attribution Comparison**
- Deep-dive verification for specific dates
- Compares Simple Method vs Realized Types Method
- Shows detailed breakdown when discrepancies found
- Run manually for date-specific debugging

### Test Fixtures

Test fixtures contain manually verified benchmark data:

**Daily Realized SOL** - Contains manually verified daily totals serving as ground truth for accuracy testing.

**Daily Transaction Counts** - Expected transaction counts with acceptable tolerance for minor variations.

**Sacred Rule**: Never modify fixtures to make tests pass. Fixtures represent verified truth; code must be fixed to match fixtures.

### Cache Integrity Tests

Cache validation tools verify:
- Transaction counts against fixtures
- Acceptable tolerance for minor variations
- Pass/fail results for integration (not currently automated)

---

## Common Quality Issues

### Accuracy Issues

**Unattributed Revenue**
- **Symptom**: Discrepancy between raw tracking and type attribution
- **Causes**: SwapReward attribution errors, ledger persistence issues, missing token conversions
- **Resolution**: Review ledger carryforward and SwapReward attribution logic

**Over-Attribution**
- **Symptom**: Type attribution exceeds raw tracking (triggers ERROR log)
- **Causes**: Double-counting SwapReward transactions, including non-revenue transactions, incorrect attribution logic
- **Resolution**: Verify revenue filtering excludes non-revenue transaction types

### Completeness Issues

**Classification Gaps**
- **Symptom**: Transactions classified as "unknown"
- **Causes**: New transaction types not in configuration, protocol updates changing log patterns, missing log messages
- **Resolution**: Add new instruction patterns to transaction type configuration, reprocess affected dates

**Missing Data**
- **Symptom**: Time-series gaps, missing files, incomplete date ranges
- **Causes**: RPC failures during enumeration, transaction fetching errors, processing interruptions
- **Resolution**: Re-run data collection for affected dates, verify account monitoring coverage

---

## Continuous Improvement

As protocols evolve, the system improves through:

1. **New transaction discovery** - Unknown transaction types prompt classification rule expansion
2. **Configuration updates** - Add mappings to transaction type and pool label configurations
3. **Historical reprocessing** - Apply updated rules uniformly across all dates
4. **Verification** - Run manual scripts to confirm accuracy maintained after changes

**Why reprocessing works**: The system uses actual on-chain swap rates (facts that don't change) for conversions, so classification improvements can be applied retroactively without affecting conversion accuracy.
