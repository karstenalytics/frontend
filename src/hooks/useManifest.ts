import { useState, useEffect } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

// Module-level cache to prevent re-fetching on component remounts
let cachedTimestamp: string | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

export function useManifest(): string {
  const manifestPath = useBaseUrl('/data/_manifest.json');

  const [timestamp, setTimestamp] = useState<string>(cachedTimestamp || '');

  useEffect(() => {
    // If we already have cached timestamp, use it immediately
    if (cachedTimestamp) {
      setTimestamp(cachedTimestamp);
      return;
    }

    // If data is currently being loaded by another component instance, wait for it
    if (isLoading && loadPromise) {
      loadPromise.then(() => {
        if (cachedTimestamp) {
          setTimestamp(cachedTimestamp);
        }
      });
      return;
    }

    // Start loading data
    const loadData = async () => {
      try {
        isLoading = true;
        const response = await fetch(manifestPath);
        const data = await response.json();

        if (data && data.generated_at) {
          const date = new Date(data.generated_at);
          // Format as YYYY-MM-DD only (date without time)
          const formatted = date.toISOString().slice(0, 10);
          cachedTimestamp = formatted;
          setTimestamp(formatted);
        }
      } catch (error) {
        console.warn('Failed to load manifest:', error);
        setTimestamp('');
      } finally {
        isLoading = false;
      }
    };

    loadPromise = loadData();
  }, []);

  return timestamp;
}
