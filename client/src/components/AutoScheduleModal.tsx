import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { localWorkoutStorage, CustomWorkoutTemplate } from '@/lib/storage';
import { defaultWorkoutCycle } from '@/lib/workout-data';

interface AutoScheduleModalProps {
  open: boolean;
  onClose: () => void;
  customTemplates?: CustomWorkoutTemplate[];
}

export function AutoScheduleModal({ open, onClose, customTemplates }: AutoScheduleModalProps) {
  const presetNames = useMemo(
    () => Array.from(new Set(defaultWorkoutCycle)),
    []
  );
  const [templates, setTemplates] = useState<CustomWorkoutTemplate[]>(
    customTemplates ?? []
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [warning, setWarning] = useState(false);
  const [hiddenPresets, setHiddenPresets] = useState<Record<string, boolean>>({});
  const [promptPrefs, setPromptPrefs] = useState<Record<string, boolean>>({});
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (customTemplates) {
      setTemplates(customTemplates);
    }
  }, [customTemplates]);

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

  useEffect(() => {
    if (open) {
      setWarning(false);
      setHiddenPresets(localWorkoutStorage.getHiddenPresets());
      setPromptPrefs(localWorkoutStorage.getPresetPromptPrefs());
    }
  }, [open]);

  const removePreset = (name: string, hide: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        if (prev.size === 1) {
          setWarning(true);
          return prev;
        }
        next.delete(name);
      }
      return next;
    });
    setWarning(false);
    setHiddenPresets(prev => {
      const updated = { ...prev, [name]: hide };
      localWorkoutStorage.saveHiddenPresets(updated);
      return updated;
    });
    if (dontShowAgain) {
      setPromptPrefs(prev => {
        const updated = { ...prev, [name]: true };
        localWorkoutStorage.savePresetPromptPrefs(updated);
        return updated;
      });
    }
  };

  const toggle = (name: string) => {
    if (selected.has(name)) {
      if (presetNames.includes(name)) {
        if (promptPrefs[name]) {
          removePreset(name, hiddenPresets[name] ?? false);
        } else {
          setPendingPreset(name);
          setDontShowAgain(false);
        }
        return;
      }
      setSelected(prev => {
        const next = new Set(prev);
        if (next.size === 1) {
          setWarning(true);
          return prev;
        }
        next.delete(name);
        return next;
      });
    } else {
      setSelected(prev => new Set(prev).add(name));
      setWarning(false);
      if (presetNames.includes(name)) {
        setHiddenPresets(prev => {
          if (prev[name]) {
            const updated = { ...prev, [name]: false };
            localWorkoutStorage.saveHiddenPresets(updated);
            return updated;
          }
          return prev;
        });
      }
    }
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
        {warning && (
          <p className="text-red-600 text-sm">At least one workout must be selected to continue.</p>
        )}
        <Button onClick={handleSave} disabled={selected.size === 0} className="w-full">
          Save
        </Button>
      </DialogContent>
    </Dialog>
    <AlertDialog open={pendingPreset !== null} onOpenChange={o => !o && setPendingPreset(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            You removed "{pendingPreset}" from your auto-schedule.
          </AlertDialogTitle>
          <AlertDialogDescription>
            Would you also like to hide it from the Create/Edit Custom Workout menu?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center space-x-2 py-2">
          <Checkbox id="dont-show" checked={dontShowAgain} onCheckedChange={v => setDontShowAgain(!!v)} />
          <label htmlFor="dont-show" className="text-sm">Don't show again</label>
        </div>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => setPendingPreset(null)}>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={() => { if (pendingPreset) { removePreset(pendingPreset, false); setPendingPreset(null); } }}>Just Remove</Button>
          <Button onClick={() => { if (pendingPreset) { removePreset(pendingPreset, true); setPendingPreset(null); } }}>Also Hide</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
