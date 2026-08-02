/**
 * Where you were on the calendar, so returning from a workout puts you back.
 *
 * Browse back two months to check what you lifted, open the session, come back
 * — and the calendar had reset to today, because the page unmounts and its
 * `useState(new Date())` runs again. Six months back meant six taps to return.
 *
 * `sessionStorage`, deliberately, not `localStorage`. Position is a property of
 * the visit, not of you: it should survive moving between screens and be gone
 * when you next open the app, because landing anywhere but today on a fresh
 * open would be worse than the problem this fixes.
 *
 * Reading on mount rather than hooking navigation means every route back is
 * covered without knowing about any of them — the in-app arrow, the browser
 * back button, and a swipe on an installed PWA all just remount the page.
 */

const KEY = 'ironpath_calendar_position';

export interface CalendarPosition {
  /** The month on screen, as YYYY-MM-01. */
  month: string;
  /** The highlighted day, as YYYY-MM-DD. */
  selectedDate: string;
}

const isMonth = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function readCalendarPosition(): CalendarPosition | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CalendarPosition>;
    if (!isMonth(parsed.month) || !isMonth(parsed.selectedDate)) return null;
    return { month: parsed.month, selectedDate: parsed.selectedDate };
  } catch {
    // A private-mode browser can refuse sessionStorage outright. Losing your
    // place is a far smaller problem than failing to render the calendar.
    return null;
  }
}

export function writeCalendarPosition(position: CalendarPosition): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(position));
  } catch {
    /* see above */
  }
}

/** Whether `date` falls in the same month as `reference` — used to hide "Today". */
export function isSameMonth(date: Date, reference: Date): boolean {
  return (
    date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth()
  );
}
