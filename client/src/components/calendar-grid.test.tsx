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

describe('the 42-cell day grid', () => {
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

  it("still marks today's cell", () => {
    const now = new Date();
    const { container } = render(<CalendarGrid {...props} currentDate={now} />);
    expect(container.textContent).toContain('📅');
  });
});
