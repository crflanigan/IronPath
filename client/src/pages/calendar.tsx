import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { Workout } from '@shared/schema';
import { CalendarGrid } from '@/components/calendar-grid';
import { WorkoutCard } from '@/components/workout-card';
import { WorkoutTemplateSelectorModal } from '@/components/WorkoutTemplateSelectorModal';
import { CustomWorkoutBuilderModal } from '@/components/CustomWorkoutBuilderModal';
import { AutoScheduleModal } from '@/components/AutoScheduleModal';
import { CustomizeStreakModal } from '@/components/CustomizeStreakModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { parseISODate } from '@/lib/utils';
import { generateWorkoutSchedule } from '@/lib/workout-data';
import { localWorkoutStorage } from '@/lib/storage';
import { calculateDayStreak, calculateTopDayStreak } from '@/lib/streak';

interface CalendarPageProps {
  onNavigateToWorkout: (workout: Workout) => void;
}

export function CalendarPage({ onNavigateToWorkout }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'calendar' | 'templateSelector' | 'customWorkoutBuilder'>('calendar');
  const [templateToEdit, setTemplateToEdit] = useState<any>(null);
  const [prefillTemplate, setPrefillTemplate] = useState<any>(null);
  const [dateForCreation, setDateForCreation] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);

  const { workouts, createWorkout, deleteWorkout, customTemplates, refreshCustomTemplates, loading } = useWorkoutStorage();

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  const handleDeleteSelectedWorkout = async (id: number) => {
    await deleteWorkout(id);
    setSelectedDate(null);
  };

  const handleTemplateSelect = async (templateName: string) => {
    if (!dateForCreation) return;
    const today = dateForCreation;
    const builtIn = workoutTemplates[templateName as keyof typeof workoutTemplates];
    let newWorkout: Workout | undefined;
    if (builtIn) {
      newWorkout = await createWorkout({
        date: today,
        type: templateName,
        exercises: builtIn.exercises.map(e => ({
          ...e,
          completed: false,
          sets: e.sets.map(s => ({ ...s, completed: false }))
        })),
        abs: builtIn.abs.map(a => ({ ...a, completed: false })),
        cardio: {
          type: 'Treadmill',
          duration: '',
          distance: '',
          completed: false
        },
        completed: false
      });
    } else {
      const custom = customTemplates.find(t => t.name === templateName);
      if (!custom) return;
      newWorkout = await createWorkout({
        date: today,
        type: templateName,
        exercises: custom.exercises.map(e => ({
          ...e,
          completed: false,
          sets: e.sets.map(s => ({ ...s, completed: false }))
        })),
        abs: (custom.abs ?? []).map(a => ({ ...a, completed: false })),
        cardio: {
          type: 'Treadmill',
          duration: '',
          distance: '',
          completed: false
        },
        completed: false
      });
    }
    if (newWorkout) {
      onNavigateToWorkout(newWorkout);
    }
    setDateForCreation(null);
  };

  const handleCreateCustom = () => {
    setCurrentView('customWorkoutBuilder');
  };

  const handleClonePreset = (template: any) => {
    setPrefillTemplate(template);
    setCurrentView('customWorkoutBuilder');
  };

  const handleCustomWorkoutCreate = async (template: any) => {
    // ... (existing logic)
    refreshCustomTemplates();
    setCurrentView('calendar');
  };

  const handleCustomWorkoutUpdate = async (template: any) => {
    // ... (existing logic)
    refreshCustomTemplates();
    setCurrentView('calendar');
  };

  const handleEditCustomTemplate = (template: any) => {
    setTemplateToEdit(template);
    setCurrentView('customWorkoutBuilder');
  };

  const handleDeleteCustomTemplate = async (name: string) => {
    // ... (existing logic)
    refreshCustomTemplates();
  };

  const openTemplateSelector = (date: string) => {
    setDateForCreation(date);
    setCurrentView('templateSelector');
  };

  const popView = () => {
    setCurrentView('calendar');
  };

  const handleStartTodayWorkout = async () => {
    const today = new Date().toISOString().split('T')[0];
    const existingWorkout = await getWorkoutByDate(today);
    
    if (existingWorkout) {
      onNavigateToWorkout(existingWorkout);
    } else {
      const schedule = generateWorkoutSchedule(
        parseISODate(today).getFullYear(),
        parseISODate(today).getMonth() + 1
      );
      const scheduledWorkout = schedule.find(w => w.date === today);
      
      if (scheduledWorkout) {
        const builtIn = workoutTemplates[scheduledWorkout.type as keyof typeof workoutTemplates];
        let newWorkout: Workout | undefined;
        if (builtIn) {
          newWorkout = await createWorkout({
            date: today,
            type: scheduledWorkout.type,
            exercises: builtIn.exercises.map(e => ({
              ...e,
              completed: false,
              sets: e.sets.map(s => ({ ...s, completed: false })),
            })),
            abs: builtIn.abs.map(a => ({ ...a, completed: false })),
            cardio: {
              type: 'Treadmill',
              duration: '',
              distance: '',
              completed: false
            },
            completed: false
          });
        } else {
          const custom = customTemplates.find(t => t.name === scheduledWorkout.type);
          if (!custom) return;
          newWorkout = await createWorkout({
            date: today,
            type: scheduledWorkout.type,
            exercises: custom.exercises.map(e => ({
              ...e,
              completed: false,
              sets: e.sets.map(s => ({ ...s, completed: false })),
            })),
            abs: (custom.abs ?? []).map(a => ({ ...a, completed: false })),
            cardio: {
              type: 'Treadmill',
              duration: '',
              distance: '',
              completed: false,
            },
            completed: false,
          });
        }
        if (newWorkout) {
          onNavigateToWorkout(newWorkout);
        }
      }
    }
  };

  const getWorkoutByDate = async (date: string) => {
    return workouts.find(w => w.date === date);
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

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => window.location.href = '/history'}
          className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center cursor-pointer transition-colors hover:bg-accent/50 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="text-2xl font-bold text-primary">{workouts.filter(w => w.completed).length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
        </button>
        <button
          type="button"
          onClick={() => setStreakModalOpen(true)}
          className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center cursor-pointer transition-colors hover:bg-accent/50 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="text-2xl font-bold text-green-600">{calculateDayStreak(workouts, localWorkoutStorage.getStreakDays())}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
        </button>
        <button
          type="button"
          onClick={() => window.location.href = '/history'}
          className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center cursor-pointer transition-colors hover:bg-accent/50 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="text-2xl font-bold text-orange-600">{calculateTopDayStreak(workouts, localWorkoutStorage.getStreakDays())}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Top Streak</div>
        </button>
      </div>

      <CalendarGrid
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onSelectDate={handleSelectDate}
        workouts={workouts}
        selectedDate={selectedDate}
      />

      {/* Workout Legend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Workout Status</h3>
          <div className="flex justify-center space-x-6">
            <div className="flex items-center space-x-1">
              <span className="text-green-600">✅</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-orange-600">🕒</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-blue-600">📅</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Workout Details */}
      {selectedDate && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {parseISODate(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <Button onClick={handleStartTodayWorkout} className="w-full">
              Start Today's Workout
            </Button>

            {selectedDate && workouts.find(w => w.date === selectedDate) && (
              <WorkoutCard
                workout={workouts.find(w => w.date === selectedDate)!}
                onStart={() => onNavigateToWorkout(workouts.find(w => w.date === selectedDate)!)}
                onView={() => onNavigateToWorkout(workouts.find(w => w.date === selectedDate)!)}
                onDelete={handleDeleteSelectedWorkout}
              />
            )}

            <Button className="w-full" onClick={() => openTemplateSelector(selectedDate)}>
              Create or Edit Custom Workout
            </Button>

            <Button
              className="w-full"
              variant="secondary"
              onClick={() => setScheduleModalOpen(true)}
            >
              Customize Auto-Schedule
            </Button>
          </CardContent>
        </Card>
      )}

      <WorkoutTemplateSelectorModal
        open={currentView === 'templateSelector'}
        customTemplates={customTemplates}
        onClose={() => {
          popView();
          setDateForCreation(null);
        }}
        onSelectTemplate={handleTemplateSelect}
        onCreateCustom={handleCreateCustom}
        onClonePreset={handleClonePreset}
        onDeleteTemplate={handleDeleteCustomTemplate}
        onEditTemplate={handleEditCustomTemplate}
      />

      <ErrorBoundary>
        <CustomWorkoutBuilderModal
          open={currentView === 'customWorkoutBuilder'}
          onClose={() => { setTemplateToEdit(null); setPrefillTemplate(null); }}
          onCreate={handleCustomWorkoutCreate}
          onUpdate={handleCustomWorkoutUpdate}
          refreshCustomTemplates={refreshCustomTemplates}
          template={templateToEdit ?? undefined}
          prefill={prefillTemplate ?? undefined}
          existingNames={customTemplates.map(t => t.name)}
        />
      </ErrorBoundary>

      <AutoScheduleModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        customTemplates={customTemplates}
      />

      <CustomizeStreakModal
        open={streakModalOpen}
        onClose={() => setStreakModalOpen(false)}
      />
    </div>
  );
}
