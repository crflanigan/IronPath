import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarGrid } from '@/components/calendar-grid';
import { WorkoutCard } from '@/components/workout-card';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { generateWorkoutSchedule, getTodaysWorkoutType, workoutTemplates } from '@/lib/workout-data';
import { Workout } from '@shared/schema';

interface CalendarPageProps {
  onNavigateToWorkout: (workout: Workout) => void;
}

export function CalendarPage({ onNavigateToWorkout }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const { workouts, getWorkoutByDate, createWorkout, loading } = useWorkoutStorage();

  useEffect(() => {
    if (selectedDate) {
      loadWorkoutForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadWorkoutForDate = async (date: string) => {
    const workout = await getWorkoutByDate(date);
    setSelectedWorkout(workout || null);
  };

  const handleSelectDate = (date: string | Date) => {
    let normalized: string;
  
    if (typeof date === 'string') {
      normalized = date; // assume already in YYYY-MM-DD format
    } else {
      // convert from JS Date to YYYY-MM-DD without timezone shift
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      normalized = `${year}-${month}-${day}`;
    }
  
    console.log("➡️ handleSelectDate received:", date);
    console.log("🧮 Normalized:", normalized);
  
    setSelectedDate(normalized);
  };

  const handleStartTodayWorkout = async () => {
    const today = new Date().toISOString().split('T')[0];
    const existingWorkout = await getWorkoutByDate(today);
    
    if (existingWorkout) {
      onNavigateToWorkout(existingWorkout);
    } else {
      // Create new workout for today
      const workoutType = getTodaysWorkoutType();
      const template = workoutTemplates[workoutType];
      
      const newWorkout = await createWorkout({
        date: today,
        type: workoutType,
        exercises: template.exercises.map(e => ({ ...e, completed: false })),
        abs: template.abs.map(a => ({ ...a, completed: false })),
        cardio: {
          type: 'Treadmill',
          duration: '',
          distance: '',
          completed: false
        },
        completed: false
      });
      
      onNavigateToWorkout(newWorkout);
    }
  };

  const handleStartWorkout = async (date: string) => {
    const existingWorkout = await getWorkoutByDate(date);
    
    if (existingWorkout) {
      onNavigateToWorkout(existingWorkout);
    } else {
      // Create new workout for selected date
      const schedule = generateWorkoutSchedule(new Date(date).getFullYear(), new Date(date).getMonth() + 1);
      const scheduledWorkout = schedule.find(w => w.date === date);
      
      if (scheduledWorkout) {
        const template = workoutTemplates[scheduledWorkout.type];
        
        const newWorkout = await createWorkout({
          date: date,
          type: scheduledWorkout.type,
          exercises: template.exercises.map(e => ({ ...e, completed: false })),
          abs: template.abs.map(a => ({ ...a, completed: false })),
          cardio: {
            type: 'Treadmill',
            duration: '',
            distance: '',
            completed: false
          },
          completed: false
        });
        
        onNavigateToWorkout(newWorkout);
      }
    }
  };

  const getWorkoutStats = () => {
    const completedWorkouts = workouts.filter(w => w.completed).length;
    const totalWorkouts = workouts.length;
    const currentStreak = calculateCurrentStreak();
    
    return { completedWorkouts, totalWorkouts, currentStreak };
  };

  const calculateCurrentStreak = () => {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const workout = workouts.find(w => w.date === dateString);
      if (workout && workout.completed) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = getWorkoutStats();

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.completedWorkouts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.currentStreak}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.totalWorkouts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <CalendarGrid
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onSelectDate={handleSelectDate}
        workouts={workouts}
      />

      {/* Workout Legend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Workout Status</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✅</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-orange-600">🕒</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">📅</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Workout Details */}
      {selectedDate && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            
            {selectedWorkout ? (
              <WorkoutCard
                workout={selectedWorkout}
                onStart={() => onNavigateToWorkout(selectedWorkout)}
                onView={() => onNavigateToWorkout(selectedWorkout)}
              />
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No workout scheduled for this date
                </p>
                <Button onClick={() => handleStartWorkout(selectedDate)}>
                  Create Workout
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleStartTodayWorkout}
          className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Start Today's Workout
        </Button>
      </div>
    </div>
  );
}
