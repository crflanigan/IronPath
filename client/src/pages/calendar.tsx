import { useState, useEffect } from 'react';
import { useViewStack } from '@/components/view-stack-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarGrid } from '@/components/calendar-grid';
import { WorkoutCard } from '@/components/workout-card';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { generateWorkoutSchedule, getTodaysWorkoutType, workoutTemplates } from '@/lib/workout-data';
import { parseISODate, formatLocalDate } from '@/lib/utils';
import { WorkoutTemplateSelectorModal } from '@/components/WorkoutTemplateSelectorModal';
import { CustomWorkoutBuilderModal } from '@/components/CustomWorkoutBuilderModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AutoScheduleModal } from '@/components/AutoScheduleModal';
import { Workout, Exercise, AbsExercise } from '@shared/schema';
import { CustomWorkoutTemplate } from '@/lib/storage';

interface CalendarPageProps {
  onNavigateToWorkout: (workout: Workout) => void;
}

export function CalendarPage({ onNavigateToWorkout }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => formatLocalDate(new Date())
  );
  const { currentView, pushView, popView } = useViewStack();
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<CustomWorkoutTemplate | null>(null);
  const [prefillTemplate, setPrefillTemplate] = useState<{ name: string; exercises: Exercise[]; abs: AbsExercise[] } | null>(null);
  const [dateForCreation, setDateForCreation] = useState<string | null>(null);
  const {
    workouts,
    getWorkoutByDate,
    createWorkout,
    createWorkoutForDate,
    deleteWorkout,
    addCustomTemplate,
    deleteCustomTemplate,
    updateCustomTemplate,
    refreshCustomTemplates,
    customTemplates,
    loading
  } = useWorkoutStorage();

  useEffect(() => {
    if (selectedDate) {
      loadWorkoutForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadWorkoutForDate = async (date: string) => {
    const workout = await getWorkoutByDate(date);
    setSelectedWorkout(workout || null);
  };

  const handleDeleteSelectedWorkout = async () => {
    if (!selectedWorkout) return;
    await deleteWorkout(selectedWorkout.id);
    setSelectedWorkout(null);
  };

  const openTemplateSelector = (date: string) => {
    setDateForCreation(date);
    pushView('templateSelector');
  };

  const handleCreateCustom = () => {
    setTemplateToEdit(null);
    setPrefillTemplate(null);
  };

  const handleClonePreset = (presetName: string) => {
    const builtIn = workoutTemplates[presetName as keyof typeof workoutTemplates];
    if (!builtIn) return;
    setTemplateToEdit(null);
    setPrefillTemplate({
      name: `Custom - ${presetName}`,
      exercises: builtIn.exercises.map(ex => ({
        ...ex,
        completed: false,
        sets: ex.sets.map(s => ({ ...s, completed: false })),
      })),
      abs: builtIn.abs.map(a => ({ ...a, completed: false })),
    });
    // view transition handled in modal
  };

  const handleTemplateSelect = async (templateName: string) => {
    if (!dateForCreation) return;
    const builtIn = workoutTemplates[templateName as keyof typeof workoutTemplates];
    if (builtIn) {
      await createWorkoutForDate(dateForCreation, templateName);
    } else {
      const custom = customTemplates.find(t => t.name === templateName);
      if (!custom) return;
      await createWorkout({
        date: dateForCreation,
        type: templateName,
        completed: false,
        cardio: { type: 'Treadmill', duration: '', distance: '', completed: false },
        abs: [],
        exercises: custom.exercises.map(e => ({
          ...e,
          completed: false,
          sets: e.sets.map(s => ({ ...s, completed: false }))
        }))
      });
    }
    await loadWorkoutForDate(dateForCreation);
    popView();
    setDateForCreation(null);
  };

  const handleCustomWorkoutCreate = async (
    name: string,
    exercises: Exercise[],
    abs: AbsExercise[],
    include: boolean,
  ) => {
    if (!dateForCreation) return;
    await addCustomTemplate({
      name,
      exercises,
      abs,
      includeInAutoSchedule: include,
    });
    await createWorkout({
      date: dateForCreation,
      type: name,
      completed: false,
      cardio: { type: 'Treadmill', duration: '', distance: '', completed: false },
      abs: abs.map(a => ({ ...a, completed: false })),
      exercises: exercises.map(e => ({
        ...e,
        completed: false,
        sets: e.sets.map(s => ({ ...s, completed: false }))
      }))
    });
    await loadWorkoutForDate(dateForCreation);
    setPrefillTemplate(null);
    // Keep dateForCreation so newly created templates can be immediately selected
  };

  const handleCustomWorkoutUpdate = async (
    id: number,
    name: string,
    exercises: Exercise[],
    abs: AbsExercise[],
    include: boolean,
  ) => {
    await updateCustomTemplate(id, {
      name,
      exercises,
      abs,
      includeInAutoSchedule: include,
    });
    setTemplateToEdit(null);
  };

  const handleEditCustomTemplate = (template: CustomWorkoutTemplate) => {
    setTemplateToEdit(template);
  };

  const handleDeleteCustomTemplate = async (id: number) => {
    await deleteCustomTemplate(id);
  };


  const handleSelectDate = (date: string | Date) => {
    setSelectedWorkout(null);

    let normalized: string;

    if (typeof date === "string") {
      normalized = date; // assume already in YYYY-MM-DD format
    } else {
      normalized = formatLocalDate(date);
    }

    setSelectedDate(normalized);
  };

  const handleStartTodayWorkout = async () => {
    const today = formatLocalDate(new Date());
    const existingWorkout = await getWorkoutByDate(today);

    if (existingWorkout) {
      onNavigateToWorkout(existingWorkout);
    } else {
      // Create new workout for today
      const workoutType = getTodaysWorkoutType();
      const builtIn = workoutTemplates[workoutType as keyof typeof workoutTemplates];
      let newWorkout: Workout | undefined;
      if (builtIn) {
        const template = builtIn;
        newWorkout = await createWorkout({
          date: today,
          type: workoutType,
          exercises: template.exercises.map(e => ({
            ...e,
            completed: false,
            sets: e.sets.map(s => ({ ...s, completed: false }))
          })),
          abs: template.abs.map(a => ({ ...a, completed: false })),
          cardio: {
            type: 'Treadmill',
            duration: '',
            distance: '',
            completed: false
          },
          completed: false
        });
      } else {
        const custom = customTemplates.find(t => t.name === workoutType);
        if (!custom) return;
        newWorkout = await createWorkout({
          date: today,
          type: workoutType,
          exercises: custom.exercises.map(e => ({
            ...e,
            completed: false,
            sets: e.sets.map(s => ({ ...s, completed: false }))
          })),
          abs: [],
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
    }
  };

  const handleStartWorkout = async (date: string) => {
    const existingWorkout = await getWorkoutByDate(date);
    
    if (existingWorkout) {
      onNavigateToWorkout(existingWorkout);
    } else {
      // Create new workout for selected date
      const schedule = generateWorkoutSchedule(
        parseISODate(date).getFullYear(),
        parseISODate(date).getMonth() + 1
      );
      const scheduledWorkout = schedule.find(w => w.date === date);
      
      if (scheduledWorkout) {
        const builtIn = workoutTemplates[scheduledWorkout.type as keyof typeof workoutTemplates];
        let newWorkout: Workout | undefined;
        if (builtIn) {
          newWorkout = await createWorkout({
            date: date,
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
            date: date,
            type: scheduledWorkout.type,
            exercises: custom.exercises.map(e => ({
              ...e,
              completed: false,
              sets: e.sets.map(s => ({ ...s, completed: false })),
            })),
            abs: [],
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
      const dateString = formatLocalDate(date);
      
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

  const selectedWorkoutType = selectedWorkout?.type ||
    (selectedDate
      ? (() => {
          const dateObj = parseISODate(selectedDate);
          const schedule = generateWorkoutSchedule(
            dateObj.getFullYear(),
            dateObj.getMonth() + 1
          );
          return schedule.find(w => w.date === selectedDate)?.type || null;
        })()
      : null);

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
              {(() => {
                const [year, month, day] = selectedDate.split('-').map(Number);
                const dateObj = new Date(year, month - 1, day); // Avoids timezone shift
                return dateObj.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                });
              })()}
            </h3>
            <p className="text-center font-medium">
              Selected Day's Workout: {selectedWorkoutType ?? 'None'}
            </p>
            <Button onClick={handleStartTodayWorkout} className="w-full">
              Start Today's Workout
            </Button>

            {selectedWorkout && (
              <WorkoutCard
                workout={selectedWorkout}
                onStart={() => onNavigateToWorkout(selectedWorkout)}
                onView={() => onNavigateToWorkout(selectedWorkout)}
                onDelete={handleDeleteSelectedWorkout}
              />
            )}

            {!selectedWorkout && (
              <p className="text-center text-gray-600 dark:text-gray-400">
                No custom workout scheduled for this date
              </p>
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
      </div>
    );
  }
