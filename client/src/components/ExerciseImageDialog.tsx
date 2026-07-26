import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { exerciseImageSrc } from '@/lib/exercise-images';

interface ExerciseImageDialogProps {
  exerciseName: string;
  /** Set for a user-added exercise that borrowed one of the bundled photos. */
  imageSlug?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExerciseImageDialog({
  exerciseName,
  imageSlug,
  open,
  onOpenChange
}: ExerciseImageDialogProps) {
  const [failedToLoad, setFailedToLoad] = useState(false);

  useEffect(() => {
    setFailedToLoad(false);
  }, [exerciseName, imageSlug]);

  // Callers only offer the preview when a photo exists, so this is a
  // belt-and-braces fallback rather than the common case it used to be.
  const src = exerciseImageSrc(exerciseName, imageSlug);
  const showPlaceholder = failedToLoad || src === null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-md">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{exerciseName}</DialogTitle>
        </DialogHeader>
        {showPlaceholder ? (
          <img
            src="/exercise-images/placeholder.svg"
            alt=""
            className="w-full h-auto object-contain p-6"
          />
        ) : (
          <img
            src={src as string}
            alt={`Reference photo for ${exerciseName}`}
            onError={() => setFailedToLoad(true)}
            className="w-full h-auto object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
