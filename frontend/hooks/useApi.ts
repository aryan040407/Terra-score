"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface State<T> { data: T | null; error: string | null; loading: boolean }

/** Small SWR-style hook with in-memory cache + manual refresh. */
const cache = new Map<string, { t: number; v: unknown }>();

export function useApi<T>(key: string | null, fetcher: () => Promise<T>, opts: { ttl?: number; refreshMs?: number } = {}) {
  const { ttl = 30_000, refreshMs } = opts;
  const [state, setState] = useState<State<T>>(() => {
    const c = key ? cache.get(key) : undefined;
    return c && Date.now() - c.t < ttl ? { data: c.v as T, error: null, loading: false } : { data: null, error: null, loading: !!key };
  });
  const fetcherRef = useRef(fetcher); fetcherRef.current = fetcher;

  const load = useCallback(async (silent = false) => {
    if (!key) return;
    if (!silent) setState((s) => ({ ...s, loading: s.data === null, error: null }));
    try {
      const v = await fetcherRef.current();
      cache.set(key, { t: Date.now(), v });
      setState({ data: v, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ data: s.data, error: e instanceof Error ? e.message : "Unknown error", loading: false }));
    }
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const c = cache.get(key);
    if (c && Date.now() - c.t < ttl) setState({ data: c.v as T, error: null, loading: false });
    else load();
    if (refreshMs) { const id = setInterval(() => load(true), refreshMs); return () => clearInterval(id); }
  }, [key, load, ttl, refreshMs]);

  return { ...state, refresh: () => load(false) };
}
