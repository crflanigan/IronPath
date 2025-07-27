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

export function calculateTopDayStreak(workouts: Workout[], streakDays: number[]): number {
  if (workouts.length === 0) return 0;

  const workoutMap = new Map(workouts.map(w => [w.date, w.completed]));
  const sortedDates = workouts
    .map(w => parseISODate(w.date))
    .sort((a, b) => a.getTime() - b.getTime());

  const startDate = sortedDates[0];
  const endDate = (() => {
    const last = sortedDates[sortedDates.length - 1];
    const today = new Date();
    return last > today ? last : today;
  })();

  let current = 0;
  let top = 0;
  const date = new Date(startDate);

  while (date <= endDate) {
    const dateString = formatLocalDate(date);
    const completed = workoutMap.get(dateString) ?? false;
    const isStreakDay = streakDays.includes(date.getDay());

    if (isStreakDay) {
      if (completed) {
        current++;
        if (current > top) top = current;
      } else {
        current = 0;
      }
    } else if (completed) {
      current++;
      if (current > top) top = current;
    }

    date.setDate(date.getDate() + 1);
  }

  return top;
}
