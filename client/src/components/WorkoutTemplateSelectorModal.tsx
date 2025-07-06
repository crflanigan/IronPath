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
          <Button variant="outline" onClick={() => onSelectTemplate('Back & Legs (ActiveTrax)')}>Back & Legs (ActiveTrax)</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
