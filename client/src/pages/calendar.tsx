import { useState, useEffect } from 'react';
import { useViewStack } from '@/components/view-stack-provider';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarGrid } from '@/components/calendar-grid';
import { WorkoutCard } from '@/components/workout-card';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { generateWorkoutSchedule, workoutTemplates } from '@/lib/workout-data';
import { parseISODate, formatLocalDate } from '@/lib/utils';
import { calculateDayStreak, calculateTopDayStreak } from '@/lib/streak';
import { WorkoutTemplateSelectorModal } from '@/components/WorkoutTemplateSelectorModal';
import { CustomWorkoutBuilderModal } from '@/components/CustomWorkoutBuilderModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AutoScheduleModal } from '@/components/AutoScheduleModal';
import { CustomizeStreakModal } from '@/components/CustomizeStreakModal';
import type { Workout, Exercise, AbsExercise } from '@shared/schema';
import { CustomWorkoutTemplate, localWorkoutStorage } from '@/lib/storage';
import { AppTour } from '@/components/AppTour';
import { InstallPrompt } from '@/components/InstallPrompt';
import { hasSeenTour, recordVisit } from '@/lib/onboarding';

/** One visit per page load, not per mount. See the effect that reads it. */
let visitRecorded = false;

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => formatLocalDate(new Date())
  );
  const { currentView, pushView, popView } = useViewStack();
  const [, setLocation] = useLocation();
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<CustomWorkoutTemplate | null>(null);
  const [prefillTemplate, setPrefillTemplate] = useState<{ name: string; exercises: Exercise[]; abs: AbsExercise[] } | null>(null);
  const [dateForCreation, setDateForCreation] = useState<string | null>(null);
  // Read once at mount rather than on every render: finishing the tour writes
  // the flag, and re-reading it would tear the overlay down mid-transition.
  const [showTour, setShowTour] = useState(() => !hasSeenTour());
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

  // Counts this page load, which is what gates the install prompt to a second
  // visit. Module-scoped so React's development double-invoke of effects does
  // not count one load twice.
  useEffect(() => {
    if (!visitRecorded) {
      visitRecorded = true;
      recordVisit();
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadWorkoutForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadWorkoutForDate = async (date: string) => {
    const workout = await getWorkoutByDate(date);
    setSelectedWorkout(workout || null);
  };

  const navigateToWorkout = (workout: Workout) => {
    setLocation(`/workout/${workout.id}`);
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
        abs: (custom.abs ?? []).map(a => ({ ...a, completed: false })),
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

  /**
   * Start (or open) the workout for the day the panel is showing.
   *
   * This used to always act on `new Date()` while sitting inside a panel headed
   * with the selected date, directly under a line reading "Selected Day's
   * Workout: Legs". So tapping a day and pressing the button created a workout
   * for today, of today's type — not the one named a few pixels above.
   */
  const handleStartSelectedWorkout = async () => {
    const date = selectedDate ?? formatLocalDate(new Date());
    const existingWorkout = await getWorkoutByDate(date);

    if (existingWorkout) {
      navigateToWorkout(existingWorkout);
    } else {
      // The type the panel is advertising for this day, which is the scheduled
      // one — not today's.
      const workoutType = selectedWorkoutType;
      if (!workoutType) return;
      const builtIn = workoutTemplates[workoutType as keyof typeof workoutTemplates];
      let newWorkout: Workout | undefined;
      if (builtIn) {
        const template = builtIn;
        newWorkout = await createWorkout({
          date,
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
          date,
          type: workoutType,
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
        navigateToWorkout(newWorkout);
      }
    }
  };


  const getWorkoutStats = () => {
    const completedWorkouts = workouts.filter(w => w.completed).length;
    const streakDays = localWorkoutStorage.getStreakDays();
    const currentStreak = calculateDayStreak(workouts, streakDays);
    const topStreak = calculateTopDayStreak(workouts, streakDays);

    return { completedWorkouts, currentStreak, topStreak };
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
      {showTour && <AppTour onClose={() => setShowTour(false)} />}
      <InstallPrompt />

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <button
          type="button"
          aria-label={`Completed: ${stats.completedWorkouts} workouts`}
          onClick={() => setLocation('/history')}
          className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center cursor-pointer transition-colors hover:bg-accent/50 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="text-2xl font-bold text-primary">{stats.completedWorkouts}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
        </button>
        <button
          type="button"
          aria-label={`Day Streak: ${stats.currentStreak}`}
          onClick={() => setStreakModalOpen(true)}
          className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center cursor-pointer transition-colors hover:bg-accent/50 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="text-2xl font-bold text-green-600">{stats.currentStreak}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
        </button>
        <button
          type="button"
          aria-label={`Top Streak: ${stats.topStreak}`}
          onClick={() => setLocation('/history')}
          className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 text-center cursor-pointer transition-colors hover:bg-accent/50 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="text-2xl font-bold text-orange-600">{stats.topStreak}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Top Streak</div>
        </button>
      </div>

      {/* Calendar */}
      <CalendarGrid
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onSelectDate={handleSelectDate}
        workouts={workouts}
        selectedDate={selectedDate}
      />


      {/* Two states left to explain, so this is a line rather than a card. It
          used to be a full bordered card teaching three, one of which ("Pending")
          was on literally every day and so distinguished nothing. Shrinking it
          pulls Start Today's Workout back above the fold. The Today swatch is a
          teal square because that is exactly what the calendar draws — a legend
          that shows the real mark beats one that describes it. */}
      <div className="flex justify-center items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">✅</span>
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-primary" />
          Today
        </span>
      </div>

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
            <Button onClick={handleStartSelectedWorkout} className="w-full">
              {selectedDate === formatLocalDate(new Date())
                ? "Start Today's Workout"
                : 'Start This Workout'}
            </Button>

            {selectedWorkout && (
              <WorkoutCard
                workout={selectedWorkout}
                onStart={() => navigateToWorkout(selectedWorkout)}
                onView={() => navigateToWorkout(selectedWorkout)}
                onDelete={handleDeleteSelectedWorkout}
              />
            )}

            {/*
              * "No custom workout scheduled for this date" — which read as
              * flatly denying the "Selected Day's Workout: Legs" three lines
              * above it, and had two wrong words in five.
              *
              * `selectedWorkout` is the stored *record*, so this state has
              * nothing to do with custom templates, and the day is scheduled —
              * the rotation named it. What is absent is anything logged.
              */}
            {!selectedWorkout && (
              <p className="text-center text-gray-600 dark:text-gray-400">
                Nothing logged for this day yet
              </p>
            )}

            {/* Outlined, not filled. This and Start Today's Workout were two
                identical teal slabs competing for the same attention, when one
                is the 95% action and this is occasional. Same colour, less ink —
                the hierarchy comes from turning this down, not from shouting. */}
            <Button
              data-tour="custom-workout"
              className="w-full border-primary text-primary hover:bg-primary/10 hover:text-primary"
              variant="outline"
              onClick={() => openTemplateSelector(selectedDate)}
            >
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
            reservedNames={Object.keys(workoutTemplates)}
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
