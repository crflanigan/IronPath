import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Exercise, ExerciseSet } from '@shared/schema';
import { Check, Clock, HelpCircle } from 'lucide-react';
import { ExerciseImageDialog } from './ExerciseImageDialog';
import { useToast } from '@/hooks/use-toast';
import { useCursorEndOnFocus } from '@/hooks/use-cursor-end-on-focus';
import { hasExerciseImage } from '@/lib/exercise-images';
import { formatBestDate, type PersonalBest } from '@/lib/personal-best';
import { localWorkoutStorage } from '@/lib/storage';

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

  const markSetComplete = (setIndex: number) => {
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

    if (difference > 0) return { change: `↑ +${difference} lbs`, color: 'text-blue-600' };
    if (difference < 0) return { change: `↓ ${Math.abs(difference)} lbs`, color: 'text-red-600' };
    return { change: '', color: '' };
  };

  const borderColor = localExercise.completed ? 'border-green-500' : 
                     isActive ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600';

  return (
    <>
    <Card className={`border-l-4 ${borderColor}`}>
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
              <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                {localExercise.machine}
              </span>
              {topSet?.weight !== undefined && (
                <span className="block text-xs text-gray-600 dark:text-gray-400">
                  {topSet.weight} lbs{topSet.reps !== undefined && ` × ${topSet.reps} reps`}
                </span>
              )}
            </span>
            <Check className="h-5 w-5 shrink-0 text-green-500" />
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
              <h4 className="font-medium text-gray-900 dark:text-white">{localExercise.machine}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {localExercise.region} • {localExercise.feel} Feel
              </p>
            </button>
          ) : (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{localExercise.machine}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
            {localExercise.completed && <Check className="h-5 w-5 text-green-500" />}
            {isActive && !localExercise.completed && <Clock className="h-5 w-5 text-blue-500" />}
          </div>
        </div>

        {/* Sets */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Sets
          </div>
          
          {localExercise.sets.map((set, index) => {
            const status = getSetStatus(set, index);
            const weightError = set.weight === undefined;
            const repsError = set.reps === undefined;
            const restError = (set.rest ?? '').trim() === '' && set.completed;
            
            return (
              <div
                key={index}
                className={`flex items-center space-x-2 p-2 rounded ${
                  status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                  status === 'current' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
                  'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <span className={`text-sm font-medium w-8 ${
                  status === 'completed' ? 'text-green-600 dark:text-green-400' :
                  status === 'current' ? 'text-blue-600 dark:text-blue-400' :
                  'text-gray-400 dark:text-gray-500'
                }`}>
                  {index + 1}
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
                  className={`w-16 text-sm ${weightError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
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
                  className={`w-14 text-sm ${repsError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
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
                  className={`w-16 text-sm ${restError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  placeholder="rest"
                  disabled={false}
                />
                
                {status === 'current' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Mark set ${index + 1} complete`}
                    onClick={() => markSetComplete(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✓
                  </Button>
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
            className="mt-2 flex w-full items-center space-x-2 rounded text-left disabled:cursor-default"
          >
            <span className="text-xs text-gray-500 dark:text-gray-400">BEST:</span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
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
