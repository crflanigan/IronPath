import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { formatSeconds, restTimerSoundEnabled } from '@/lib/workout-prefs';

/**
 * The rest countdown that starts when a set is ticked.
 *
 * Every set already carried a rest time, but it was only a number in a box:
 * you ticked the set, then watched a clock on the gym wall. Now the tick
 * starts the count.
 *
 * It counts toward a moment in time (`endsAt`) rather than decrementing a
 * number, so a phone that sleeps or a tab that is backgrounded mid-rest comes
 * back showing the right figure instead of resuming from where it froze.
 */
export interface RestState {
  endsAt: number;
  /** Full length in seconds, for the progress bar. Grows with +30s. */
  total: number;
}

let audio: AudioContext | null = null;

/**
 * Must be called from inside a tap. Browsers only let a page make sound after
 * a gesture, and the end of a countdown is not one — so the context is woken
 * by the tick that starts the rest and is still awake when it ends.
 */
export function primeRestSound(): void {
  if (!restTimerSoundEnabled()) return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audio ??= new Ctor();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
  } catch {
    // No sound, then. The pill and the vibration still say it.
  }
}

function signalDone(): void {
  try {
    navigator.vibrate?.([180, 90, 180]);
  } catch {
    // Unsupported (every iOS browser) or blocked.
  }
  if (!restTimerSoundEnabled() || !audio || audio.state !== 'running') return;
  try {
    const now = audio.currentTime;
    for (const [offset, frequency] of [[0, 880], [0.22, 1175]] as const) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.2);
    }
  } catch {
    // Decoration only.
  }
}

/** How long "Go" stays up after the count reaches zero. */
const DONE_LINGER_MS = 4000;

export function RestTimer({
  rest,
  onChange,
}: {
  rest: RestState | null;
  onChange: (next: RestState | null) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const signalled = useRef<number | null>(null);

  useEffect(() => {
    if (!rest) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= rest.endsAt) {
        if (signalled.current !== rest.endsAt) {
          signalled.current = rest.endsAt;
          // Not if the count ran out long ago while the phone was asleep:
          // buzzing on wake, minutes late, tells nobody anything.
          if (current - rest.endsAt < 1500) signalDone();
        }
        if (current >= rest.endsAt + DONE_LINGER_MS) onChange(null);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [rest, onChange]);

  if (!rest) return null;

  const remaining = (rest.endsAt - now) / 1000;
  const done = remaining <= 0;
  const fraction = done ? 0 : Math.min(1, remaining / rest.total);

  return (
    <div
      data-testid="rest-timer"
      role="timer"
      aria-label={done ? 'Rest over' : `Rest: ${formatSeconds(remaining)} left`}
      className="pointer-events-none fixed inset-x-0 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.25rem)] z-40 flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto relative flex animate-rise-in items-center gap-3 overflow-hidden rounded-full border py-1.5 pl-5 pr-1.5 shadow-float backdrop-blur-xl transition-colors duration-300 ${
          done
            ? 'bg-brand border-transparent text-primary-foreground'
            : 'border-gray-200/80 bg-white/90 text-gray-900 dark:border-white/10 dark:bg-gray-800/90 dark:text-white'
        }`}
      >
        <span className={`eyebrow ${done ? '!text-primary-foreground' : ''}`}>{done ? 'Rest over' : 'Rest'}</span>
        <span className="nums min-w-[3.25rem] text-center text-xl font-bold leading-none" data-testid="rest-timer-remaining">
          {done ? 'Go' : formatSeconds(remaining)}
        </span>
        {!done && (
          <button
            type="button"
            aria-label="Add 30 seconds"
            onClick={() => onChange({ endsAt: rest.endsAt + 30_000, total: rest.total + 30 })}
            className="nums flex h-9 items-center gap-0.5 rounded-full bg-primary/10 px-3 text-sm font-bold text-primary active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            30s
          </button>
        )}
        <button
          type="button"
          aria-label={done ? 'Dismiss rest timer' : 'Skip rest'}
          onClick={() => onChange(null)}
          className={`flex h-9 w-9 items-center justify-center rounded-full active:scale-95 ${
            done ? 'bg-white/20' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300'
          }`}
        >
          <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        </button>
        {!done && (
          <span
            aria-hidden="true"
            className="bg-brand absolute bottom-0 left-0 h-[3px] transition-[width] duration-300 ease-linear"
            style={{ width: `${fraction * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}
