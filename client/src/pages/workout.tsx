import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExerciseForm } from '@/components/exercise-form';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { personalBests, type PersonalBest } from '@/lib/personal-best';
import { ResetPersonalBestDialog } from '@/components/ResetPersonalBestDialog';
import { localWorkoutStorage } from '@/lib/storage';
import { ConcurrentEditError, StorageWriteError } from '@/lib/storage';
import type { Workout, Exercise, AbsExercise, Cardio } from '@shared/schema';
import { parseISODate } from '@/lib/utils';
import { Save, CheckCircle, ArrowLeft, Check, HelpCircle } from 'lucide-react';
import { ExerciseImageDialog } from '@/components/ExerciseImageDialog';
import { hasExerciseImage } from '@/lib/exercise-images';
import { useToast } from '@/hooks/use-toast';
import { useCursorEndOnFocus } from '@/hooks/use-cursor-end-on-focus';
import { WorkoutFinish, pickHeadline, type WorkoutFinishData } from '@/components/WorkoutFinish';
import {
  completedSetCount,
  newPersonalBests,
  previousOfSameType,
  workoutVolume,
} from '@/lib/workout-summary';
import { calculateDayStreak } from '@/lib/streak';
import { dismissFirstWorkoutTip, hasDismissedFirstWorkoutTip } from '@/lib/onboarding';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Above this, an elapsed time is measuring a forgotten tab rather than a
 * session, so nothing is recorded.
 */
const MAX_PLAUSIBLE_MINUTES = 4 * 60;


interface WorkoutPageProps {
  workout: Workout;
  onNavigateBack: () => void;
}

/**
 * The done/not-done mark for a warm-up row.
 *
 * Replaces a ✅ / ◯ pair of text glyphs, which rendered as a colour emoji
 * next to a thin outline character: two different sizes, two different
 * weights, and whatever the platform's emoji font felt like drawing.
 */
function Tick({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 ${
        done
          ? 'border-transparent bg-brand text-primary-foreground shadow-glow'
          : 'border-gray-300 text-transparent dark:border-gray-600'
      }`}
    >
      {done && <Check className="!size-3.5 animate-pop-in" strokeWidth={3.5} />}
    </span>
  );
}

export function WorkoutPage({ workout: initialWorkout, onNavigateBack }: WorkoutPageProps) {
  const [workout, setWorkout] = useState<Workout>(initialWorkout);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [autoSaveEnabled] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [celebrated, setCelebrated] = useState(false);
  const [finish, setFinish] = useState<WorkoutFinishData | null>(null);
  const [tipDismissed, setTipDismissed] = useState(hasDismissedFirstWorkoutTip);
  /** How many items are unticked, while asking whether to finish anyway. */
  const [confirmFinish, setConfirmFinish] = useState<number | null>(null);
  /** The warm-up exercise whose picture is open, if any. */
  const [preview, setPreview] = useState<string | null>(null);
  const customImageSlug = (name: string) =>
    localWorkoutStorage.getCustomExercises().find(e => e.name === name)?.imageSlug;
  const { updateWorkout, workouts } = useWorkoutStorage();
  const { toast, dismiss } = useToast();

  /**
   * What you walked in with, per exercise — the heaviest set logged in any
   * earlier session. The current workout is excluded, so today's typing does
   * not instantly become the record it is compared against.
   *
   * Memoised because it scans every stored workout, and this page re-renders
   * on each keystroke.
   */
  const [resetsVersion, setResetsVersion] = useState(0);
  const [resetting, setResetting] = useState<{ machine: string; current: PersonalBest } | null>(null);

  const bests = useMemo(
    () => personalBests(workouts, initialWorkout.id, localWorkoutStorage.getPersonalBestResets()),
    // `resetsVersion` re-reads the resets after one is saved; they live in
    // storage rather than state because nothing else needs to watch them.
    [workouts, initialWorkout.id, resetsVersion],
  );
  const focusToEnd = useCursorEndOnFocus();

  useEffect(() => {
    setWorkout(initialWorkout);
    workoutRef.current = initialWorkout;
    lastSavedRef.current = JSON.stringify(initialWorkout);
  }, [initialWorkout]);

  const lastSavedRef = useRef<string>(JSON.stringify(initialWorkout));
  const toastIdRef = useRef<string | null>(null);

  /**
   * The `updatedAt` this tab last saw on the stored record.
   *
   * Two tabs on the same workout each save their own complete copy of the
   * exercises array, so the later write erased the earlier one's sets — with
   * both screens still showing numbers that were no longer on disk. Sending
   * what we last saw lets the storage layer refuse rather than clobber.
   */
  const expectedUpdatedAtRef = useRef<Date | null>(initialWorkout.updatedAt ?? null);

  const workoutRef = useRef<Workout>(initialWorkout);
  const autoSaveEnabledRef = useRef<boolean>(true);

  const topRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    workoutRef.current = workout;
  }, [workout]);

  useEffect(() => {
    autoSaveEnabledRef.current = autoSaveEnabled;
  }, [autoSaveEnabled]);

  /**
   * `silent` is for the flush paths below — leaving the page or backgrounding
   * the app. Those save on the way out, and a toast that lands on the screen
   * you just navigated to is noise about something the user did not ask for.
   */
  const handleSave = useCallback(async ({ silent = false } = {}) => {
    const currentWorkout = workoutRef.current;
    if (!currentWorkout?.id) return;

    const serialized = JSON.stringify(currentWorkout);
    if (serialized === lastSavedRef.current) return;

    // Reaching here means something actually changed, which is the honest
    // moment a workout started — not when the record was created, since the
    // calendar can create one hours before anybody trains.
    const startedAt = currentWorkout.startedAt ?? new Date();

    try {
      const saved = await updateWorkout(
        currentWorkout.id,
        {
          exercises: currentWorkout.exercises,
          abs: currentWorkout.abs,
          cardio: currentWorkout.cardio,
          completed: currentWorkout.completed,
          duration: currentWorkout.duration,
          startedAt,
        },
        { expectedUpdatedAt: expectedUpdatedAtRef.current },
      );

      expectedUpdatedAtRef.current = saved?.updatedAt ?? new Date();
      lastSavedRef.current = serialized;
      setLastSavedAt(new Date());

      if (autoSaveEnabledRef.current && !silent) {
        if (toastIdRef.current) {
          dismiss(toastIdRef.current);
        }
        const { id } = toast({
          title: "Auto-saved",
          description: "Your workout progress has been saved",
          duration: 2000,
        });
        toastIdRef.current = id;
      }
    } catch (error) {
      console.error("Autosave failed", error);

      // Autosave retries every couple of seconds, so without stopping it the
      // same warning would fire on a loop — and every attempt would be another
      // chance to overwrite what the other tab saved.
      if (error instanceof ConcurrentEditError) {
        autoSaveEnabledRef.current = false;
      }

      toast({
        title:
          error instanceof ConcurrentEditError
            ? "Changed in another tab"
            : "Not saved to this device",
        description:
          error instanceof ConcurrentEditError || error instanceof StorageWriteError
            ? error.message
            : "Failed to save workout progress",
        variant: "destructive",
        duration: error instanceof ConcurrentEditError ? 10000 : undefined,
      });
    }
  }, [updateWorkout, toast, dismiss]);

  useEffect(() => {
    if (!autoSaveEnabled || !workout?.id) return;

    const timeoutId = setTimeout(handleSave, 2000);
    return () => clearTimeout(timeoutId);
  }, [workout, autoSaveEnabled, handleSave]);

  /*
   * Save on the way out.
   *
   * Autosave is a trailing 2s debounce and the effect above *cancels* it on
   * cleanup — which is right while the timer is merely being restarted by the
   * next keystroke, and wrong when the component is going away for good. Log a
   * set and leave within two seconds and the write never happened: measured at
   * 700ms after an edit the value was gone, at 2500ms it was saved.
   *
   * `pagehide` and `visibilitychange` cover the phone being locked or the app
   * being switched away from, which on a phone in a gym is the single most
   * common way a workout screen stops being looked at. Neither was handled
   * anywhere before this — an earlier check of mine claimed otherwise and was
   * measuring the debounce firing on its own.
   *
   * `handleSave` returns early when the serialised workout matches the last
   * write, so calling it on every one of these is a no-op when nothing changed.
   */
  const flushRef = useRef(handleSave);
  useEffect(() => {
    flushRef.current = handleSave;
  }, [handleSave]);

  useEffect(() => {
    const flush = () => {
      void flushRef.current({ silent: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      // Unmounting: navigating away, in-app back, or the route changing.
      flush();
    };
  }, []);


  useEffect(() => {
    // Find the first incomplete exercise
    const firstIncompleteIndex = workout.exercises.findIndex(e => !e.completed);
    if (firstIncompleteIndex !== -1) {
      setCurrentExerciseIndex(firstIncompleteIndex);
    }
  }, [workout.exercises]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [workout.id]);


  const handleExerciseUpdate = (exerciseIndex: number, updatedExercise: Exercise) => {
    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise, index) =>
        index === exerciseIndex ? updatedExercise : exercise
      ),
    }));
  };

  const handleAbsUpdate = (index: number, field: keyof AbsExercise, value: string | number | boolean | undefined) => {
    const updatedAbs = [...workout.abs];
    updatedAbs[index] = { ...updatedAbs[index], [field]: value };
    setWorkout(prev => ({ ...prev, abs: updatedAbs }));
  };

  const handleCardioUpdate = (field: keyof Cardio, value: string | boolean) => {
    const updatedCardio = { ...workout.cardio!, [field]: value };
    setWorkout(prev => ({ ...prev, cardio: updatedCardio }));
  };

  /*
   * Finishing no longer requires every box ticked.
   *
   * It used to refuse outright — "Please complete all exercises" — unless
   * every exercise, every core move and the cardio block were all done. One
   * machine in use, or no time for the treadmill, and the session could never
   * be finished: no finish screen, nothing on the calendar, a broken streak
   * for a workout that happened. Now anything unticked is named and asked
   * about once, and what was actually done is what gets recorded. Every total
   * downstream already counts completed sets only, so nothing skipped is
   * credited.
   */
  const handleCompleteWorkout = async (confirmed = false) => {
    const setsDone = workout.exercises.some(e => e.sets.some(s => s.completed));
    const anythingDone =
      setsDone || workout.abs.some(a => a.completed) || Boolean(workout.cardio?.completed);
    const outstanding = stats.totalItems - stats.completedItems;

    if (!anythingDone && stats.totalItems > 0) {
      toast({
        title: "Nothing logged yet",
        description: "Tick off what you did, then finish.",
        variant: "destructive"
      });
      return;
    }

    if (outstanding > 0 && !confirmed) {
      setConfirmFinish(outstanding);
      return;
    }
    setConfirmFinish(null);

    const completedExercises = workout.exercises.map((e) =>
      e.completed
        ? {
            ...e,
            sets: e.sets.map((s) => ({
              ...s,
              rest: (s.rest ?? '').trim() === '' ? '1:00' : s.rest,
            })),
          }
        : e
    );

    const completedWorkout = {
      ...workout,
      exercises: completedExercises,
      completed: true,
      duration: calculateWorkoutDuration(),
    };
    
    setWorkout(completedWorkout);
    
    try {
      /*
       * Deliberately not guarded by `expectedUpdatedAt`.
       *
       * Completing is an explicit, user-initiated action at the end of a
       * session. Refusing it over a concurrency check is a worse outcome than
       * the thing that check prevents, and doing so broke eight existing tests
       * by leaving people stranded on a workout they had just finished.
       */
      const saved = await updateWorkout(workout.id, {
        exercises: completedWorkout.exercises,
        abs: completedWorkout.abs,
        cardio: completedWorkout.cardio,
        completed: true,
        duration: completedWorkout.duration,
      });

      /*
       * Both refs must follow what was just written.
       *
       * Without this, completing raised "Changed in another tab" on the way
       * back to the calendar, with one tab open: the stored `updatedAt` moved
       * on here, this tab kept believing the older value, and the flush that
       * runs on navigation sent that stale expectation to a concurrency check
       * doing exactly its job.
       *
       * `lastSavedRef` matters too — without it the flush runs at all, despite
       * this write having just persisted everything.
       */
      expectedUpdatedAtRef.current = saved?.updatedAt ?? new Date();
      lastSavedRef.current = JSON.stringify(completedWorkout);

      // Any "Auto-saved" toast still on screen would sit on top of the
      // summary, saying something smaller about the same event.
      if (toastIdRef.current) dismiss(toastIdRef.current);

      const previous = previousOfSameType(workouts, completedWorkout);
      setFinish({
        type: completedWorkout.type,
        dateLabel: parseISODate(completedWorkout.date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        duration: completedWorkout.duration,
        volume: workoutVolume(completedWorkout),
        previousVolume: previous ? workoutVolume(previous) : undefined,
        sets: completedSetCount(completedWorkout),
        // The stored list has not re-rendered with this completion yet, so
        // count it in by hand.
        streak: calculateDayStreak(
          [...workouts.filter(w => w.id !== completedWorkout.id), completedWorkout],
          localWorkoutStorage.getStreakDays(),
        ),
        bests: newPersonalBests(completedWorkout, bests),
        headline: pickHeadline(),
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save completed workout",
        variant: "destructive"
      });
    }
  };

  /**
   * How long the workout actually took.
   *
   * This used to be `exercises * 5 + abs * 2 + cardio`, which for the default
   * workout is always exactly 82 minutes however long you were in the gym. It
   * fed Avg Duration on History and both exports, so a fabricated number was
   * sitting in backups looking like a measurement.
   *
   * Returns null rather than a guess when there is nothing to measure, or when
   * the result is implausible. Above the cap it is not a workout, it is a tab
   * left open — and no number is better than a wrong one.
   */
  const calculateWorkoutDuration = (): number | null => {
    const startedAt = workout.startedAt ? new Date(workout.startedAt) : null;
    if (!startedAt || Number.isNaN(startedAt.getTime())) return null;

    const minutes = Math.round((Date.now() - startedAt.getTime()) / 60_000);
    if (minutes < 0 || minutes > MAX_PLAUSIBLE_MINUTES) return null;

    // A workout logged in seconds is still a workout; do not report zero.
    return Math.max(minutes, 1);
  };

  const getProgressStats = () => {
    const completedExercises = workout.exercises.filter(e => e.completed).length;
    const totalExercises = workout.exercises.length;
    const completedAbs = workout.abs.filter(a => a.completed).length;
    const totalAbs = workout.abs.length;
    // Only count cardio when the workout actually has a cardio block, or the
    // total is permanently one higher than anything the user can complete.
    const hasCardio = Boolean(workout.cardio);
    const cardioComplete = hasCardio && workout.cardio?.completed ? 1 : 0;

    const totalItems = totalExercises + totalAbs + (hasCardio ? 1 : 0);
    const completedItems = completedExercises + completedAbs + cardioComplete;

    return {
      completedExercises,
      totalExercises,
      completedAbs,
      totalAbs,
      cardioComplete,
      totalItems,
      completedItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    };
  };

  const stats = getProgressStats();
  const showFirstTip =
    !tipDismissed && !workout.completed && !workouts.some(w => w.completed);

  useEffect(() => {
    if (
      !celebrated &&
      !workout.completed &&
      stats.totalItems > 0 &&
      stats.completedItems === stats.totalItems
    ) {
      // Everything is ticked: bring the one remaining action into view. This
      // used to fire confetti and a dialog here, and then a toast again on
      // Complete — two small celebrations for one event. The finish screen is
      // now the celebration, and it comes after the button, not before it.
      setCelebrated(true);
      completeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [stats.completedItems, stats.totalItems, workout.completed, celebrated]);

  return (
    <ErrorBoundary>
      <div className="max-w-md mx-auto p-4 space-y-5 scroll-mt-20" ref={topRef}>
      {/* Header */}
      <div className="flex animate-rise-in items-center gap-3">
        <Button
          aria-label="Go back"
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="h-10 w-10 shrink-0 rounded-full border border-gray-200/80 bg-card p-0 shadow-card dark:border-white/[0.06]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="eyebrow !text-primary">
            {parseISODate(workout.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <h1 className="truncate text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
            {workout.type}
          </h1>
        </div>
      </div>

      {/* Progress Header */}
      {/* Pinned under the app header, so how far through you are is on
          screen for the whole session instead of only at the top of a page
          that is several screens long. */}
      <Card className="sticky top-[4.25rem] z-20 border-gray-200/80 bg-card/85 backdrop-blur-xl dark:bg-gray-800/85">
        <CardContent className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-baseline space-x-1.5">
                <span className="eyebrow">Progress:</span>
                <span className="nums text-sm font-bold text-primary">
                  {stats.completedItems}/{stats.totalItems} items
                </span>
              </div>
              {/* Was a hardcoded ✅ — a status light with one possible state,
                  in the most valuable strip of the workout screen. A green
                  check also reads as "just saved" rather than "autosave is on".
                  The clock time is the thing you would actually want to know,
                  and it needs no ticking timer to stay true. */}
              <div className="flex items-center space-x-1">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {lastSavedAt ? 'Saved' : 'Auto-save on'}
                </span>
                {lastSavedAt && (
                  <span className="nums text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {lastSavedAt.toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            <div
              className="bg-brand h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Warmup */}
      {(workout.abs.length > 0 || workout.cardio) && (
        <div className="space-y-4">
          <h3 className="eyebrow px-1">Warmup</h3>

          {/* Core Section. Hidden when empty, which a cardio-only workout is:
              an empty headed card reads as something failing to load. */}
          {workout.abs.length > 0 && (
          <Card>
            <CardContent className="p-4">
              {/* "Abs Block" until core became its own muscle group and the
                  section stopped being only abs. */}
              <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Core Block</h3>
              {/*
                * space-y-3 put 16px between one row's tick and the next one's.
                *
                * These six sit in a column and are the controls people actually
                * mis-tap — reaching for one and unchecking the row above. The
                * set-completion circles are 304px apart and have never had the
                * problem.
                *
                * The fix is separation, not a bigger target: at 36px tall with a
                * 16px gap, widening the tap area to the usual 44px would cut the
                * gap to 8px, and taps that currently land in dead space and do
                * nothing would start hitting the neighbour instead. The dead
                * zone is what protects you here, so it gets bigger: 16px -> 24px.
                *
                * Costs ~40px on a 4472px page, because the Core Block is six
                * rows rather than the fifty this page has in total.
                */}
              <div className="space-y-5">
                {workout.abs.map((absExercise, index) => (
                  <div key={index} className="flex items-center justify-between">
                    {/* The name is the way in to its picture, as it is in the
                        builder. A separate "?" button would be one more small
                        target in the column people already mis-tap. */}
                    {hasExerciseImage(absExercise.name, customImageSlug(absExercise.name)) ? (
                      <button
                        type="button"
                        onClick={() => setPreview(absExercise.name)}
                        aria-label={`Show how to do ${absExercise.name}`}
                        className={`flex min-w-0 items-center gap-1.5 text-left text-sm font-medium transition-colors ${absExercise.completed ? 'text-gray-400 line-through decoration-gray-300 dark:text-gray-500 dark:decoration-gray-600' : 'text-gray-800 dark:text-gray-200'}`}
                      >
                        <span className="min-w-0">{absExercise.name}</span>
                        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className={`text-sm font-medium transition-colors ${absExercise.completed ? 'text-gray-400 line-through decoration-gray-300 dark:text-gray-500 dark:decoration-gray-600' : 'text-gray-800 dark:text-gray-200'}`}>
                        {absExercise.name}
                      </span>
                    )}
                    <div className="flex items-center space-x-2">
                      {absExercise.reps !== undefined ? (
                        <>
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*"
                            aria-label={`Reps for ${absExercise.name}`}
                            value={absExercise.reps}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              handleAbsUpdate(
                                index,
                                'reps',
                                value === '' ? undefined : parseInt(value, 10)
                              );
                            }}
                            onFocus={focusToEnd}
                            className="w-16 text-sm"
                            placeholder="reps"
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">reps</span>
                        </>
                      ) : (
                        <>
                          <Input
                            type="text"
                            aria-label={`Time for ${absExercise.name}`}
                            value={absExercise.time || ''}
                            onChange={(e) => handleAbsUpdate(index, 'time', e.target.value)}
                            className="w-16 text-sm"
                            placeholder="time"
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">time</span>
    </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Mark ${absExercise.name} ${absExercise.completed ? 'incomplete' : 'complete'}`}
                        onClick={() =>
                          handleAbsUpdate(index, 'completed', !absExercise.completed)
                        }
                        className="hover:bg-transparent"
                      >
                        <Tick done={Boolean(absExercise.completed)} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Cardio Section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Cardio Block</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Mark cardio ${workout.cardio?.completed ? 'incomplete' : 'complete'}`}
                  onClick={() => handleCardioUpdate('completed', !workout.cardio?.completed)}
                  className="hover:bg-transparent"
                >
                  <Tick done={Boolean(workout.cardio?.completed)} />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
                  <Select
                    value={workout.cardio?.type || 'Treadmill'}
                    onValueChange={(value) => handleCardioUpdate('type', value as any)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Treadmill">Treadmill</SelectItem>
                      <SelectItem value="Bike">Bike</SelectItem>
                      <SelectItem value="Elliptical">Elliptical</SelectItem>
                      <SelectItem value="Rowing">Rowing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</label>
                    <Input
                      type="text"
                      aria-label="Cardio duration"
                      value={workout.cardio?.duration || ''}
                      onChange={(e) => handleCardioUpdate('duration', e.target.value)}
                      className="w-20 text-sm"
                      placeholder="mm:ss"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Distance:</label>
                    <Input
                      type="text"
                      aria-label="Cardio distance"
                      value={workout.cardio?.distance || ''}
                      onChange={(e) => handleCardioUpdate('distance', e.target.value)}
                      className="w-20 text-sm"
                      placeholder="miles"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Workout. A cardio-only workout has none, and a bare heading over
          nothing looks like a rendering failure rather than an empty section. */}
      {workout.exercises.length > 0 && (
      <div className="space-y-4">
        <h3 className="eyebrow px-1">Main Workout</h3>

        {/*
          * Said once, on the first workout, where the question comes up.
          *
          * The built-in templates arrive with weights filled in, and nothing
          * said whose they were. A newcomer met "Pec Fly, 160 lbs" as if it
          * were an instruction. Gone for good after the first finished
          * workout, or sooner if dismissed.
          */}
        {showFirstTip && (
          <div
            data-testid="first-workout-tip"
            className="animate-rise-in rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 text-sm leading-relaxed text-gray-700 dark:text-gray-200"
          >
            <p className="font-semibold text-gray-900 dark:text-white">The numbers are a starting point</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Change any weight or rep count to what you actually do. IronPath remembers it for next time.</li>
              <li>Tap the tick after each set.</li>
              <li>Skip whatever you can't do today. You can finish the workout without it.</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                dismissFirstWorkoutTip();
                setTipDismissed(true);
              }}
              className="mt-2.5 text-sm font-semibold text-primary"
            >
              Got it
            </button>
          </div>
        )}

        {workout.exercises.map((exercise, index) => (
          <ErrorBoundary key={`${exercise.machine}-${index}`}>
            <ExerciseForm
              exercise={exercise}
              onUpdate={(updatedExercise) => handleExerciseUpdate(index, updatedExercise)}
              isActive={index === currentExerciseIndex}
              personalBest={bests.get(exercise.machine)}
              onResetBest={(machine, current) => setResetting({ machine, current })}
            />
          </ErrorBoundary>
        ))}
      </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3" ref={completeRef}>
        <Button
          onClick={() => handleSave()}
          variant="outline"
          size="lg"
          className="w-full"
        >
          <Save className="h-4 w-4" />
          Save Workout
        </Button>
        
          <Button
            onClick={() => handleCompleteWorkout()}
            size="lg"
            className={`w-full ${celebrated && !workout.completed ? 'animate-pulse [animation-duration:1.6s]' : ''}`}
            disabled={workout.completed ?? false}
          >
          <CheckCircle className="h-4 w-4" />
          {workout.completed ? 'Workout Completed' : 'Complete Workout'}
        </Button>
      </div>
      </div>
      <ExerciseImageDialog
        exerciseName={preview ?? ''}
        imageSlug={preview ? customImageSlug(preview) : undefined}
        open={preview !== null}
        onOpenChange={isOpen => !isOpen && setPreview(null)}
      />

      <AlertDialog
        open={confirmFinish !== null}
        onOpenChange={isOpen => !isOpen && setConfirmFinish(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish now?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmFinish} of {stats.totalItems} {stats.totalItems === 1 ? 'item is' : 'items are'} not
              fully ticked off. Only the sets you ticked are recorded, and the workout still
              counts for today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleCompleteWorkout(true)}>
              Finish workout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WorkoutFinish
        data={finish}
        onDone={() => {
          setFinish(null);
          onNavigateBack();
        }}
      />

      <ResetPersonalBestDialog
        machine={resetting?.machine ?? null}
        current={resetting?.current}
        onClose={() => setResetting(null)}
        onReset={({ manual }) => {
          if (resetting) {
            localWorkoutStorage.savePersonalBestReset({
              machine: resetting.machine,
              resetOn: new Date().toISOString().slice(0, 10),
              manual,
            });
            setResetsVersion(v => v + 1);
          }
          setResetting(null);
        }}
      />
    </ErrorBoundary>
  );
}
