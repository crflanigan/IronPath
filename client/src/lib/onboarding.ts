/**
 * First-run state for the tour and the install prompt.
 *
 * Kept out of `storage.ts` on purpose. That module owns workout data and has a
 * quota-cleanup path; these are three trivial UI flags, and a failure to read
 * one should never be able to disturb anything that matters. Every accessor
 * here swallows errors and returns a safe default, because Safari in private
 * mode throws on `localStorage` access rather than returning null.
 */

const KEYS = {
  TOUR_SEEN: 'ironpath_tour_seen',
  VISITS: 'ironpath_visits',
  INSTALL_DISMISSED: 'ironpath_install_dismissed',
} as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Full or unavailable storage means the tour shows again next time. That
    // is a far better failure than an exception on boot.
  }
}

export function hasSeenTour(): boolean {
  return read(KEYS.TOUR_SEEN) === '1';
}

export function markTourSeen(): void {
  write(KEYS.TOUR_SEEN, '1');
}

/** Used by the Replay tour button in Settings. */
export function resetTour(): void {
  try {
    localStorage.removeItem(KEYS.TOUR_SEEN);
  } catch {
    // Nothing to do; the button simply will not have taken effect.
  }
}

/** Counts this page load and returns the new total. Saturates, never wraps. */
export function recordVisit(): number {
  const parsed = Number.parseInt(read(KEYS.VISITS) ?? '0', 10);
  const previous = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const next = Math.min(previous + 1, 9999);
  write(KEYS.VISITS, String(next));
  return next;
}

export function visitCount(): number {
  const parsed = Number.parseInt(read(KEYS.VISITS) ?? '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function hasDismissedInstall(): boolean {
  return read(KEYS.INSTALL_DISMISSED) === '1';
}

export function dismissInstall(): void {
  write(KEYS.INSTALL_DISMISSED, '1');
}

/** True when the app is already installed, so nothing should nag about it. */
export function isStandalone(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    // iOS predates the display-mode media query for home-screen apps.
    return (window.navigator as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/**
 * iOS offers no install API at all — `beforeinstallprompt` does not exist
 * there — so the only thing available is telling people where the button is.
 * Every iOS browser is WebKit underneath and shares the same Share-sheet flow.
 */
export function isIOS(): boolean {
  try {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    // iPadOS 13+ reports itself as a Mac; the touch points give it away.
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  } catch {
    return false;
  }
}
