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
import { readCalendarPosition, writeCalendarPosition } from '@/lib/calendar-position';
import { calculateDayStreak, calculateTopDayStreak } from '@/lib/streak';
import { WorkoutTemplateSelectorModal } from '@/components/WorkoutTemplateSelectorModal';
import { CustomWorkoutBuilderModal } from '@/components/CustomWorkoutBuilderModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AutoScheduleModal } from '@/components/AutoScheduleModal';
import { CustomizeStreakModal } from '@/components/CustomizeStreakModal';
import type { Workout, Exercise, AbsExercise } from '@shared/schema';
import { CustomWorkoutTemplate, localWorkoutStorage } from '@/lib/storage';
import { AppTour } from '@/components/AppTour';
import { CheckCircle2, Flame, PencilRuler, Play, Repeat, Trophy } from 'lucide-react';
import { InstallPrompt } from '@/components/InstallPrompt';
import { hasSeenTour, recordVisit } from '@/lib/onboarding';

/** One visit per page load, not per mount. See the effect that reads it. */
let visitRecorded = false;

export function CalendarPage() {
  /*
   * Restored from the visit, not reset to today.
   *
   * This page unmounts whenever a workout is opened, so `useState(new Date())`
   * ran again on the way back and threw away however far you had browsed. Six
   * months back to check something meant six taps to return.
   *
   * Reading here rather than hooking navigation covers every route back at
   * once — the in-app arrow, the browser back button, and a swipe on an
   * installed PWA all simply remount this.
   */
  const restored = readCalendarPosition();
  const [currentDate, setCurrentDate] = useState(
    () => (restored ? parseISODate(restored.month) : new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => restored?.selectedDate ?? formatLocalDate(new Date()),
  );

  useEffect(() => {
    if (!selectedDate) return;
    writeCalendarPosition({
      month: formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)),
      selectedDate,
    });
  }, [currentDate, selectedDate]);
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
    <div className="max-w-md mx-auto p-4 space-y-4">
      {showTour && <AppTour onClose={() => setShowTour(false)} />}
      <InstallPrompt />

      {/* Stats: one strip, three figures. They were three separate bordered
          boxes, which gave a row of numbers the visual weight of three
          cards. Each is still its own button. */}
      <div className="grid animate-rise-in grid-cols-3 divide-x divide-gray-100 rounded-2xl border border-gray-200/80 bg-card shadow-card dark:divide-white/[0.06] dark:border-white/[0.06]">
        {[
          {
            label: 'Completed',
            aria: `Completed: ${stats.completedWorkouts} workouts`,
            value: stats.completedWorkouts,
            icon: CheckCircle2,
            tone: 'text-primary',
            onClick: () => setLocation('/history'),
          },
          {
            label: 'Day Streak',
            aria: `Day Streak: ${stats.currentStreak}`,
            value: stats.currentStreak,
            icon: Flame,
            tone: 'text-orange-500',
            onClick: () => setStreakModalOpen(true),
          },
          {
            label: 'Top Streak',
            aria: `Top Streak: ${stats.topStreak}`,
            value: stats.topStreak,
            icon: Trophy,
            tone: 'text-amber-500',
            onClick: () => setLocation('/history'),
          },
        ].map(({ label, aria, value, icon: Icon, tone, onClick }) => (
          <button
            key={label}
            type="button"
            aria-label={aria}
            onClick={onClick}
            className="group flex flex-col items-center gap-1 px-2 py-4 text-center transition-colors first:rounded-l-2xl last:rounded-r-2xl hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/[0.03] dark:active:bg-white/[0.06]"
          >
            <div className="flex items-center gap-1.5">
              <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
              <span className="nums text-2xl font-bold leading-none text-gray-900 dark:text-white">{value}</span>
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
          </button>
        ))}
      </div>

      {/* Calendar */}
      <CalendarGrid
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onSelectDate={handleSelectDate}
        workouts={workouts}
        selectedDate={selectedDate}
      />


      {/* Selected day: the one thing this screen is for, so it is the one
          place the brand colour is spent freely. */}
      {selectedDate && (
        <Card className="animate-rise-in overflow-hidden">
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="eyebrow !text-primary">
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
              <p
                className="mt-1 text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white"
                data-testid="selected-workout-type"
              >
                <span className="sr-only">Selected Day's Workout: </span>
                {selectedWorkoutType ?? 'None'}
              </p>
            </div>
            <Button onClick={handleStartSelectedWorkout} size="lg" className="w-full">
              <Play className="!size-4 fill-current" aria-hidden="true" />
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
              * `selectedWorkout` is the stored *record*, so this state has
              * nothing to do with custom templates, and the day is scheduled —
              * the rotation named it. What is absent is anything logged.
              */}
            {!selectedWorkout && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Nothing logged for this day yet
              </p>
            )}

            {/* The two occasional actions, side by side and quiet. They were
                two more full-width slabs under the primary one, so the card
                read as a stack of four equal buttons. */}
            <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
              <Button
                data-tour="custom-workout"
                aria-label="Create or Edit Custom Workout"
                className="h-auto flex-col gap-1.5 whitespace-normal rounded-xl bg-gray-50 px-2 py-3 text-xs font-semibold leading-tight text-gray-700 hover:bg-gray-100 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.08]"
                variant="ghost"
                onClick={() => openTemplateSelector(selectedDate)}
              >
                <PencilRuler className="!size-[18px] text-primary" aria-hidden="true" />
                Custom Workout
              </Button>

              <Button
                aria-label="Customize Auto-Schedule"
                className="h-auto flex-col gap-1.5 whitespace-normal rounded-xl bg-gray-50 px-2 py-3 text-xs font-semibold leading-tight text-gray-700 hover:bg-gray-100 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.08]"
                variant="ghost"
                onClick={() => setScheduleModalOpen(true)}
              >
                <Repeat className="!size-[18px] text-primary" aria-hidden="true" />
                Auto-Schedule
              </Button>
            </div>
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
