import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { formatElapsed } from '@/lib/workout-summary';

/**
 * How long the workout has been going, counting up.
 *
 * Its own component so the once-a-second tick re-renders this one line and
 * nothing else: the workout page is a long tree of inputs, and redrawing it
 * every second to move a clock would be the kind of cost people feel in a
 * scroll.
 *
 * It counts from the same `startedAt` that the finished workout's duration is
 * measured from, so the clock and the summary cannot disagree. Before
 * anything is ticked there is no start yet, and it sits at 0:00.
 */
export function ElapsedTime({ since }: { since: Date | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!since) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [since]);

  const seconds = since ? (now - since.getTime()) / 1000 : 0;

  return (
    <span
      role="timer"
      data-testid="elapsed-time"
      className={`nums inline-flex items-center gap-1 text-sm font-bold ${
        since ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
      }`}
    >
      <Timer className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      <span className="sr-only">Elapsed </span>
      {formatElapsed(seconds)}
    </span>
  );
}
