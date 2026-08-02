import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sparkline } from '@/components/Sparkline';
import { describeProgress, type LiftProgress } from '@/lib/progression';

interface LiftProgressDialogProps {
  lift: LiftProgress | null;
  onClose: () => void;
}

const monthYear = (iso: string) =>
  new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))
    .toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

/**
 * One lift, over time.
 *
 * The headline is the number you are at now and how it got there in words; the
 * line underneath is the shape of that, larger than the one in the list but
 * still without axes or gridlines. The dates below it are the only labels,
 * because two dates are enough to read a line and a full axis on a 412px phone
 * is not.
 *
 * Scrolling lives on an inner element rather than DialogContent — that is the
 * arrangement iOS handles, and getting it wrong is what made three dialogs
 * unscrollable here before.
 */
export function LiftProgressDialog({ lift, onClose }: LiftProgressDialogProps) {
  return (
    <Dialog open={lift !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-sm overflow-hidden p-0">
        {lift && (
          <div className="max-h-[80vh] overflow-y-auto overscroll-contain p-6">
            <DialogHeader className="text-left">
              <DialogTitle>{lift.machine}</DialogTitle>
              <DialogDescription>
                {describeProgress(lift)}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 text-primary">
              <Sparkline values={lift.points.map(p => p.weight)} width={280} height={80} />
            </div>

            {lift.sessions > 1 && (
              <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{monthYear(lift.firstDate)}</span>
                <span>{monthYear(lift.lastDate)}</span>
              </div>
            )}

            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Now</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{lift.current} lbs</dd>
              </div>
              {lift.sessions > 1 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">
                    When you started
                  </dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{lift.first} lbs</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Sessions logged</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{lift.sessions}</dd>
              </div>
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
