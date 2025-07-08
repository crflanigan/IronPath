import { workoutTemplates } from '@/lib/workout-data';

export interface AbsExerciseOption {
  name: string;
  reps?: number;
  time?: string;
}

export const absLibrary: AbsExerciseOption[] = (() => {
  const map = new Map<string, AbsExerciseOption>();
  Object.values(workoutTemplates).forEach(template => {
    template?.abs.forEach(a => {
      if (!map.has(a.name)) {
        map.set(a.name, { name: a.name, reps: a.reps, time: (a as any).time });
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
})();
