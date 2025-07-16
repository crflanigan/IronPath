import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Exercise, AbsExercise } from '@shared/schema';
import { CustomWorkoutTemplate } from '@/lib/storage';
import { exerciseLibrary } from '@/lib/exercise-library';
import { ExerciseOption } from '@/lib/exercise-library';
import { absLibrary } from '@/lib/abs-library';
import { useViewStack } from './view-stack-provider';
import { ExerciseImageDialog } from './ExerciseImageDialog';
import { cn } from '@/lib/utils';

interface CustomWorkoutBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    exercises: Exercise[],
    abs: AbsExercise[],
    includeInAutoSchedule: boolean,
  ) => void;
  onUpdate?: (
    id: number,
    name: string,
    exercises: Exercise[],
    abs: AbsExercise[],
    includeInAutoSchedule: boolean,
  ) => void;
  template?: CustomWorkoutTemplate | null;
  prefill?: {
    name: string;
    exercises: Exercise[];
    abs: AbsExercise[];
  } | null;
  existingNames: string[];
}

export function CustomWorkoutBuilderModal({
  open,
  onClose,
  onCreate,
  onUpdate,
  template,
  prefill,
  existingNames,
}: CustomWorkoutBuilderModalProps) {
  const { popView } = useViewStack();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedAbs, setSelectedAbs] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [includeInSchedule, setIncludeInSchedule] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState<'machine' | 'freeweight' | 'both'>('both');
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name);
        setSelected(new Set(template.exercises.map(e => e.machine)));
        setSelectedAbs(new Set((template.abs ?? []).map(a => a.name)));
        setIncludeInSchedule(template.includeInAutoSchedule ?? false);
      } else if (prefill) {
        setName(prefill.name);
        setSelected(new Set(prefill.exercises.map(e => e.machine)));
        setSelectedAbs(new Set((prefill.abs ?? []).map(a => a.name)));
        setIncludeInSchedule(false);
      } else {
        setName('');
        setSelected(new Set());
        setSelectedAbs(new Set());
        setIncludeInSchedule(false);
      }
    }
  }, [open, template, prefill]);

  useEffect(() => {
    if (open) {
      contentRef.current?.scrollTo({ top: 0 });
    }
  }, [open]);

  const toggle = (machine: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(machine)) {
        next.delete(machine);
      } else if (next.size < 15) {
        next.add(machine);
      }
      return next;
    });
  };

  const toggleAbs = (name: string) => {
    setSelectedAbs(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const isDuplicate = existingNames
    .filter(n => !template || n.toLowerCase() !== template.name.toLowerCase())
    .some(n => n.toLowerCase() === name.trim().toLowerCase());

  const handleSave = () => {
    if (name.trim() === '' || selected.size === 0 || isDuplicate) return;
    const exercises: Exercise[] = Array.from(selected).map(m => {
      const info = exerciseLibrary.find(e => e.machine === m)!;
      return {
        machine: info.machine,
        region: info.region,
        feel: 'Medium',
        completed: false,
        sets: [
          { weight: undefined, reps: undefined, rest: '', completed: false },
          { weight: undefined, reps: undefined, rest: '', completed: false },
          { weight: undefined, reps: undefined, rest: '', completed: false },
        ],
      } as Exercise;
    });
    const abs: AbsExercise[] = Array.from(selectedAbs).map(n => {
      const info = absLibrary.find(a => a.name === n)!;
      return {
        name: info.name,
        reps: info.reps,
        time: info.time,
        completed: false,
      } as AbsExercise;
    });
    if (template && onUpdate) {
      onUpdate(template.id, name, exercises, abs, includeInSchedule);
    } else {
      onCreate(name, exercises, abs, includeInSchedule);
    }
    popView();
    onClose();
  };

  const handlePreview = (name: string) => {
    setPreviewExercise(name);
    setShowPreview(true);
  };

  const showFilterInfo = () => {
    toast({
      description:
        'This button toggles exercises by equipment type. Machines, free-weights, or both.',
    });
  };

  const cycleFilter = () => {
    setEquipmentFilter(prev => {
      const next = prev === 'both' ? 'machine' : prev === 'machine' ? 'freeweight' : 'both';
      showFilterInfo();
      return next;
    });
  };

  const warning12 = selected.size >= 12 && selected.size < 15;
  const warning15 = selected.size === 15;

  const grouped: Record<string, ExerciseOption[]> = {};
  const filteredLibrary = exerciseLibrary.filter(e => {
    if (equipmentFilter === 'machine') return e.equipment === 'machine';
    if (equipmentFilter === 'freeweight') return e.equipment === 'freeweight';
    return true;
  });
  filteredLibrary.forEach(e => {
    if (!grouped[e.region]) grouped[e.region] = [];
    grouped[e.region].push(e);
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      popView();
      onClose();
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent ref={contentRef} className="space-y-4 overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Custom Workout' : 'Create Custom Workout'}</DialogTitle>
          <DialogDescription>Select up to 15 exercises and give your workout a name.</DialogDescription>
          <p className="text-sm text-muted-foreground text-left">Tap any exercise name to preview it.</p>
        </DialogHeader>
        <div className="relative pt-8">
          <div className="absolute right-0 -top-6 pr-1 flex items-start">
            <button
              type="button"
              onClick={cycleFilter}
              className="flex h-12 w-12 flex-col items-center justify-center rounded border text-xs cursor-pointer hover:opacity-90 active:scale-95 transition"
            >
              <span className="text-lg">
                {equipmentFilter === 'machine'
                  ? '⚙️'
                  : equipmentFilter === 'freeweight'
                  ? '🏋️‍♂️'
                  : '⚖️'}
              </span>
              <span className="flex items-center gap-1">
                {equipmentFilter === 'machine'
                  ? 'Machines'
                  : equipmentFilter === 'freeweight'
                  ? 'Free-Weights'
                  : 'Both'}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    showFilterInfo();
                  }}
                  className="p-0.5 text-muted-foreground hover:text-primary"
                >
                  <HelpCircle className="h-3 w-3" />
                  <span className="sr-only">Help</span>
                </button>
              </span>
            </button>
          </div>
          <div className="space-y-4">
          {Object.entries(grouped).map(([region, exercises]) => (
            <div key={region} className="border rounded p-2">
              <div className="font-medium mb-2">{region}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {exercises.map(ex => {
                  const isLong = ex.machine.length > 30;
                  return (
                    <div
                      key={ex.machine}
                      className={cn(isLong && 'sm:col-span-2')}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={selected.has(ex.machine)}
                            onCheckedChange={() => toggle(ex.machine)}
                          />
                          <button
                            type="button"
                            onClick={() => handlePreview(ex.machine)}
                            className="truncate text-sm text-left hover:text-primary"
                            title={ex.machine}
                          >
                            {ex.machine}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          </div>
        </div>
        <div className="border rounded p-2">
          <div className="font-medium mb-2">Add Core Exercises (Optional)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {absLibrary.map(abs => {
              const isLong = abs.name.length > 30;
              return (
                <div key={abs.name} className={cn(isLong && 'sm:col-span-2')}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={selectedAbs.has(abs.name)}
                        onCheckedChange={() => toggleAbs(abs.name)}
                      />
                      <button
                        type="button"
                        onClick={() => handlePreview(abs.name)}
                        className="truncate text-sm text-left hover:text-primary"
                        title={abs.name}
                      >
                        {abs.name}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {warning12 && (
          <p className="text-yellow-600 text-sm">⚠️ That’s a big session — are you training or moving in?</p>
        )}
        {warning15 && (
          <p className="text-red-600 text-sm">🚨 Danger: Too many exercises in one session isn’t effective. Consider splitting it up.</p>
        )}
        <Input placeholder="Workout name" value={name} onChange={e => setName(e.target.value)} />
        <label className="flex items-center space-x-2 text-sm">
          <Checkbox
            checked={includeInSchedule}
            onCheckedChange={v => setIncludeInSchedule(!!v)}
          />
          <span>Include in auto-schedule</span>
        </label>
        {isDuplicate && (
          <p className="text-red-600 text-sm">Workout name must be unique</p>
        )}
        <Button onClick={handleSave} disabled={name.trim() === '' || selected.size === 0 || isDuplicate}>
          {template ? 'Update Workout' : 'Save Workout'}
        </Button>
      </DialogContent>
    </Dialog>
    <ExerciseImageDialog
      exerciseName={previewExercise || ''}
      open={showPreview}
      onOpenChange={setShowPreview}
    />
    </>
  );
}
