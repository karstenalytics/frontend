/**
 * Shared chart color palette and rank-based color assignment.
 *
 * Colors are assigned by revenue rank so charts stay consistent without
 * hardcoded per-entity color maps.  The same ordered input always produces
 * the same color mapping.
 */

// 16 visually distinct colors ordered for maximum contrast between adjacent ranks.
export const CHART_PALETTE: string[] = [
  '#00A3B4', // teal
  '#E8A317', // gold
  '#4ECDC4', // cyan
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#3498DB', // blue
  '#E67E22', // amber
  '#DDA0DD', // plum
  '#98D8C8', // mint
  '#FFEAA7', // yellow
  '#1ABC9C', // turquoise
  '#9B59B6', // purple
  '#2ECC71', // green
  '#E74C3C', // dark red
  '#A0AEC0', // slate
  '#2C3E50', // dark blue-gray
];

// Red shades for liquidation / risk-related types.
export const RED_PALETTE: string[] = [
  '#EF4444', // red-500
  '#DC2626', // red-600
  '#B91C1C', // red-700
];

// Fixed gray for any "Others" aggregation bucket.
export const OTHERS_COLOR = '#6B7280';

/**
 * Build a name-to-color map from a revenue-ranked list of entity names.
 *
 * @param rankedNames  Names sorted by total value (descending).
 * @param othersKey    Name used for the "Others" bucket (gets OTHERS_COLOR).
 *                     Defaults to `'Others'`.
 * @param isRed        Optional predicate. Names matching this get RED_PALETTE
 *                     colors (e.g. liquidation types).
 * @returns Record mapping each name to a hex color string.
 */
export function buildColorMap(
  rankedNames: string[],
  othersKey = 'Others',
  isRed?: (name: string) => boolean,
): Record<string, string> {
  const map: Record<string, string> = {};
  let paletteIdx = 0;
  let redIdx = 0;
  for (const name of rankedNames) {
    if (name === othersKey) {
      map[name] = OTHERS_COLOR;
    } else if (isRed?.(name)) {
      map[name] = RED_PALETTE[redIdx % RED_PALETTE.length];
      redIdx++;
    } else {
      map[name] = CHART_PALETTE[paletteIdx % CHART_PALETTE.length];
      paletteIdx++;
    }
  }
  return map;
}
