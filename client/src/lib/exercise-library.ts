import { workoutTemplates } from '@/lib/workout-data';

export interface ExerciseOption {
  machine: string;
  region: string;
}

export const exerciseLibrary: ExerciseOption[] = (() => {
  const map = new Map<string, ExerciseOption>();
  Object.values(workoutTemplates).forEach(template => {
    template?.exercises.forEach(ex => {
      if (!map.has(ex.machine)) {
        map.set(ex.machine, { machine: ex.machine, region: ex.region });
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => a.region.localeCompare(b.region));
})();
