import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { localWorkoutStorage } from '@/lib/storage';
import { getTrainingDays } from '@/lib/workout-data';
import { TrainingDayPicker, describeTrainingDays } from '@/components/TrainingDayPicker';

interface CustomizeStreakModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Which days of the week you train.
 *
 * This was "Customize Streak", reachable only by tapping the streak number,
 * and it changed nothing but the streak: the calendar went on scheduling a
 * workout for all seven days regardless. It is the same setting, now given
 * its real name, and the schedule honours it — the other days are rest days.
 */
export function CustomizeStreakModal({ open, onClose }: CustomizeStreakModalProps) {
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (open) setSelected(getTrainingDays());
  }, [open]);

  const handleSave = () => {
    localWorkoutStorage.saveStreakDays(selected);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="space-y-4">
        <DialogHeader className="text-left">
          <DialogTitle>Training days</DialogTitle>
          <DialogDescription>
            Pick the days you train. The rest are rest days: nothing is scheduled on them, and
            they never break your streak.
          </DialogDescription>
        </DialogHeader>
        <TrainingDayPicker value={selected} onChange={setSelected} />
        <p className="text-center text-sm font-semibold text-primary" data-testid="training-days-summary">
          {describeTrainingDays(selected)}
        </p>
        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          You can still train on a rest day. It counts toward your streak and takes the next
          workout in your rotation.
        </p>
        <DialogFooter className="pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSave} type="button">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
