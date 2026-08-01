import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Workout } from '@shared/schema';

// Count the work the day-grid memo does, by instrumenting the helper it calls
// once per cell.
const formatCalls = { n: 0 };
vi.mock('@/lib/utils', async importActual => {
  const actual = await importActual<typeof import('@/lib/utils')>();
  return {
    ...actual,
    formatLocalDate: (d: Date) => {
      formatCalls.n++;
      return actual.formatLocalDate(d);
    },
  };
});

import { CalendarGrid } from './calendar-grid';
import { formatLocalDate } from '@/lib/utils';

const props = {
  currentDate: new Date(2026, 6, 1),
  onDateChange: () => {},
  onSelectDate: () => {},
  workouts: [] as Workout[],
  selectedDate: null,
};

beforeEach(() => {
  formatCalls.n = 0;
});

describe('the day grid', () => {
  /**
   * Count day cells, excluding the seven weekday headings that share the grid.
   */
  const dayCells = (container: HTMLElement) => {
    const grid = container.querySelector('.grid-cols-7')!;
    return grid.children.length - 7;
  };

  /**
   * The grid used to pad every month to 42 cells, so it always drew six rows.
   * Most months do not need six: 19 of the 24 months in 2026-27 had a final
   * row of nothing but next-month filler, and February 2026 — starting on a
   * Sunday with 28 days — drew two. Cells are `aspect-square`, so each wasted
   * row pushed a full cell of height onto a page read on a phone.
   */
  it.each([
    { month: 'February 2026', date: new Date(2026, 1, 1), cells: 28, rows: 4 },
    { month: 'July 2026', date: new Date(2026, 6, 1), cells: 35, rows: 5 },
    { month: 'May 2026', date: new Date(2026, 4, 1), cells: 42, rows: 6 },
    { month: 'January 2027', date: new Date(2027, 0, 1), cells: 42, rows: 6 },
  ])('draws $month as $cells cells, $rows rows', ({ date, cells, rows }) => {
    const { container } = render(<CalendarGrid {...props} currentDate={date} />);

    expect(dayCells(container)).toBe(cells);
    expect(dayCells(container) / 7).toBe(rows);
  });

  it('always ends on a whole week, and never splits a month across a partial row', () => {
    for (let m = 0; m < 12; m++) {
      const { container, unmount } = render(
        <CalendarGrid {...props} currentDate={new Date(2026, m, 1)} />,
      );

      const cells = dayCells(container);
      expect(cells % 7, `month ${m + 1} does not end on a whole week`).toBe(0);

      // Every day of the month must still be present — trimming the trailing
      // row must never trim a real day.
      const daysInMonth = new Date(2026, m + 1, 0).getDate();
      const startingDayOfWeek = new Date(2026, m, 1).getDay();
      expect(cells).toBeGreaterThanOrEqual(startingDayOfWeek + daysInMonth);

      unmount();
    }
  });

  it('is not rebuilt on an unrelated re-render', () => {
    const { rerender } = render(<CalendarGrid {...props} />);
    const afterFirst = formatCalls.n;

    rerender(<CalendarGrid {...props} />);

    // The memo depended on a `new Date()` created during render, so its
    // dependency changed identity every time and it never cached anything.
    expect(formatCalls.n - afterFirst).toBe(0);
    expect(afterFirst).toBeGreaterThan(0);
  });

  it('is rebuilt when the month changes', () => {
    const { rerender } = render(<CalendarGrid {...props} />);
    const afterFirst = formatCalls.n;

    rerender(<CalendarGrid {...props} currentDate={new Date(2026, 7, 1)} />);

    expect(formatCalls.n).toBeGreaterThan(afterFirst);
  });

  // Today used to be marked with a 📅 glyph, and the teal fill it also had was
  // suppressed whenever the day happened to be selected — which it is by
  // default. Dropping the glyph therefore only works if the fill is
  // unconditional, so that is what these two assert.
  it("marks today's cell with the primary fill", () => {
    const now = new Date();
    const { container } = render(<CalendarGrid {...props} currentDate={now} />);

    const today = container.querySelector(`[data-today="true"]`);
    expect(today).not.toBeNull();
    expect(today!.className).toContain('bg-primary');
    // The base classes carry `dark:bg-gray-800`, which tailwind-merge keys
    // separately from an unprefixed `bg-primary` — so without an explicit dark
    // variant, today renders unmarked in dark mode. It did.
    expect(today!.className).toContain('dark:bg-primary');
  });

  it("keeps today's fill when today is the selected day", () => {
    const now = new Date();
    const { container } = render(
      <CalendarGrid {...props} currentDate={now} selectedDate={formatLocalDate(now)} />,
    );

    const today = container.querySelector(`[data-today="true"]`);
    expect(today!.className).toContain('bg-primary');
  });

  it('leaves days without a completed workout unmarked', () => {
    const { container } = render(<CalendarGrid {...props} />);
    expect(container.textContent).not.toContain('🕒');
    expect(container.textContent).not.toContain('📅');
  });
});
