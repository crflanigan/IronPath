import { useState, useEffect } from 'react';
import { Workout, InsertWorkout, UserPreferences, Exercise } from '@shared/schema';
import { localWorkoutStorage, CustomWorkoutTemplate } from '@/lib/storage';
import { workoutTemplates } from '@/lib/workout-data';
import { formatLocalDate } from '@/lib/utils';

const STORAGE_VERSION = "1.0.0";
const VERSION_KEY = "ironpath_version";

export function useWorkoutStorage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [customTemplates, setCustomTemplates] = useState<CustomWorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const checkStorageVersion = () => {
    try {
      const currentVersion = localStorage.getItem(VERSION_KEY);
      if (currentVersion !== STORAGE_VERSION) {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('ironpath')) localStorage.removeItem(key);
        });
        localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
      }
    } catch (err) {
      console.error('Failed to verify storage version', err);
    }
  };

  useEffect(() => {
    checkStorageVersion();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workoutsData, prefsData, templatesData] = await Promise.all([
        localWorkoutStorage.getWorkoutsByDateRange('2020-01-01', '2030-12-31'),
        localWorkoutStorage.getUserPreferences(),
        localWorkoutStorage.getCustomTemplates()
      ]);

      // If there are no workouts stored, simply start with an empty list.
      // The previous implementation would regenerate a schedule, leaving
      // counters unchanged after a reset.
      const resolvedWorkouts = (workoutsData ?? []).filter(Boolean);

      setWorkouts(resolvedWorkouts);
      setPreferences(prefsData);
      setCustomTemplates(templatesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };


  const getWorkoutByDate = async (date: string) => {
    return await localWorkoutStorage.getWorkoutByDate(date);
  };


  const createWorkout = async (workout: InsertWorkout) => {
    // pre-fill exercises with last used weight, reps, and rest if available
    const exercisesWithHistory = await Promise.all(
      (workout.exercises as Exercise[]).map(async (ex) => {
        const e = ex as Exercise;
        const last = await localWorkoutStorage.getLastExerciseSets(e.machine);
        if (last) {
          const sets = e.sets.map((set: Exercise['sets'][number], idx: number) => {
            const hist = last[idx] || last[last.length - 1];
            return {
              ...set,
              weight: hist.weight,
              reps: hist.reps,
              rest: hist.rest ?? set.rest,
            };
          });
          return { ...e, sets } as Exercise;
        }
        return e;
      })
    );

    const newWorkout = await localWorkoutStorage.createWorkout({
      ...workout,
      exercises: exercisesWithHistory,
    });
    setWorkouts((prev) => [...prev, newWorkout]);
    return newWorkout;
  };

  const createWorkoutForDate = async (
    date: string,
    templateName: string,
  ) => {
    const template = workoutTemplates[
      templateName as keyof typeof workoutTemplates
    ];
    if (!template) return undefined;

    return await createWorkout({
      date,
      type: templateName,
      completed: false,
      cardio: {
        type: "Treadmill",
        duration: "",
        distance: "",
        completed: false,
      },
      abs: template.abs.map((a) => ({ ...a, completed: false })),
      exercises: template.exercises.map((e) => ({
        ...e,
        completed: false,
        sets: e.sets.map((set) => ({ ...set, completed: false })),
      })),
    });
  };

  const updateWorkout = async (
    id: number,
    updates: Partial<InsertWorkout>,
  ) => {
    const updated = await localWorkoutStorage.updateWorkout(id, updates);
    if (updated) {
      setWorkouts((prev) =>
        prev.map((w) => (w.id === id ? updated : w)),
      );
    }
    return updated;
  };

  const exportData = async () => {
    const data = await localWorkoutStorage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironpath-data-${formatLocalDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = async () => {
    const { workouts } = await localWorkoutStorage.exportData();
    const header = ["id", "date", "type", "completed", "duration"];
    const rows = workouts.map((w) =>
      [w.id, w.date, w.type, w.completed, w.duration ?? ""].join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironpath-data-${formatLocalDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteWorkout = async (id: number) => {
    const success = await localWorkoutStorage.deleteWorkout(id);
    if (success) {
      setWorkouts(prev => prev.filter(w => w.id !== id));
    }
    return success;
  };

  const addCustomTemplate = async (
    template: Omit<CustomWorkoutTemplate, 'id'>,
  ) => {
    const newTemplate = await localWorkoutStorage.addCustomTemplate(template);
    setCustomTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  };

  const deleteCustomTemplate = async (id: number) => {
    const success = await localWorkoutStorage.deleteCustomTemplate(id);
    if (success) {
      setCustomTemplates(prev => prev.filter(t => t.id !== id));
    }
    return success;
  };

  const updateCustomTemplate = async (
    id: number,
    updates: Omit<CustomWorkoutTemplate, 'id'>,
  ) => {
    const updated = await localWorkoutStorage.updateCustomTemplate(id, updates);
    if (updated) {
      setCustomTemplates(prev =>
        prev.map(t => (t.id === id ? updated : t)),
      );
    }
    return updated;
  };


  const resetAllData = async () => {
    await localWorkoutStorage.clearAllData();
    await loadData();
  };

  return {
    workouts,
    preferences,
    customTemplates,
    loading,
    setWorkouts,
    setPreferences,
    setCustomTemplates,
    refresh: loadData,
    getWorkoutByDate,
    createWorkout,
    createWorkoutForDate,
    updateWorkout,
    deleteWorkout,
    addCustomTemplate,
    deleteCustomTemplate,
    updateCustomTemplate,
    resetAllData,
    exportData,
    exportCSV
  };
}
