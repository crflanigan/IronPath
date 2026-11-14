import { formatLocalDate } from '@/lib/utils';
import { isIOS } from '@/lib/onboarding';
import { localWorkoutStorage } from '@/lib/storage';
import { requestPersistentStorage } from '@/lib/durability';

/** Filename for a backup taken now, e.g. ironpath-backup-2026-07-25.json */
export function backupFilename(now: Date = new Date()): string {
  return `ironpath-backup-${formatLocalDate(now)}.json`;
}

/** Trigger a download of `data` as formatted JSON. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type BackupOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Hand a backup file to the user, by whichever route this device does well.
 *
 * On iOS that is the share sheet. A blob download from an installed
 * home-screen app has nowhere obvious to go, whereas the share sheet offers
 * Save to Files — which for most people is iCloud Drive, i.e. an off-device
 * copy with no account of ours involved. Everywhere else a plain download is
 * the better experience, and it is also the fallback whenever sharing is
 * unavailable or refuses.
 */
export async function deliverBackup(filename: string, data: unknown): Promise<BackupOutcome> {
  if (isIOS() && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    try {
      const file = new File([JSON.stringify(data, null, 2)], filename, {
        type: 'application/json',
      });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'IronPath backup' });
        return 'shared';
      }
    } catch (error) {
      // Closing the sheet is a decision, not a failure — and not a backup.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Anything else: fall through to the download.
    }
  }
  downloadJson(filename, data);
  return 'downloaded';
}

/**
 * Export everything and note that it happened.
 *
 * The one entry point for "back up now", so Settings, the reminder and the
 * crash screen cannot drift apart on what counts as a backup.
 */
export async function backUpNow(): Promise<BackupOutcome> {
  let data: unknown;
  try {
    data = await localWorkoutStorage.exportData();
  } catch {
    // Whatever broke the validated export must not stand between someone and
    // their data. Restore validates on the way back in.
    data = localWorkoutStorage.exportDataUnvalidated();
  }
  const outcome = await deliverBackup(backupFilename(), data);
  if (outcome !== 'cancelled') {
    localWorkoutStorage.recordBackup();
    // A tap is the right moment to ask: Firefox shows a prompt for this.
    void requestPersistentStorage();
  }
  return outcome;
}

/** "today", "yesterday", "12 days ago", then a plain date. */
export function describeAge(then: Date, now: Date = new Date()): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  return then.toLocaleDateString();
}

/**
 * Read and parse a user-selected JSON file.
 *
 * Rejects with a message worth showing rather than a raw SyntaxError, since
 * the most likely cause is picking the wrong file.
 */
export async function readJsonFile(file: File): Promise<unknown> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new Error("That file couldn't be read.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("That doesn't look like a JSON backup file.");
  }
}

/** One-line description of what a backup contains, for the confirm step. */
export function describeBackup(data: unknown): string {
  const backup = data as {
    workouts?: unknown[];
    customTemplates?: unknown[];
    exportedAt?: string;
  } | null;

  const workouts = Array.isArray(backup?.workouts) ? backup!.workouts.length : 0;
  const templates = Array.isArray(backup?.customTemplates) ? backup!.customTemplates.length : 0;

  const parts = [
    `${workouts} ${workouts === 1 ? 'workout' : 'workouts'}`,
    `${templates} custom ${templates === 1 ? 'template' : 'templates'}`,
  ];

  if (backup?.exportedAt) {
    const when = new Date(backup.exportedAt);
    if (!Number.isNaN(when.getTime())) {
      parts.push(`saved ${when.toLocaleDateString()}`);
    }
  }

  return parts.join(', ');
}
