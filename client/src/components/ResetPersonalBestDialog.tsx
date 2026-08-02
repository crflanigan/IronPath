import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatBestDate, type PersonalBest } from '@/lib/personal-best';

interface ResetPersonalBestDialogProps {
  machine: string | null;
  current?: PersonalBest;
  onClose: () => void;
  onReset: (options: { manual?: { weight: number; reps: number } }) => void;
}

/**
 * Start an exercise's personal best over.
 *
 * Deliberately not framed as fixing a mistake. People come here after an
 * injury, after a year away, or because a figure from a long time ago is not a
 * useful target any more — and one of those is far more common than a wrong
 * number. The copy says "reset", never "incorrect".
 *
 * Two ways out, because both are reasonable:
 *
 *  - clear it, and let the next session you log set the new benchmark
 *  - name a figure yourself, which stands until something logged beats it
 *
 * The second reintroduces a number the app did not observe, which is the thing
 * this whole area was fixing — so it is labelled "set by you" wherever it
 * appears, and it is never the default.
 */
export function ResetPersonalBestDialog({
  machine,
  current,
  onClose,
  onReset,
}: ResetPersonalBestDialogProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  // Fields are cleared each time it opens, so a figure typed for one exercise
  // is never suggested for the next.
  useEffect(() => {
    if (machine) {
      setWeight('');
      setReps('');
    }
  }, [machine]);

  const manualWeight = parseInt(weight, 10);
  const manualReps = parseInt(reps, 10);
  const hasManual = !isNaN(manualWeight) && manualWeight > 0;
  const manualIncomplete = hasManual && (isNaN(manualReps) || manualReps <= 0);

  return (
    <AlertDialog open={machine !== null} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Reset personal best</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                {machine} currently shows{' '}
                <strong>
                  {current?.weight} lbs × {current?.reps} reps
                </strong>
                {current?.date ? ` from ${formatBestDate(current.date)}` : ''}.
              </p>
              <p>
                Resetting stops earlier sessions counting towards it. Your next
                logged session sets the new one.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Or start from a figure of your own — optional.
          </p>
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              inputMode="numeric"
              aria-label="Personal best weight"
              value={weight}
              onChange={e => /^\d*$/.test(e.target.value) && setWeight(e.target.value)}
              className="w-20 text-sm"
              placeholder="lbs"
            />
            <span className="text-sm text-gray-500">×</span>
            <Input
              type="text"
              inputMode="numeric"
              aria-label="Personal best reps"
              value={reps}
              onChange={e => /^\d*$/.test(e.target.value) && setReps(e.target.value)}
              className="w-20 text-sm"
              placeholder="reps"
            />
          </div>
          {manualIncomplete && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Add reps as well, or leave both blank to just clear it.
            </p>
          )}
        </div>

        <AlertDialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={manualIncomplete}
            onClick={() =>
              onReset({
                manual: hasManual ? { weight: manualWeight, reps: manualReps } : undefined,
              })
            }
          >
            {hasManual ? 'Set as my best' : 'Reset'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
