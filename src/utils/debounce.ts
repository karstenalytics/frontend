/**
 * Debounce Utility
 *
 * Delays function execution until after a specified wait period has elapsed
 * since the last time the function was invoked. Useful for rate-limiting
 * expensive operations like API calls or search queries.
 */

/**
 * Creates a debounced function that delays invoking func until after wait
 * milliseconds have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay (default: 300ms)
 * @returns A debounced version of the function
 *
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   fetchSearchResults(query);
 * }, 500);
 *
 * // Will only call fetchSearchResults once after user stops typing for 500ms
 * debouncedSearch('hello');
 * debouncedSearch('hello w');
 * debouncedSearch('hello world'); // Only this executes
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>): void {
    // Clear existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Creates a debounced function with a cancel method to abort pending invocations
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay (default: 300ms)
 * @returns A debounced function with a cancel method
 *
 * @example
 * const debouncedFetch = debounceCancelable((id: string) => {
 *   fetchData(id);
 * }, 500);
 *
 * debouncedFetch('123');
 * debouncedFetch.cancel(); // Cancels pending execution
 */
export function debounceCancelable<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (...args: Parameters<T>): void {
    // Clear existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };

  debounced.cancel = function (): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per every
 * wait milliseconds. Useful for rate-limiting events that fire rapidly.
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle (default: 300ms)
 * @returns A throttled version of the function
 *
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll event');
 * }, 100);
 *
 * window.addEventListener('scroll', throttledScroll);
 * // Will execute at most once every 100ms during rapid scrolling
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastExecuted: number = 0;

  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted;

    // If enough time has passed, execute immediately
    if (timeSinceLastExecution >= wait) {
      func(...args);
      lastExecuted = now;
      return;
    }

    // Otherwise, schedule execution for later (if not already scheduled)
    if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecuted = Date.now();
        timeoutId = null;
      }, wait - timeSinceLastExecution);
    }
  };
}
