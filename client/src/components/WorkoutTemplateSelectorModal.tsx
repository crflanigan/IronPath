import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CustomWorkoutTemplate, localWorkoutStorage } from '@/lib/storage';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Settings } from 'lucide-react';
import { useViewStack } from './view-stack-provider';

interface WorkoutTemplateSelectorModalProps {
  open: boolean;
  customTemplates: CustomWorkoutTemplate[];
  onClose: () => void;
  onSelectTemplate: (template: string) => void;
  onCreateCustom: () => void;
  onClonePreset: (preset: string) => void;
  onDeleteTemplate: (id: number) => void;
  onEditTemplate: (template: CustomWorkoutTemplate) => void;
}

export function WorkoutTemplateSelectorModal({ open, customTemplates, onClose, onSelectTemplate, onCreateCustom, onClonePreset, onDeleteTemplate, onEditTemplate }: WorkoutTemplateSelectorModalProps) {
  const { pushView } = useViewStack();
  const [hiddenPresets, setHiddenPresets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setHiddenPresets(localWorkoutStorage.getHiddenPresets());
    }
  }, [open]);
  const presetList = [
    'Chest Day',
    'Legs',
    'Back & Biceps',
    'Back, Biceps & Legs',
    'Chest & Triceps',
    'Chest & Shoulders',
    'Chest, Shoulders & Legs',
  ];
  const visiblePresets = presetList.filter(name => !hiddenPresets[name]);
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
          {visiblePresets.map(name => (
            <div key={name} className="flex items-center space-x-1">
              <Button
                variant="outline"
                className="flex-1 justify-start"
                onClick={() => onSelectTemplate(name)}
              >
                {name}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      onClonePreset(name);
                      pushView('customWorkoutBuilder');
                    }}
                  >
                    Clone as custom
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              className="flex-1 justify-start"
              onClick={() => {
                onCreateCustom();
                pushView('customWorkoutBuilder');
              }}
            >
              Create Custom Workout
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onCreateCustom();
                pushView('customWorkoutBuilder');
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <Separator className="my-2" />

          {customTemplates.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Custom Workouts</div>
              {customTemplates.map(t => (
                <div key={t.id} className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    className="flex-1 justify-start"
                    onClick={() => onSelectTemplate(t.name)}
                  >
                    {t.name}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          onEditTemplate(t);
                          pushView('customWorkoutBuilder');
                        }}
                      >
                        Edit workout
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem>Delete workout</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Workout</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this workout?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 text-white hover:bg-red-700"
                              onClick={() => onDeleteTemplate(t.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
