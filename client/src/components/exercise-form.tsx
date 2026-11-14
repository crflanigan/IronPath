import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Exercise, ExerciseSet } from '@shared/schema';
import { Check, HelpCircle, Trophy } from 'lucide-react';
import { ExerciseImageDialog } from './ExerciseImageDialog';
import { useToast } from '@/hooks/use-toast';
import { useCursorEndOnFocus } from '@/hooks/use-cursor-end-on-focus';
import { hasExerciseImage } from '@/lib/exercise-images';
import { formatBestDate, type PersonalBest } from '@/lib/personal-best';
import { localWorkoutStorage } from '@/lib/storage';
import { recordSetIndex } from '@/lib/workout-summary';
import confetti from 'canvas-confetti';

interface ExerciseFormProps {
  exercise: Exercise;
  onUpdate: (exercise: Exercise) => void;
  isActive?: boolean;
  /**
   * The heaviest set logged for this exercise before today, or undefined if it
   * has never been logged. Derived from stored workouts by `personalBests` and
   * passed in, rather than read off the exercise — the `bestWeight` that used
   * to live there was a template constant, identical for everyone and frozen
   * forever.
   */
  personalBest?: PersonalBest;
  /**
   * Opens the reset for this exercise. Omitted in contexts where resetting
   * makes no sense, in which case the line renders as plain text.
   */
  onResetBest?: (machine: string, current: PersonalBest) => void;
}

export function ExerciseForm({ exercise, onUpdate, isActive = false, personalBest, onResetBest }: ExerciseFormProps) {
  const [localExercise, setLocalExercise] = useState<Exercise>(exercise);
  const [restDigits, setRestDigits] = useState<string[]>(
    exercise.sets.map((s) => s.rest?.replace(/\D/g, '') || '')
  );
  const [showHelp, setShowHelp] = useState(false);

  /*
   * A finished exercise folds to one line.
   *
   * The workout page measured 4628px — five and a half screens — with ten
   * completed cards at ~304px each. Every set meant scrolling past everything
   * already done to reach the thing being done now, which is friction on every
   * single set rather than once per session.
   *
   * Seeded from completion *at mount*, deliberately, rather than tracking it.
   * An exercise already finished when you arrive is folded. One you finish
   * right now stays open: collapsing it the instant you tick the last set
   * would pull 240px out from under the finger still resting on that circle,
   * and those circles are already the easiest thing in the app to hit by
   * mistake — folding on a mis-tap hides the control needed to undo it.
   *
   * Either way it is a per-session choice, so correcting a number is one tap
   * and leaving the screen resets it to folded.
   */
  const [expanded, setExpanded] = useState(!exercise.completed);
  const collapsed = localExercise.completed && !expanded;

  /** The heaviest set, which is what you want to see at a glance. */
  const topSet = localExercise.sets.reduce<{ weight?: number; reps?: number } | null>(
    (best, set) =>
      typeof set.weight === 'number' && (!best || set.weight > (best.weight ?? -1)) ? set : best,
    null,
  );
  const { toast } = useToast();
  const focusToEnd = useCursorEndOnFocus();

  // No point offering help that resolves to a placeholder.
  const hasReferencePhoto = hasExerciseImage(
    localExercise.machine,
    localWorkoutStorage.getCustomExercises().find(e => e.name === localExercise.machine)?.imageSlug,
  );

  const isSetComplete = (set: ExerciseSet) =>
    set.weight !== undefined && set.reps !== undefined;

  const formatRest = (digits: string) => {
    if (digits.length === 0) return '';
    return digits.length <= 2
      ? `0:${digits.padStart(2, '0')}`
      : `${parseInt(digits.slice(0, -2))}:${digits.slice(-2)}`;
  };

  const updateSet = (
    setIndex: number,
    field: keyof ExerciseSet,
    value: string | number | boolean | undefined
  ) => {
    const updatedSets = [...localExercise.sets];
    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      [field]: value
    };


    const exerciseCompleted = updatedSets.every(s => s.completed);
    const updatedExercise = {
      ...localExercise,
      sets: updatedSets,
      completed: exerciseCompleted
    };
    setLocalExercise(updatedExercise);
    onUpdate(updatedExercise);
  };

  /**
   * The set that currently holds a new personal best, if there is one.
   *
   * Derived rather than remembered, so it is right after a reload, moves if a
   * later set goes heavier still, and disappears if the number is corrected
   * back down — a badge that only appeared at the moment of the tap would be
   * a claim nobody could check thirty seconds later.
   */
  const recordIndex = recordSetIndex(localExercise, personalBest);

  /** A small gold burst from the tick itself, the moment a record falls. */
  const celebrateRecord = (from: HTMLElement | null) => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const box = from?.getBoundingClientRect();
      confetti({
        particleCount: 45,
        spread: 70,
        startVelocity: 28,
        scalar: 0.8,
        origin: box
          ? {
              x: (box.left + box.width / 2) / window.innerWidth,
              y: (box.top + box.height / 2) / window.innerHeight,
            }
          : { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#fde68a', '#ffffff'],
      });
    } catch {
      // Decoration only.
    }
  };

  const markSetComplete = (setIndex: number, from: HTMLElement | null = null) => {
    const set = localExercise.sets[setIndex];
    if (!isSetComplete(set)) {
      toast({
        title: 'Set incomplete',
        description: 'Enter weight and reps first',
        variant: 'destructive'
      });
      return;
    }

    const updatedSets = [...localExercise.sets];
    const rest = (set.rest ?? '').trim() === '' ? '1:00' : set.rest!;
    updatedSets[setIndex] = { ...updatedSets[setIndex], rest, completed: true };
    setRestDigits((prev) => {
      const copy = [...prev];
      copy[setIndex] = rest.replace(/\D/g, '');
      return copy;
    });

    const exerciseCompleted = updatedSets.every(s => s.completed);
    const updatedExercise = {
      ...localExercise,
      sets: updatedSets,
      completed: exerciseCompleted,
    };
    setLocalExercise(updatedExercise);
    onUpdate(updatedExercise);

    // Only the set that takes the record celebrates: a second set at the same
    // weight is good work, not a second record.
    if (recordSetIndex(updatedExercise, personalBest) === setIndex && recordIndex !== setIndex) {
      celebrateRecord(from);
    }
  };

  const getSetStatus = (set: ExerciseSet, index: number) => {
    if (set.completed) return 'completed';
    if (index === localExercise.sets.findIndex(s => !s.completed)) return 'current';
    return 'pending';
  };

  // A previous best only exists once the exercise has actually been logged.
  // Until then there is nothing true to show, so the line is not rendered at
  // all — better than an invented number, and one less thing on the screen
  // during a first workout.
  const hasRecordedBest = personalBest !== undefined;

  const getWeightChange = () => {
    if (!hasRecordedBest) return { change: '', color: '' };

    const weights = localExercise.sets.map(s => s.weight ?? 0);
    const currentWeight = weights.length > 0 ? Math.max(...weights) : 0;
    const difference = currentWeight - personalBest!.weight;

    if (difference > 0) return { change: `↑ +${difference} lbs`, color: 'text-emerald-600 dark:text-emerald-400' };
    if (difference < 0) return { change: `↓ ${Math.abs(difference)} lbs`, color: 'text-red-500' };
    return { change: '', color: '' };
  };

  /*
   * State is carried by the whole card, not by a coloured stripe down its
   * left edge. The stripe was three colours of the same 4px line: easy to
   * miss, and green/blue/grey said nothing the eye could read at a scroll.
   * Now the exercise you are on is lit — a brand ring and a soft glow — the
   * finished ones recede, and everything else is a plain card.
   */
  const cardTone = localExercise.completed
    ? 'bg-primary/[0.06] border-primary/20 dark:bg-primary/[0.07] dark:border-primary/20 shadow-none'
    : isActive
      ? 'border-primary/50 dark:border-primary/50 ring-1 ring-primary/30 shadow-[0_10px_32px_-16px_var(--primary)]'
      : '';

  return (
    <>
    <Card data-exercise-card className={`transition-shadow duration-300 ${cardTone}`}>
      {collapsed ? (
        <CardContent className="p-3">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            aria-label={`Show ${localExercise.machine}`}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="min-w-0 flex-1 pr-3">
              <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                {localExercise.machine}
              </span>
              {topSet?.weight !== undefined && (
                <span className="nums block text-xs text-gray-500 dark:text-gray-400">
                  {topSet.weight} lbs{topSet.reps !== undefined && ` × ${topSet.reps} reps`}
                </span>
              )}
            </span>
            {recordIndex !== -1 && (
              <Trophy className="mr-2 h-4 w-4 shrink-0 text-amber-500" aria-label="New personal best" />
            )}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
            </span>
          </button>
        </CardContent>
      ) : (
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          {/*
            * Foldable again once finished, so checking a number does not leave
            * the card open for the rest of the session. Not a button at all
            * while the exercise is unfinished — there is nothing to fold.
            */}
          {localExercise.completed ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-expanded={true}
              aria-label={`Hide ${localExercise.machine}`}
              className="min-w-0 flex-1 pr-2 text-left"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white">{localExercise.machine}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {localExercise.region} • {localExercise.feel} Feel
              </p>
            </button>
          ) : (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">{localExercise.machine}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {localExercise.region} • {localExercise.feel} Feel
              </p>
            </div>
          )}
          <div className="flex items-center space-x-2">
            {hasReferencePhoto && (
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                /*
                 * The icon is 20x20 — a hard thing to hit accurately with a
                 * thumb, one-handed, between sets, which is exactly how this
                 * screen is used.
                 *
                 * `before` is a 44x44 hit area centred on the icon. It is
                 * absolutely positioned, so it takes part in no layout and the
                 * row height does not change. Growing the button itself would
                 * add roughly 400px to this page, which is the opposite of
                 * what it needs.
                 *
                 * Safe to expand here specifically: the nearest neighbouring
                 * control measures 59px away, and this zone reaches 12px per
                 * side, leaving ~47px of separation. It cannot steal an
                 * adjacent tap.
                 */
                className="relative text-gray-500 hover:text-primary before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="sr-only">{`Show reference photo for ${localExercise.machine}`}</span>
              </button>
            )}
            {localExercise.completed && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
              </span>
            )}
            {isActive && !localExercise.completed && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Now
              </span>
            )}
          </div>
        </div>

        {/* Sets */}
        <div className="space-y-2">
          {/* Column heads. The placeholders said the same thing, but only
              while a field was empty — and these are prefilled from last time,
              so in practice the three boxes were never labelled. */}
          <div className="eyebrow flex items-center space-x-2 px-2" aria-hidden="true">
            <span className="w-8">Sets</span>
            <span className="w-16 text-center">lbs</span>
            <span className="w-2" />
            <span className="w-14 text-center">reps</span>
            <span className="w-16 text-center">rest</span>
          </div>
          <div className="sr-only">Sets</div>
          
          {localExercise.sets.map((set, index) => {
            const status = getSetStatus(set, index);
            const weightError = set.weight === undefined;
            const repsError = set.reps === undefined;
            const restError = (set.rest ?? '').trim() === '' && set.completed;
            
            return (
              <div
                key={index}
                className={`flex items-center space-x-2 rounded-xl border p-2 transition-colors duration-200 ${
                  status === 'completed' ? 'border-transparent bg-primary/10 dark:bg-primary/[0.12]' :
                  status === 'current' ? 'border-primary/40 bg-card shadow-sm dark:bg-white/[0.03]' :
                  'border-transparent bg-gray-50 dark:bg-white/[0.03]'
                }`}
              >
                <span className="flex w-8 shrink-0 items-center">
                  <span className={`nums flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    status === 'completed' ? 'bg-primary text-primary-foreground' :
                    status === 'current' ? 'bg-primary/15 text-primary' :
                    'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                  }`}>
                    {status === 'completed' ? <Check className="h-3 w-3 animate-pop-in" strokeWidth={4} aria-label={String(index + 1)} /> : index + 1}
                  </span>
                </span>
                
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  aria-label={`Weight, set ${index + 1}`}
                  value={set.weight ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*$/.test(v)) {
                      updateSet(index, 'weight', v === '' ? undefined : parseInt(v));
                    }
                  }}
                  onFocus={focusToEnd}
                  className={`nums w-16 px-1 text-center text-sm font-semibold ${weightError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  placeholder="lbs"
                  disabled={false}
                />
                
                <span className="text-xs text-gray-500 dark:text-gray-400">×</span>
                
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  aria-label={`Reps, set ${index + 1}`}
                  value={set.reps ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*$/.test(v)) {
                      updateSet(index, 'reps', v === '' ? undefined : parseInt(v));
                    }
                  }}
                  onFocus={focusToEnd}
                  className={`nums w-14 px-1 text-center text-sm font-semibold ${repsError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  placeholder="reps"
                  disabled={false}
                />
                
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9:]*"
                  aria-label={`Rest, set ${index + 1}`}
                  value={set.rest ?? ''}
                  onChange={(e) => {
                    const inputEv = e.nativeEvent as InputEvent;
                    let digits = restDigits[index] || '';

                    if (inputEv.inputType?.startsWith('delete')) {
                      digits = digits.slice(0, -1);
                    } else if (inputEv.inputType === 'insertFromPaste') {
                      digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                    } else {
                      const char = inputEv.data ?? '';
                      if (/^\d$/.test(char) && digits.length < 3) {
                        digits += char;
                      }
                    }

                    setRestDigits((prev) => {
                      const copy = [...prev];
                      copy[index] = digits;
                      return copy;
                    });
                    updateSet(index, 'rest', formatRest(digits));
                  }}
                  className={`nums w-16 px-1 text-center text-sm font-medium text-gray-600 dark:text-gray-300 ${restError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  placeholder="rest"
                  disabled={false}
                />
                
                {status === 'current' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Mark set ${index + 1} complete`}
                    onClick={(event) => markSetComplete(index, event.currentTarget)}
                    className="bg-brand h-9 w-9 shrink-0 rounded-full p-0 text-primary-foreground shadow-glow hover:bg-transparent hover:text-primary-foreground hover:brightness-110"
                  >
                    <Check className="!size-4" strokeWidth={3} aria-hidden="true" />
                  </Button>
                )}

                {/* Said here, on the row, at the moment it happens — not only
                    in the BEST line underneath, which reports the old figure
                    and leaves you to do the subtraction. */}
                {recordIndex === index && (
                  <span
                    data-testid="set-record"
                    className="flex h-7 shrink-0 animate-pop-in items-center gap-1 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-2 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-[0_4px_14px_-4px_rgb(245_158_11/0.8)]"
                  >
                    <Trophy className="h-3 w-3" aria-hidden="true" />
                    PR
                    <span className="sr-only"> — new personal best</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/*
          * Best Performance — omitted entirely when there is nothing to
          * compare against.
          *
          * The date is not decoration. Without it this was an unattributed
          * number you had to take on faith, and a real user spent a year with
          * a Seated Dip "best" of 140lbs she had never lifted — a template
          * default ticked through once in July 2025. A date from a year ago,
          * on a workout she does not do, would have told her immediately.
          *
          * Tapping it opens the reset, because that is where you are when you
          * decide the figure no longer represents you.
          */}
        {hasRecordedBest && (
          <button
            type="button"
            onClick={() => onResetBest?.(localExercise.machine, personalBest!)}
            disabled={!onResetBest}
            className="mt-3 flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-gray-100 pt-3 text-left disabled:cursor-default dark:border-white/[0.06]"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <span className="eyebrow">BEST:</span>
            <span className="nums text-xs font-semibold text-gray-700 dark:text-gray-200">
              {personalBest!.weight} lbs × {personalBest!.reps} reps
            </span>
            {personalBest!.date && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatBestDate(personalBest!.date)}
              </span>
            )}
            {personalBest!.manual && (
              <span className="text-xs text-gray-400 dark:text-gray-500">set by you</span>
            )}
            {getWeightChange().change && (
              <span className={`text-xs ${getWeightChange().color}`}>
                {getWeightChange().change}
              </span>
            )}
          </button>
        )}
      </CardContent>
      )}
    </Card>
    <ExerciseImageDialog
      exerciseName={localExercise.machine}
      open={showHelp}
      onOpenChange={setShowHelp}
    />
    </>
  );
}
