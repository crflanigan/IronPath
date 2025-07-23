import { Workout } from '@shared/schema';
import { parseISODate, formatLocalDate } from '@/lib/utils';

export function calculateDayStreak(workouts: Workout[], streakDays: number[]): number {
  const workoutMap = new Map(workouts.map(w => [w.date, w.completed]));
  const lastCompleted = workouts
    .filter(w => w.completed)
    .map(w => parseISODate(w.date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const startDate = lastCompleted && lastCompleted > new Date() ? lastCompleted : new Date();
  let streak = 0;
  const date = new Date(startDate);

  for (let i = 0; i < 365; i++) {
    const dateString = formatLocalDate(date);
    const completed = workoutMap.get(dateString) ?? false;
    const isStreakDay = streakDays.includes(date.getDay());

    if (isStreakDay) {
      if (completed) {
        streak++;
      } else {
        break;
      }
    } else if (completed) {
      streak++;
    }

    date.setDate(date.getDate() - 1);
  }

  return streak;
}
