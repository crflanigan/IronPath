import { useState, useEffect } from 'react';
import { Workout, InsertWorkout, UserPreferences } from '@shared/schema';
import { localWorkoutStorage } from '@/lib/storage';

export function useWorkoutStorage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workoutsData, prefsData] = await Promise.all([
        localWorkoutStorage.getWorkoutsByDateRange('2020-01-01', '2030-12-31'),
        localWorkoutStorage.getUserPreferences()
      ]);
      setWorkouts(workoutsData);
      setPreferences(prefsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkoutByDate = async (date: string): Promise<Workout | undefined> => {
    return await localWorkoutStorage.getWorkoutByDate(date);
  };

  const createWorkout = async (workout: InsertWorkout): Promise<Workout> => {
    const newWorkout = await localWorkoutStorage.createWorkout(workout);
    await loadData(); // Refresh data
    return newWorkout;
  };

  const updateWorkout = async (id: number, updates: Partial<InsertWorkout>): Promise<Workout | undefined> => {
    const updatedWorkout = await localWorkoutStorage.updateWorkout(id, updates);
    if (updatedWorkout) {
      await loadData(); // Refresh data
    }
    return updatedWorkout;
  };

  const deleteWorkout = async (id: number): Promise<boolean> => {
    const success = await localWorkoutStorage.deleteWorkout(id);
    if (success) {
      await loadData(); // Refresh data
    }
    return success;
  };

  const updatePreferences = async (updates: Partial<UserPreferences>): Promise<UserPreferences> => {
    const updatedPrefs = await localWorkoutStorage.updateUserPreferences(updates);
    setPreferences(updatedPrefs);
    return updatedPrefs;
  };

  const exportData = async () => {
    const data = await localWorkoutStorage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironpup-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = async () => {
    const data = await localWorkoutStorage.exportData();
    const csvRows = ['Date,Type,Completed,Duration,Exercises'];
    
    data.workouts.forEach(workout => {
      const exerciseCount = workout.exercises.length;
      csvRows.push(`${workout.date},${workout.type},${workout.completed},${workout.duration || 0},${exerciseCount}`);
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironpup-workouts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllData = async () => {
    await localWorkoutStorage.clearAllData();
    await loadData();
  };

  return {
    workouts,
    preferences,
    loading,
    getWorkoutByDate,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    updatePreferences,
    exportData,
    exportCSV,
    clearAllData,
    refreshData: loadData
  };
}
