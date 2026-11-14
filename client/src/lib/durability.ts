/**
 * Asking the browser not to throw IronPath's data away.
 *
 * Everything lives in this browser's storage, which by default is "best
 * effort": the browser is entitled to evict it when the device runs short of
 * space, and it does so without telling anyone. `navigator.storage.persist()`
 * is the one lever a site has. Chromium decides silently (installed apps and
 * frequently-used sites are granted), Safari decides silently, and Firefox
 * asks the user — which is why this is only ever called from a tap.
 *
 * It was never called at all, so every install was evictable.
 */

function manager(): StorageManager | null {
  try {
    return typeof navigator !== 'undefined' && navigator.storage ? navigator.storage : null;
  } catch {
    return null;
  }
}

/** `null` means this browser cannot say. */
export async function isStoragePersistent(): Promise<boolean | null> {
  try {
    const storage = manager();
    return storage?.persisted ? await storage.persisted() : null;
  } catch {
    return null;
  }
}

/** Returns whether storage is persistent afterwards; `null` if unknowable. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    const storage = manager();
    if (!storage?.persist) return null;
    if (storage.persisted && (await storage.persisted())) return true;
    return await storage.persist();
  } catch {
    return null;
  }
}
