import { useEffect, useRef, useState } from "react";

interface PolledResource<T> {
  data: T | null;
  degraded: boolean;
  lastUpdatedAt: Date | null;
}

// Poll periodicamente una risorsa e conserva l'ultimo stato noto in caso di
// errore, invece di far sparire i dati o mostrare una schermata rotta —
// comportamento richiesto da CLAUDE.md §6 per ogni componente realtime.
export function usePolledResource<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
): PolledResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const result = await fetcherRef.current();
        if (cancelled) return;
        setData(result);
        setDegraded(false);
        setLastUpdatedAt(new Date());
      } catch {
        if (cancelled) return;
        setDegraded(true);
      }
    }

    tick();
    const timer = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return { data, degraded, lastUpdatedAt };
}
