/**
 * Small preferences about how the workout screen behaves.
 *
 * Kept beside `onboarding.ts` rather than in `storage.ts` for the same reason:
 * these are UI switches, not workout data, and reading one must never be able
 * to throw during a session.
 */

const KEYS = {
  REST_TIMER: 'ironpath_rest_timer',
  REST_TIMER_SOUND: 'ironpath_rest_timer_sound',
} as const;

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === '1';
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // The switch simply will not stick. Nothing else depends on it.
  }
}

export const restTimerEnabled = () => readFlag(KEYS.REST_TIMER, true);
export const setRestTimerEnabled = (on: boolean) => writeFlag(KEYS.REST_TIMER, on);
export const restTimerSoundEnabled = () => readFlag(KEYS.REST_TIMER_SOUND, true);
export const setRestTimerSoundEnabled = (on: boolean) => writeFlag(KEYS.REST_TIMER_SOUND, on);

/** "1:30" -> 90. Anything unreadable falls back to a minute. */
export function restSeconds(rest: string | undefined): number {
  const match = /^(\d+):(\d{1,2})$/.exec((rest ?? '').trim());
  if (!match) return 60;
  const seconds = Number(match[1]) * 60 + Number(match[2]);
  return seconds > 0 ? seconds : 60;
}

/** 90 -> "1:30". */
export function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.ceil(total));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}
