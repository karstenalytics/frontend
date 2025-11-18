/**
 * TypeScript definitions for GoatCounter analytics
 *
 * GoatCounter is a privacy-friendly analytics service used to track
 * page views and custom events without cookies or personal data collection.
 *
 * @see https://www.goatcounter.com/help
 */

interface GoatCounterVars {
  /** Custom path to track (defaults to current path) */
  path?: string;
  /** Title for this event/page */
  title?: string;
  /** Custom referrer */
  referrer?: string;
  /** Mark this as an event (vs page view) */
  event?: boolean;
}

interface GoatCounter {
  /** Track a page view or event */
  count: (vars: GoatCounterVars) => void;
  /** Get query parameter from current URL */
  get_query: (key: string) => string | undefined;
  /** Check if current visitor should be tracked */
  filter: () => boolean;
  /** Generate tracking URL */
  url: (vars: GoatCounterVars) => string;
}

interface Window {
  goatcounter?: GoatCounter;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

export {};
