import { isIOS, isStandalone } from '@/lib/onboarding';

/**
 * Chrome's install event, captured once and shared.
 *
 * `beforeinstallprompt` fires early and only fires once, so whichever
 * component happens to mount first would otherwise swallow it and every other
 * place that offers installing would silently have no button. Listening here,
 * at module scope, means the event is captured before any component renders
 * and all of them can use it.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    // Suppress Chrome's own mini-infobar so ours is the only ask.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    listeners.forEach(fn => fn());
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach(fn => fn());
  });
}

export function canPromptInstall(): boolean {
  return deferred !== null;
}

export function subscribeToInstallability(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Returns true if the browser actually showed its install dialog. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  try {
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    listeners.forEach(fn => fn());
    return true;
  } catch {
    // The browser declined to show it. Nothing useful to do, and certainly
    // nothing worth throwing over.
    return false;
  }
}

export type InstallRoute = 'none' | 'prompt' | 'ios' | 'manual';

/**
 * How this particular browser can install the app.
 *
 * `manual` is the case that made the first version of this useless: Firefox
 * and Samsung Internet install PWAs perfectly well but implement no
 * `beforeinstallprompt`, so anything keyed solely on that event shows nothing
 * at all and the user concludes it cannot be done.
 */
export function installRoute(): InstallRoute {
  if (isStandalone()) return 'none';
  if (isIOS()) return 'ios';
  if (deferred) return 'prompt';
  return 'manual';
}
