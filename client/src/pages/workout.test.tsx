import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkoutPage } from './workout';
import { Workout } from '@shared/schema';

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
      completed: false
    }
  ],
  abs: [
    { name: 'Crunches', reps: 20, time: undefined, completed: false }
  ],
  cardio: { type: 'Treadmill', duration: '', distance: '', completed: false },
  completed: false,
  duration: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

vi.mock('@/hooks/use-workout-storage', () => {
  const mockUpdateWorkout = vi.fn();
  return {
    useWorkoutStorage: () => ({ updateWorkout: mockUpdateWorkout })
  };
});

vi.mock('@/hooks/use-toast', () => {
  return {
    useToast: () => ({
      toast: vi.fn(() => ({ id: 'toast1' })),
      dismiss: vi.fn(),
    }),
  };
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('Workout Auto-Save Memory Leak Fix', () => {

  it('should not stack multiple timeouts during rapid state changes', async () => {
    const { rerender } = render(
      <WorkoutPage workout={baseWorkout} onNavigateBack={() => {}} />
    );

    for (let i = 0; i < 5; i++) {
      const updated = { ...baseWorkout, duration: i };
      rerender(<WorkoutPage workout={updated} onNavigateBack={() => {}} />);
    }

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const { useWorkoutStorage } = await import('@/hooks/use-workout-storage');
    expect(useWorkoutStorage().updateWorkout).toHaveBeenCalledTimes(1);
  });

  it('should cleanup timeout on component unmount', () => {
    const clearSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = render(
      <WorkoutPage workout={baseWorkout} onNavigateBack={() => {}} />
    );
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('should handle handleSave dependency changes correctly', async () => {
    const workout2 = { ...baseWorkout, id: 2 };
    const { rerender } = render(
      <WorkoutPage workout={baseWorkout} onNavigateBack={() => {}} />
    );
    rerender(<WorkoutPage workout={workout2} onNavigateBack={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const { useWorkoutStorage } = await import('@/hooks/use-workout-storage');
    expect(useWorkoutStorage().updateWorkout).toHaveBeenCalledWith(workout2.id, expect.anything());
  });
});

describe('Auto-Save Integration', () => {
  it('should save workout data after 2 seconds of inactivity', async () => {
    const { useWorkoutStorage } = await import('@/hooks/use-workout-storage');
    const mockStorage = useWorkoutStorage();

    render(<WorkoutPage workout={baseWorkout} onNavigateBack={() => {}} />);

    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '100' } });

    await waitFor(() => {
      expect(mockStorage.updateWorkout).toHaveBeenCalled();
    }, { timeout: 2500 });
  });

  it('should not save during rapid changes until user stops', async () => {
    const { useWorkoutStorage } = await import('@/hooks/use-workout-storage');
    const mockStorage = useWorkoutStorage();

    render(<WorkoutPage workout={baseWorkout} onNavigateBack={() => {}} />);

    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '100' } });
    await new Promise(r => setTimeout(r, 500));
    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '110' } });
    await new Promise(r => setTimeout(r, 500));
    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '120' } });

    expect(mockStorage.updateWorkout).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockStorage.updateWorkout).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });
  });
});

describe('Memory Leak Prevention', () => {
  it('should maintain stable memory usage during extended sessions', async () => {
    render(<WorkoutPage workout={baseWorkout} onNavigateBack={() => {}} />);

    for (let i = 0; i < 100; i++) {
      act(() => {
        fireEvent.change(screen.getByLabelText('Weight'), { target: { value: `${i}` } });
      });
    }

    expect(setTimeout).toHaveBeenCalledTimes(100);
    expect(clearTimeout).toHaveBeenCalledTimes(99);
  });

  it('should handle component unmount gracefully', () => {
    const { unmount } = render(<WorkoutPage workout={baseWorkout} onNavigateBack={() => {}} />);
    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '100' } });
    unmount();
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }).not.toThrow();
  });
});
