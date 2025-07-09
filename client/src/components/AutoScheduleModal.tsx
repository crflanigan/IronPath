import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { localWorkoutStorage, CustomWorkoutTemplate } from '@/lib/storage';
import { defaultWorkoutCycle } from '@/lib/workout-data';

interface AutoScheduleModalProps {
  open: boolean;
  onClose: () => void;
  customTemplates?: CustomWorkoutTemplate[];
}

export function AutoScheduleModal({ open, onClose, customTemplates }: AutoScheduleModalProps) {
  const presetNames = Array.from(new Set(defaultWorkoutCycle));
  const [templates, setTemplates] = useState<CustomWorkoutTemplate[]>(customTemplates ?? []);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && !customTemplates) {
      localWorkoutStorage.getCustomTemplates().then(setTemplates);
    }
  }, [open, customTemplates]);

  useEffect(() => {
    if (open) {
      const stored = localWorkoutStorage.getAutoScheduleWorkouts();
      let initial: string[];
      if (stored.length === 0) {
        initial = [
          ...presetNames,
          ...templates.filter(t => t.includeInAutoSchedule).map(t => t.name),
        ];
      } else {
        initial = stored;
      }
      setSelected(new Set(initial));
    }
  }, [open, templates, presetNames]);

  const toggle = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleSave = () => {
    const list = Array.from(selected);
    if (list.length === 0) return;
    localWorkoutStorage.saveAutoScheduleWorkouts(list);
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Customize Auto-Schedule</DialogTitle>
          <DialogDescription>
            Choose which workouts appear in the automatic rotation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <div className="font-medium mb-2">Presets</div>
            <div className="space-y-2">
              {presetNames.map(name => (
                <label key={name} className="flex items-center space-x-2 text-sm">
                  <Checkbox checked={selected.has(name)} onCheckedChange={() => toggle(name)} />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          </div>
          {templates.length > 0 && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="font-medium mb-2">My Workouts</div>
              <div className="space-y-2">
                {templates.map(t => (
                  <label key={t.id} className="flex items-center space-x-2 text-sm">
                    <Checkbox checked={selected.has(t.name)} onCheckedChange={() => toggle(t.name)} />
                    <span>{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button onClick={handleSave} disabled={selected.size === 0} className="w-full">
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
