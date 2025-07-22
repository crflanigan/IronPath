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
import { Checkbox } from '@/components/ui/checkbox';
import { localWorkoutStorage } from '@/lib/storage';

interface CustomizeStreakModalProps {
  open: boolean;
  onClose: () => void;
}

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function CustomizeStreakModal({ open, onClose }: CustomizeStreakModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      const stored = localWorkoutStorage.getStreakDays();
      setSelected(new Set(stored));
    }
  }, [open]);

  const toggle = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleSave = () => {
    localWorkoutStorage.saveStreakDays(Array.from(selected).sort());
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Customize Streak</DialogTitle>
          <DialogDescription>
            Choose which days count toward your streak
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            You can still work out on other days — only missed planned days break your
            streak. Bonus workouts help but don’t hurt.
          </p>
        </DialogHeader>
        <div className="space-y-2">
          {days.map((day, idx) => (
            <label key={day} className="flex items-center space-x-2 text-sm">
              <Checkbox
                checked={selected.has(idx)}
                onCheckedChange={() => toggle(idx)}
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
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

