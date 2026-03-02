import pako from 'pako';

const MAX_COMPRESSED = 10 * 1024 * 1024; // 10MB
const MAX_DECOMPRESSED = 50 * 1024 * 1024; // 50MB

const inflight = new Map<string, Promise<any>>();

/**
 * Fetch and decompress a gzip-compressed JSON staker cache.
 * Concurrent and subsequent calls for the same URL share a single
 * in-flight request, so multiple hooks avoid redundant downloads
 * and decompression of the same file.
 */
export function fetchStakerCache(url: string): Promise<any> {
  const existing = inflight.get(url);
  if (existing) return existing;

  const p = (async () => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load staker cache: ${res.statusText}`);

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_COMPRESSED) {
      throw new Error(`Compressed file too large: ${(buf.byteLength / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
    }

    const str = pako.ungzip(new Uint8Array(buf), { to: 'string' });
    if (str.length > MAX_DECOMPRESSED) {
      throw new Error(`Decompressed data too large: ${(str.length / 1024 / 1024).toFixed(2)}MB (max 50MB)`);
    }

    return JSON.parse(str);
  })();

  inflight.set(url, p);
  p.catch(() => inflight.delete(url));

  return p;
}
