import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkoutPage } from './workout';
import type { Workout } from '@shared/schema';

const mockUpdateWorkout = vi.fn();

vi.mock('@/hooks/use-workout-storage', () => ({
  useWorkoutStorage: () => ({ updateWorkout: mockUpdateWorkout }),
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(() => ({ id: 'toast1' })),
    dismiss: vi.fn(),
  }),
}));

vi.mock('@/components/exercise-form', () => ({
  ExerciseForm: ({ exercise, onUpdate, isActive }: any) => (
    <div>
      <p>{exercise.machine}</p>
      <button
        data-testid={`update-${exercise.machine}-${isActive ? 'active' : 'inactive'}`}
        onClick={() => onUpdate({ ...exercise, bestReps: (exercise.bestReps ?? 0) + 1 })}
      >
        update
      </button>
    </div>
  ),
}));

const baseWorkout: Workout = {
  id: 1,
  date: '2024-01-01',
  type: 'Chest Day',
  exercises: [
    {
      code: undefined,
      machine: 'Bench Press',
      equipment: 'freeweight',
      region: 'chest',
      feel: 'Medium',
      sets: [{ weight: 100, reps: 8, rest: '1:00', completed: false }],
      bestWeight: undefined,
      bestReps: undefined,
      completed: false,
    },
  ],
  abs: [{ name: 'Crunches', reps: 20, time: undefined, completed: false }],
  cardio: { type: 'Treadmill', duration: '', distance: '', completed: false },
  completed: false,
  duration: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.useFakeTimers();
  mockUpdateWorkout.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('WorkoutPage auto-save behavior', () => {
  it('does not stack autosave calls during rapid changes', async () => {
    render(<WorkoutPage workout={baseWorkout} onNavigateBack={() => {}} />);

    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByTestId('update-Bench Press-active'));
    }

    await act(async () => {
      vi.advanceTimersByTime(2200);
    });

    expect(mockUpdateWorkout).toHaveBeenCalledTimes(1);
  });

  it('cleans up pending autosave timeout on unmount', () => {
    const clearSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = render(<WorkoutPage workout={baseWorkout} onNavigateBack={() => {}} />);

    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});

describe('WorkoutPage exercise updates', () => {
  it('updates only the selected exercise when machine names are duplicated', async () => {
    const duplicateMachineWorkout: Workout = {
      ...baseWorkout,
      exercises: [
        {
          ...baseWorkout.exercises[0],
          machine: 'Dup Machine',
          bestReps: 1,
        },
        {
          ...baseWorkout.exercises[0],
          machine: 'Dup Machine',
          bestReps: 2,
        },
      ],
    };

    render(<WorkoutPage workout={duplicateMachineWorkout} onNavigateBack={() => {}} />);

    fireEvent.click(screen.getByTestId('update-Dup Machine-inactive'));
    fireEvent.click(screen.getByText('Save Workout'));

    const payload = mockUpdateWorkout.mock.calls.at(-1)?.[1];
    expect(payload.exercises[0].bestReps).toBe(1);
    expect(payload.exercises[1].bestReps).toBe(3);
  });
});
