import { useState, useEffect } from 'react';
import { Workout, InsertWorkout, UserPreferences } from '@shared/schema';
import { localWorkoutStorage } from '@/lib/storage';
import { generateWorkoutSchedule, workoutTemplates } from '@/lib/workout-data';

export function useWorkoutStorage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      let [workoutsData, prefsData] = await Promise.all([
        localWorkoutStorage.getWorkoutsByDateRange('2020-01-01', '2030-12-31'),
        localWorkoutStorage.getUserPreferences()
      ]);

      if (!workoutsData || workoutsData.length === 0) {
        workoutsData = generateInitialWorkouts();
        for (const w of workoutsData) {
          await localWorkoutStorage.createWorkout(w);
        }
      }

      setWorkouts(workoutsData);
      setPreferences(prefsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInitialWorkouts = (): InsertWorkout[] => {
    const today = new Date();
    const schedule = generateWorkoutSchedule(today.getFullYear(), today.getMonth() + 1);

    return schedule.map(({ date, type }) => {
      const template = workoutTemplates[type];

      return {
        date,
        type,
        completed: false,
        cardio: {
          type: 'Treadmill',
          duration: '',
          distance: '',
          completed: false
        },
        abs: template.abs.map(a => ({ ...a, completed: false })),
        exercises: template.exercises.map(e => ({
          ...e,
          completed: false,
          sets: e.sets.map(set => ({ ...set, completed: false }))
        }))
      };
    });
  };

  const getWorkoutByDate = async (date: string) => {
    return await localWorkoutStorage.getWorkoutByDate(date);
  };

  const createWorkout = async (workout: InsertWorkout) => {
    const newWorkout = await localWorkoutStorage.createWorkout(workout);
    setWorkouts((prev) => [...prev, newWorkout]);
    return newWorkout;
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
    a.download = `ironpup-data-${new Date()
      .toISOString()
      .split("T")[0]}.json`;
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
    a.download = `ironpup-data-${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    workouts,
    preferences,
    loading,
    setWorkouts,
    setPreferences,
    refresh: loadData,
    getWorkoutByDate,
    createWorkout,
    updateWorkout,
    exportData,
    exportCSV
  };
}
