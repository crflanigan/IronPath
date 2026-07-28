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
  BUILDER_TOUR_SEEN: 'ironpath_builder_tour_seen',
  TEMPLATE_TOUR_SEEN: 'ironpath_template_tour_seen',
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

export function hasSeenBuilderTour(): boolean {
  return read(KEYS.BUILDER_TOUR_SEEN) === '1';
}

export function markBuilderTourSeen(): void {
  write(KEYS.BUILDER_TOUR_SEEN, '1');
}

export function hasSeenTemplateTour(): boolean {
  return read(KEYS.TEMPLATE_TOUR_SEEN) === '1';
}

export function markTemplateTourSeen(): void {
  write(KEYS.TEMPLATE_TOUR_SEEN, '1');
}

/**
 * Used by the Replay tour button in Settings.
 *
 * Clears both tours. Someone asking to see the tour again means the whole
 * introduction, not just the part that happens on the calendar — and the
 * builder half is the part most likely to be worth a second look.
 */
export function resetTour(): void {
  try {
    localStorage.removeItem(KEYS.TOUR_SEEN);
    localStorage.removeItem(KEYS.BUILDER_TOUR_SEEN);
    localStorage.removeItem(KEYS.TEMPLATE_TOUR_SEEN);
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
 * Which browser this is, on iOS.
 *
 * Every iOS browser is WebKit underneath, and every one of them reports
 * `Safari` in its user agent — so the alternatives have to be ruled out
 * *before* concluding Safari, not after.
 *
 * This exists because the install copy used to say "tap Share in Safari's
 * toolbar" to everyone on iOS, including people reading it in Chrome, which
 * is an instruction you cannot follow without first leaving the page.
 */
export type IOSBrowser = 'safari' | 'other';

export function iosBrowser(): IOSBrowser {
  try {
    const ua = navigator.userAgent;
    // Chrome, Firefox, Edge and Opera on iOS, respectively.
    if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return 'other';
    return 'safari';
  } catch {
    return 'other';
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
