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

  return {
    workouts,
    preferences,
    loading,
    setWorkouts,
    setPreferences,
    refresh: loadData
  };
}
