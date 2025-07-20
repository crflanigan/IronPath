import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [draftHidden, setDraftHidden] = useState<Record<string, boolean>>({});
  const [promptPrefs, setPromptPrefs] = useState<Record<string, boolean>>({});
  const [pendingPresets, setPendingPresets] = useState<string[] | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const initialSelected = useRef<Set<string>>(new Set());
  const originalHidden = useRef<Record<string, boolean>>({});
  const saveList = useRef<string[]>([]);

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
      initialSelected.current = new Set(initial);
      setSelected(new Set(initial));

      const hidden = localWorkoutStorage.getHiddenPresets();
      originalHidden.current = hidden;
      setDraftHidden(hidden);
      setPromptPrefs(localWorkoutStorage.getPresetPromptPrefs());
      setWarning(false);
    }
  }, [open, templates, presetNames]);

  const toggle = (name: string) => {
    if (selected.has(name)) {
      if (presetNames.includes(name)) {
        if (promptPrefs[name]) {
          setDraftHidden(prev => ({
            ...prev,
            [name]: originalHidden.current[name] ?? false,
          }));
        }
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
        setDraftHidden(prev => {
          if (prev[name]) {
            return { ...prev, [name]: false };
          }
          return prev;
        });
      }
    }
  };

  const handleSave = () => {
    const list = Array.from(selected);
    if (list.length === 0) return;
    const removed = Array.from(initialSelected.current).filter(
      name => !selected.has(name) && presetNames.includes(name)
    );
    const toPrompt = removed.filter(name => !promptPrefs[name]);
    if (toPrompt.length > 0) {
      saveList.current = list;
      setPendingPresets(toPrompt);
      setDontShowAgain(false);
      return;
    }
    localWorkoutStorage.saveHiddenPresets(draftHidden);
    localWorkoutStorage.savePresetPromptPrefs(promptPrefs);
    localWorkoutStorage.saveAutoScheduleWorkouts(list);
    onClose();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  const finalize = (hide: boolean) => {
    if (!pendingPresets) return;
    setPendingPresets(null);
    setDraftHidden(prev => {
      const updated = { ...prev };
      pendingPresets.forEach(name => {
        updated[name] = hide;
      });
      localWorkoutStorage.saveHiddenPresets(updated);
      return updated;
    });
    if (dontShowAgain) {
      setPromptPrefs(prev => {
        const updated = { ...prev };
        pendingPresets.forEach(name => {
          updated[name] = true;
        });
        localWorkoutStorage.savePresetPromptPrefs(updated);
        return updated;
      });
    }
    localWorkoutStorage.saveAutoScheduleWorkouts(saveList.current);
    onClose();
  };

  return (
    <>
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
    <AlertDialog
      open={pendingPresets !== null}
      onOpenChange={o => !o && setPendingPresets(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            You removed "{pendingPresets?.join(', ')}" from your auto-schedule.
          </AlertDialogTitle>
          <AlertDialogDescription>
            Would you also like to hide {pendingPresets && pendingPresets.length > 1 ? 'them' : 'it'} from the Create/Edit Custom Workout menu?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center space-x-2 py-2">
          <Checkbox id="dont-show" checked={dontShowAgain} onCheckedChange={v => setDontShowAgain(!!v)} />
          <label htmlFor="dont-show" className="text-sm">Don't show again</label>
        </div>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => setPendingPresets(null)}>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={() => finalize(false)}>Keep Visible</Button>
          <Button onClick={() => finalize(true)}>Also Hide</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
