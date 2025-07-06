import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WorkoutTemplateSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: string) => void;
}

export function WorkoutTemplateSelectorModal({ open, onClose, onSelectTemplate }: WorkoutTemplateSelectorModalProps) {
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Select Workout Template</DialogTitle>
          <DialogDescription>
            Choose a template to pre-fill your workout details.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-2">
          <Button variant="outline" onClick={() => onSelectTemplate('Chest Day (ActiveTrax)')}>Chest Day (ActiveTrax)</Button>
          {/*
            Template keys are defined in workout-data.ts using
            "Back and Legs". Passing the mismatched label caused
            workout creation to silently fail.
          */}
          <Button
            variant="outline"
            onClick={() => onSelectTemplate('Back and Legs')}
          >
            Back & Legs (ActiveTrax)
          </Button>
          <Button variant="outline" onClick={() => onSelectTemplate('Back & Biceps (ActiveTrax)')}>Back & Biceps (ActiveTrax)</Button>
          <Button variant="outline" onClick={() => onSelectTemplate('Back, Biceps & Legs (ActiveTrax)')}>Back, Biceps & Legs (ActiveTrax)</Button>
          <Button variant="outline" onClick={() => onSelectTemplate('Chest & Triceps (ActiveTrax)')}>Chest & Triceps (ActiveTrax)</Button>
          <Button variant="outline" onClick={() => onSelectTemplate('Chest & Shoulders (ActiveTrax)')}>Chest & Shoulders (ActiveTrax)</Button>
          <Button variant="outline" onClick={() => onSelectTemplate('Chest, Shoulders & Legs (ActiveTrax)')}>Chest, Shoulders & Legs (ActiveTrax)</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
