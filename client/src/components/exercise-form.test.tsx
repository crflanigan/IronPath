import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExerciseForm } from './exercise-form';
import type { Exercise } from '@shared/schema';

/**
 * The "BEST" line is only meaningful when there is a previous best to compare
 * against. Exercises built in the custom workout builder carry no
 * `bestWeight`/`bestReps`, which produced an empty line reading
 * "BEST:  lbs ×  reps", and made the first set ever logged look like a
 * personal record because the baseline defaulted to zero.
 */

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    machine: 'Seated Row',
    region: 'Back',
    equipment: 'machine',
    feel: 'Medium',
    completed: false,
    sets: [{ weight: undefined, reps: undefined, rest: '', completed: false }],
    ...overrides,
  } as unknown as Exercise;
}

describe('an exercise with no recorded best', () => {
  it('does not render an empty BEST line', () => {
    render(<ExerciseForm exercise={exercise()} onUpdate={() => {}} />);
    expect(screen.queryByText(/BEST:/)).toBeNull();
  });

  it('does not call the first set you log a personal record', () => {
    render(
      <ExerciseForm
        exercise={exercise({
          sets: [{ weight: 100, reps: 10, rest: '1:00', completed: false }],
        })}
        onUpdate={() => {}}
      />,
    );
    expect(document.body.textContent).not.toContain('↑ +100');
  });
});

describe('an exercise with a recorded best', () => {
  // `personalBest` is now derived from logged workouts and passed in. It used
  // to be `bestWeight` on the exercise itself, which came from the template and
  // was the same fabricated number for everybody.
  it('still shows it', () => {
    render(
      <ExerciseForm
        exercise={exercise()}
        personalBest={{ weight: 120, reps: 8 }}
        onUpdate={() => {}}
      />,
    );
    expect(screen.getByText(/BEST:/)).toBeTruthy();
    expect(document.body.textContent).toContain('120 lbs × 8 reps');
  });

  it('still flags beating it', () => {
    render(
      <ExerciseForm
        exercise={exercise({
          sets: [{ weight: 130, reps: 8, rest: '1:00', completed: false }],
        })}
        personalBest={{ weight: 120, reps: 8 }}
        onUpdate={() => {}}
      />,
    );
    expect(document.body.textContent).toContain('↑ +10 lbs');
  });

  it('still flags falling short of it', () => {
    render(
      <ExerciseForm
        exercise={exercise({
          sets: [{ weight: 110, reps: 8, rest: '1:00', completed: false }],
        })}
        personalBest={{ weight: 120, reps: 8 }}
        onUpdate={() => {}}
      />,
    );
    expect(document.body.textContent).toContain('↓ 10 lbs');
  });
});
