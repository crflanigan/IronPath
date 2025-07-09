import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface ExerciseImageDialogProps {
  exerciseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExerciseImageDialog({
  exerciseName,
  open,
  onOpenChange
}: ExerciseImageDialogProps) {
  const [error, setError] = useState(false);
  const slug = exerciseName
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
  const src = `/exercise-images/${slug}.jpg`;

  const handleError = () => setError(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-md">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{exerciseName}</DialogTitle>
        </DialogHeader>
        {!error ? (
          <img
            src={src}
            alt={exerciseName}
            onError={handleError}
            className="w-full h-auto object-contain"
          />
        ) : (
          <img
            src="/exercise-images/placeholder.svg"
            alt="Placeholder"
            className="w-full h-auto object-contain p-6"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
