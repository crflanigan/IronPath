import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkoutPage } from './workout';
import type { Workout } from '@shared/schema';

/**
 * Progress counted a cardio block whether or not the workout had one.
 *
 * A workout with no `cardio` therefore sat permanently one item short: the bar
 * could not reach 100%, the completion celebration could not fire, and
 * "Complete Workout" refused because it required `cardio.completed` — leaving
 * no way to finish the workout at all.
 */

const mockUpdateWorkout = vi.fn();
const mockToast = vi.fn((_options: { title?: string; description?: string }) => ({
  id: 'toast1',
}));

vi.mock('@/hooks/use-workout-storage', () => ({
  useWorkoutStorage: () => ({ updateWorkout: mockUpdateWorkout }),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast, dismiss: vi.fn() }),
}));

function workout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 1,
    date: '2025-02-02',
    type: 'Chest Day',
    exercises: [
      {
        machine: 'Bench Press',
        equipment: 'freeweight',
        region: 'Chest',
        feel: 'Medium',
        sets: [{ weight: 100, reps: 8, rest: '1:00', completed: true }],
        completed: true,
      },
    ],
    abs: [],
    cardio: undefined,
    completed: false,
    duration: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Workout;
}

beforeEach(() => {
  mockUpdateWorkout.mockReset();
  mockToast.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe('a workout with no cardio block', () => {
  it('can reach 100%', () => {
    render(<WorkoutPage workout={workout()} onNavigateBack={() => {}} />);
    expect(screen.getByText('1/1 items')).toBeTruthy();
  });

  it('can actually be completed', () => {
    render(<WorkoutPage workout={workout()} onNavigateBack={() => {}} />);

    fireEvent.click(screen.getByText('Complete Workout'));

    expect(mockUpdateWorkout).toHaveBeenCalled();
    expect(mockUpdateWorkout.mock.calls.at(-1)?.[1]).toMatchObject({ completed: true });
  });

  it('does not report the workout as incomplete', () => {
    render(<WorkoutPage workout={workout()} onNavigateBack={() => {}} />);

    fireEvent.click(screen.getByText('Complete Workout'));

    const titles = mockToast.mock.calls.map(call => call[0]?.title);
    expect(titles).not.toContain('Incomplete workout');
  });
});

describe('a workout that does have a cardio block', () => {
  const withCardio = workout({
    cardio: { type: 'Treadmill', duration: '', distance: '', completed: false },
  });

  it('still counts it toward progress', () => {
    render(<WorkoutPage workout={withCardio} onNavigateBack={() => {}} />);
    expect(screen.getByText('1/2 items')).toBeTruthy();
  });

  it('still refuses to complete while cardio is outstanding', () => {
    render(<WorkoutPage workout={withCardio} onNavigateBack={() => {}} />);

    fireEvent.click(screen.getByText('Complete Workout'));

    const titles = mockToast.mock.calls.map(call => call[0]?.title);
    expect(titles).toContain('Incomplete workout');
    expect(mockUpdateWorkout).not.toHaveBeenCalled();
  });
});
