import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import confetti from 'canvas-confetti';
import { Check, Dumbbell, Flame, Layers, Timer, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NewBest } from '@/lib/workout-summary';
import { formatBestDate } from '@/lib/personal-best';

/** "1 lb", "60 lbs". */
const lbs = (n: number) => `${n} ${n === 1 ? 'lb' : 'lbs'}`;

/**
 * The end of a workout.
 *
 * Finishing used to produce a toast and, two seconds later, the calendar —
 * the same thing that happens when you save a setting. An hour of work
 * deserves a moment that says what the hour amounted to: how long, how much
 * weight, and whether you left stronger than you arrived.
 *
 * It waits for a tap rather than dismissing itself. The old timer existed
 * because there was nothing to read.
 *
 * It no longer compares the total with the last session of the same workout
 * ("2,394 lbs more than your last…"). That difference mostly measured how many
 * sets were ticked each time, not strength, and read as a gimmick to the
 * person it was congratulating. Strength shows where it is real: per
 * exercise, as a personal best.
 */

export interface WorkoutFinishData {
  type: string;
  dateLabel: string;
  /** Minutes, or null when the session could not be timed honestly. */
  duration: number | null;
  volume: number;
  sets: number;
  streak: number;
  bests: NewBest[];
  /** Chosen when the workout is completed, so it is stable while on screen. */
  headline: readonly [string, string];
}

/** A different line each time; pick one when the workout is finished. */
export function pickHeadline(): readonly [string, string] {
  return headlines[Math.floor(Math.random() * headlines.length)];
}

const headlines = [
  ['Workout complete', 'You crushed it today.'],
  ['Nice work', 'That session was all you.'],
  ['Mission accomplished', 'Another one in the books.'],
  ['You did it', 'Great job pushing through.'],
  ['Nailed it', 'Focused, and finished strong.'],
  ['Way to go', 'That kind of effort gets results.'],
] as const;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

/** Counts up to `target` once, so the figures arrive rather than just appear. */
function useCountUp(target: number, run: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    // With reduced motion the figure simply arrives on the first frame.
    const instant = prefersReducedMotion() || target === 0;
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = instant ? 1 : Math.min((now - start) / duration, 1);
      // Ease-out: fast at first, settling into the final figure.
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, run]);
  return value;
}

function celebrate(gold: boolean) {
  if (prefersReducedMotion()) return;
  try {
    const colors = gold
      ? ['#f59e0b', '#fbbf24', '#fde68a', '#14b8a6', '#ffffff']
      : ['#14b8a6', '#2dd4bf', '#99f6e4', '#0891b2', '#ffffff'];
    const burst = (x: number, angle: number) =>
      confetti({ particleCount: 70, spread: 65, angle, origin: { x, y: 0.75 }, colors, zIndex: 100 });
    burst(0, 60);
    burst(1, 120);
    if (gold) {
      window.setTimeout(
        () => confetti({ particleCount: 90, spread: 100, origin: { y: 0.35 }, colors, zIndex: 100 }),
        350,
      );
    }
  } catch {
    // Confetti is decoration. A canvas that will not draw must not cost
    // anyone their summary.
  }
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  tone,
  testId,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
  unit?: string;
  tone: string;
  testId: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-card p-3.5 shadow-card dark:border-white/[0.06]">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1" data-testid={testId}>
          <span className="nums text-2xl font-bold leading-none text-gray-900 dark:text-white">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{unit}</span>
          )}
        </div>
        <div className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export function WorkoutFinish({
  data,
  onDone,
}: {
  data: WorkoutFinishData | null;
  onDone: () => void;
}) {
  const open = data !== null;
  const [title, subtitle] = data?.headline ?? headlines[0];

  const hasBests = (data?.bests.length ?? 0) > 0;
  useEffect(() => {
    if (open) celebrate(hasBests);
  }, [open, hasBests]);

  const volume = useCountUp(data?.volume ?? 0, open);
  const minutes = useCountUp(data?.duration ?? 0, open);
  const sets = useCountUp(data?.sets ?? 0, open);
  const streak = useCountUp(data?.streak ?? 0, open);


  return (
    <DialogPrimitive.Root open={open} onOpenChange={next => !next && onDone()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          data-testid="workout-finish"
          aria-describedby={undefined}
          onOpenAutoFocus={event => event.preventDefault()}
          className="app-backdrop fixed inset-0 z-50 overflow-y-auto bg-gray-50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-300 dark:bg-gray-900"
        >
          {data && (
            <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
              <div className="flex flex-col items-center text-center">
                <span className="relative flex h-20 w-20 items-center justify-center">
                  <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:1.8s] [animation-iteration-count:2]" />
                  <span className="bg-brand relative flex h-20 w-20 animate-pop-in items-center justify-center rounded-full text-primary-foreground shadow-glow">
                    <Check className="h-9 w-9" strokeWidth={3} aria-hidden="true" />
                  </span>
                </span>
                <p className="eyebrow mt-5 animate-rise-in !text-primary">
                  {data.type} · {data.dateLabel}
                </p>
                <DialogPrimitive.Title className="mt-1 animate-rise-in text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {title}
                </DialogPrimitive.Title>
                <p className="mt-1 animate-rise-in text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
              </div>

              <div className="mt-6 grid animate-rise-in grid-cols-2 gap-3 [animation-delay:120ms]">
                <Stat
                  icon={Timer}
                  label="Duration"
                  value={data.duration === null ? '—' : String(minutes)}
                  unit={data.duration === null ? undefined : 'min'}
                  tone="bg-sky-500/10 text-sky-500"
                  testId="finish-duration"
                />
                <Stat
                  icon={Dumbbell}
                  label="Weight moved"
                  value={volume.toLocaleString()}
                  unit="lbs"
                  tone="bg-primary/10 text-primary"
                  testId="finish-volume"
                />
                <Stat
                  icon={Layers}
                  label="Sets completed"
                  value={String(sets)}
                  tone="bg-violet-500/10 text-violet-500"
                  testId="finish-sets"
                />
                <Stat
                  icon={Flame}
                  label="Day streak"
                  value={String(streak)}
                  tone="bg-orange-500/10 text-orange-500"
                  testId="finish-streak"
                />
              </div>

              {hasBests && (
                <div className="mt-5 animate-rise-in [animation-delay:280ms]" data-testid="finish-bests">
                  <h3 className="eyebrow mb-2 px-1 !text-amber-600 dark:!text-amber-400">
                    {data.bests.length === 1 ? 'New personal best' : `${data.bests.length} new personal bests`}
                  </h3>
                  <ul className="space-y-2">
                    {data.bests.map(best => (
                      <li
                        key={best.machine}
                        className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/15 to-amber-500/5 p-3.5"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-[0_6px_18px_-6px_rgb(245_158_11/0.7)]">
                          <Trophy className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {best.machine}
                          </div>
                          <div className="nums text-xs text-gray-500 dark:text-gray-400">
                            {/* Dated, so a figure that looks wrong can be traced to
                                the day it was ticked, and reset from that exercise's
                                BEST line if it was a slip. */}
                            was {lbs(best.previous.weight)} × {best.previous.reps}
                            {best.previous.date && <> · {formatBestDate(best.previous.date)}</>}
                            {best.previous.manual && <> · set by you</>}
                          </div>
                        </div>
                        <div className="nums shrink-0 text-right">
                          <div className="text-base font-bold text-gray-900 dark:text-white">
                            {lbs(best.weight)} × {best.reps}
                          </div>
                          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            {best.weight > best.previous.weight
                              ? `+${lbs(best.weight - best.previous.weight)}`
                              : `+${best.reps - best.previous.reps} ${best.reps - best.previous.reps === 1 ? 'rep' : 'reps'}`}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-auto pt-8">
                <Button size="lg" className="w-full" onClick={onDone}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
