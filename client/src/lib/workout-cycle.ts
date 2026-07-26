/**
 * The built-in 14-day rotation.
 *
 * This lives in its own dependency-free module so that both `workout-data.ts`
 * and `storage.ts` can read it. Putting it in `workout-data.ts` would make
 * `storage.ts` import a module that already imports `storage.ts`, and that
 * import cycle is exactly the kind of thing that works until it suddenly
 * doesn't.
 */
export const defaultWorkoutCycle: string[] = [
  "Chest & Triceps",
  "Back & Biceps",
  "Legs",
  "Chest & Shoulders",
  "Back, Biceps & Legs",
  "Chest Day",
  "Back & Biceps",
  "Chest, Shoulders & Legs",
  "Legs",
  "Chest & Triceps",
  "Back, Biceps & Legs",
  "Chest & Shoulders",
  "Back & Biceps",
  "Chest, Shoulders & Legs"
];

/** Names the built-in rotation already claims, for collision checks. */
export const presetCycleNames: ReadonlySet<string> = new Set(defaultWorkoutCycle);
