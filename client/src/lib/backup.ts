import { formatLocalDate } from '@/lib/utils';

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
