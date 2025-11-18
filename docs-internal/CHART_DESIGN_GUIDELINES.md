# Chart Design Guidelines

This document outlines the design principles and consistency rules for charts across the DefiTuna Analytics frontend.

## Transaction Type Display Names

### Principle: One Display Name = One Visual Element

**Rule**: Transaction types with the same display name MUST be consolidated into a single visual element (bar, segment, trace, etc.) in all charts.

**Why**:
- Prevents visual clutter from technical implementation details
- Maintains consistency across different chart types
- Makes charts easier to understand for end users

**Implementation**:
1. Use the `TYPE_DISPLAY_NAMES` mapping to convert technical type names to user-friendly display names
2. Group technical types by display name BEFORE creating chart traces/segments
3. Sum values for all technical types that share the same display name
4. Create ONE trace/segment per display name (not per technical type)

**Example**:
```typescript
// ❌ WRONG: Creates separate bars for each technical type
typesList.forEach(technicalType => {
  traces.push({ name: technicalType, ... });
});

// ✅ CORRECT: Groups by display name first
displayNameGroups.forEach((technicalTypes, displayName) => {
  // Sum values for all technical types with this display name
  const totalValue = technicalTypes.reduce((sum, techType) =>
    sum + getValue(techType), 0);
  traces.push({ name: displayName, y: totalValue, ... });
});
```

### Charts Following This Pattern

- **DailyStackedBarChart** (`src/components/Dashboard/DailyStackedBarChart.tsx`)
- **PoolTypeMatrixChart** (`src/components/Dashboard/PoolTypeMatrixChart.tsx`)
- *(Add new charts here as they're created)*

## Color Coding

### Liquidation Types

**Rule**: All transaction types with display names starting with "Liquidate" use red color palette.

**Palette**:
```typescript
const redPalette = [
  'rgba(239, 68, 68, 0.8)',   // red-500
  'rgba(220, 38, 38, 0.8)',   // red-600
  'rgba(185, 28, 28, 0.8)',   // red-700
];
```

### Non-Liquidation Types

**Rule**: All other transaction types use the non-red design palette.

**Palette**:
```typescript
const nonRedPalette = [
  'rgba(0, 163, 180, 0.8)',    // teal (accent)
  'rgba(40, 95, 126, 0.8)',    // dark blue
  'rgba(26, 188, 156, 0.8)',   // turquoise
  'rgba(142, 68, 173, 0.8)',   // purple
  'rgba(44, 62, 80, 0.8)',     // dark gray
  'rgba(39, 174, 96, 0.8)',    // green
  'rgba(22, 160, 133, 0.8)',   // dark turquoise
  'rgba(41, 128, 185, 0.8)',   // blue
];
```

### Color Assignment Logic

```typescript
function getColor(displayName: string, index: number): string {
  if (displayName.startsWith('Liquidate')) {
    return redPalette[index % redPalette.length];
  }
  return nonRedPalette[index % nonRedPalette.length];
}
```

**Rule**: Types with the same display name MUST share the same color across all charts.

## Dark Mode Support

### Background Colors

**Rule**: Use `transparent` for plotly chart backgrounds to inherit from container.

```typescript
// plotlyTheme.ts
function getColors(isDark: boolean): PlotlyColors {
  return {
    bg: 'transparent',
    paper: 'transparent',
    // ...
  };
}
```

**Why**: Ensures perfect color matching with the page background, regardless of theme.

### Grid Lines

**Current Values**:
- Light mode: `#E1E7EE`
- Dark mode: `#3A4A5F`

**Rule**: Grid lines should be visible but subtle in both themes.

## Marimekko Chart Specifics

### Column Label Rotation

**Rule**: All column labels should be displayed at -45° diagonal angle for consistency.

```typescript
const annotations = poolPositions.map((poolPos) => {
  return {
    textangle: -45,
    xanchor: 'right',
    yanchor: 'top',
    // ...
  };
});
```

### Column Width Usage

**Rule**: Charts should use the full available width with no padding on left/right edges.

```typescript
xaxis: {
  range: [0, maxX],  // No padding
}
```

## Shared Components

### TYPE_DISPLAY_NAMES Mapping

**Location**: Currently duplicated in:
- `src/components/Dashboard/DailyStackedBarChart.tsx`
- `src/components/Dashboard/PoolTypeMatrixChart.tsx`

**TODO**: Extract to shared utility file (e.g., `src/utils/typeDisplayNames.ts`) to ensure consistency.

## Checklist for New Charts

When creating a new chart that displays transaction types:

- [ ] Import or define `TYPE_DISPLAY_NAMES` mapping
- [ ] Group technical types by display name
- [ ] Create one trace/segment per display name (not per technical type)
- [ ] Use consistent color palette (red for liquidations, design palette for others)
- [ ] Ensure same display name = same color across charts
- [ ] Use transparent backgrounds for dark mode compatibility
- [ ] Test in both light and dark modes
