/**
 * Safe localStorage Utility
 *
 * Provides error-safe wrappers around localStorage operations to handle:
 * - Private browsing mode (localStorage unavailable)
 * - Quota exceeded errors
 * - General storage access errors
 * - Corrupted data
 *
 * All functions gracefully degrade when localStorage is unavailable.
 */

/**
 * Safely retrieves an item from localStorage
 * @param key - The localStorage key
 * @param defaultValue - Value to return if key doesn't exist or on error
 * @returns The stored value or defaultValue
 */
export function safeGetItem(key: string, defaultValue: string = ''): string {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch (error) {
    if (error instanceof DOMException) {
      // localStorage unavailable (private browsing, disabled, etc.)
      console.warn(`localStorage unavailable, cannot read key "${key}"`);
    } else {
      console.warn(`Failed to read localStorage key "${key}":`, error);
    }
    return defaultValue;
  }
}

/**
 * Safely sets an item in localStorage
 * @param key - The localStorage key
 * @param value - The value to store
 * @returns true if successful, false otherwise
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'QuotaExceededError') {
        console.error(`localStorage quota exceeded when writing key "${key}"`);
        // Optionally: Attempt to clear old data or notify user
        // Could implement LRU eviction strategy here
      } else {
        // localStorage unavailable (private browsing, disabled, etc.)
        console.warn(`localStorage unavailable, cannot write key "${key}"`);
      }
    } else {
      console.error(`Failed to write localStorage key "${key}":`, error);
    }
    return false;
  }
}

/**
 * Safely removes an item from localStorage
 * @param key - The localStorage key to remove
 * @returns true if successful, false otherwise
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Safely clears all items from localStorage
 * Use with caution - removes ALL stored data
 * @returns true if successful, false otherwise
 */
export function safeClear(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
    return false;
  }
}

/**
 * Checks if localStorage is available and working
 * @returns true if localStorage is accessible, false otherwise
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets an item and parses it as JSON
 * @param key - The localStorage key
 * @param defaultValue - Value to return if key doesn't exist, parse fails, or on error
 * @returns The parsed object or defaultValue
 */
export function safeGetJSON<T>(key: string, defaultValue: T): T {
  try {
    const value = localStorage.getItem(key);
    if (value === null) {
      return defaultValue;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn(`Failed to parse JSON from localStorage key "${key}":`, error);
    } else if (error instanceof DOMException) {
      console.warn(`localStorage unavailable, cannot read key "${key}"`);
    } else {
      console.warn(`Failed to read localStorage key "${key}":`, error);
    }
    return defaultValue;
  }
}

/**
 * Sets an item by stringifying it as JSON
 * @param key - The localStorage key
 * @param value - The value to store (will be JSON.stringified)
 * @returns true if successful, false otherwise
 */
export function safeSetJSON<T>(key: string, value: T): boolean {
  try {
    const jsonString = JSON.stringify(value);
    localStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'QuotaExceededError') {
        console.error(`localStorage quota exceeded when writing key "${key}"`);
      } else {
        console.warn(`localStorage unavailable, cannot write key "${key}"`);
      }
    } else if (error instanceof TypeError) {
      console.error(`Failed to stringify value for localStorage key "${key}":`, error);
    } else {
      console.error(`Failed to write localStorage key "${key}":`, error);
    }
    return false;
  }
}

/**
 * Gets the approximate size of localStorage in bytes
 * Useful for debugging quota issues
 * @returns Approximate size in bytes
 */
export function getLocalStorageSize(): number {
  try {
    let totalSize = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        const value = localStorage.getItem(key);
        if (value) {
          // Approximate size: key + value as UTF-16 (2 bytes per char)
          totalSize += (key.length + value.length) * 2;
        }
      }
    }
    return totalSize;
  } catch (error) {
    console.warn('Failed to calculate localStorage size:', error);
    return 0;
  }
}

/**
 * Gets a human-readable localStorage size
 * @returns Size string like "12.5 KB"
 */
export function getLocalStorageSizeFormatted(): string {
  const bytes = getLocalStorageSize();
  if (bytes === 0) return '0 B';
  const kb = bytes / 1024;
  if (kb < 1) return `${bytes} B`;
  const mb = kb / 1024;
  if (mb < 1) return `${kb.toFixed(2)} KB`;
  return `${mb.toFixed(2)} MB`;
}
