import { useEffect } from 'react';

/**
 * Keep the screen on while `active`.
 *
 * A phone left on a bench between sets dims and locks in about thirty
 * seconds, so every set began with unlocking the phone to tick the last one.
 * The lock is released by the browser whenever the tab is hidden, so it is
 * taken again each time the page becomes visible. Unsupported browsers, and a
 * refusal (low battery mode refuses), are both simply ignored: the screen
 * behaves as it always did.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const wakeLock = (navigator as Navigator & {
      wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> };
    }).wakeLock;
    if (!wakeLock) return;

    let sentinel: { release(): Promise<void> } | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await wakeLock.request('screen');
        if (cancelled) void lock.release().catch(() => {});
        else sentinel = lock;
      } catch {
        // Refused. Nothing to do.
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', acquire);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
