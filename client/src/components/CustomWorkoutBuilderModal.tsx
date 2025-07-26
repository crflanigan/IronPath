import { useState, useEffect } from 'react';
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
import { Exercise, AbsExercise } from '@shared/schema';
import { CustomWorkoutTemplate } from '@/lib/storage';
import { exerciseLibrary } from '@/lib/exercise-library';
import { ExerciseOption } from '@/lib/exercise-library';
import { absLibrary } from '@/lib/abs-library';
import { useViewStack } from './view-stack-provider';
import { ExerciseImageDialog } from './ExerciseImageDialog';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from './ErrorBoundary';

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
  refreshCustomTemplates?: () => void;
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
  refreshCustomTemplates,
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
  const [equipmentFilter, setEquipmentFilter] = useState<'freeweight' | 'machine' | 'both'>('both');

  const noPreviewAbs = new Set([
    'Cross-Leg Crunch',
    'Jack Knife',
    'Legs-Up Vertical Crunch',
    'Side Oblique Crunch',
    'Side Oblique Leg Raise',
    'Crunch',
    'Knee Raise',
    'Reverse Crunch',
    'Side Oblique Knee Raise',
    'Straight Leg Thrust',
  ]);

  const cycleFilter = () => {
    setEquipmentFilter(prev =>
      prev === 'freeweight' ? 'machine' : prev === 'machine' ? 'both' : 'freeweight'
    );
  };

  const filterLabel: Record<'freeweight' | 'machine' | 'both', { icon: string; label: string }> = {
    freeweight: { icon: '🏋️‍♂️', label: 'Weights' },
    machine: { icon: '⚙️', label: 'Machines' },
    both: { icon: '⚖️', label: 'Both' },
  };

  const regionAliases: Record<string, string> = {
    'Chest': 'Chest',
    'Chest Pecs': 'Chest',
    'Outer Pecs': 'Chest',
    'Quads': 'Legs',
    'Quads / Hams': 'Legs',
    'Legs': 'Legs',
    'Legs (Warm Up)': 'Legs',
    'Inner Thighs': 'Thighs',
    'Outer Thighs': 'Thighs',
    'Outer Triceps': 'Triceps',
  };

  const regionOrder = [
    'Chest',
    'Back',
    'Shoulders',
    'Traps',
    'Biceps',
    'Triceps',
    'Forearms',
    'Legs',
    'Thighs',
    'Hamstrings',
    'Glutes',
    'Calves',
  ];

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
    const exercises: Exercise[] = [];
    Array.from(selected).forEach(m => {
      const info = exerciseLibrary.find(e => e.machine === m);
      if (!info) {
        console.warn(`Unknown exercise machine: ${m}`);
        return;
      }
      exercises.push({
        machine: info.machine,
        region: info.region,
        equipment: info.equipment,
        feel: 'Medium',
        completed: false,
        sets: [
          { weight: undefined, reps: undefined, rest: '', completed: false },
          { weight: undefined, reps: undefined, rest: '', completed: false },
          { weight: undefined, reps: undefined, rest: '', completed: false },
        ],
      } as Exercise);
    });

    const abs: AbsExercise[] = [];
    Array.from(selectedAbs).forEach(n => {
      const info = absLibrary.find(a => a.name === n);
      if (!info) {
        console.warn(`Unknown abs exercise: ${n}`);
        return;
      }
      abs.push({
        name: info.name,
        reps: info.reps,
        time: info.time,
        completed: false,
      } as AbsExercise);
    });
    if (template && onUpdate) {
      onUpdate(template.id, name, exercises, abs, includeInSchedule);
    } else {
      onCreate(name, exercises, abs, includeInSchedule);
      refreshCustomTemplates?.();
    }
    popView();
    onClose();
  };

  const handlePreview = (name: string) => {
    if (noPreviewAbs.has(name)) return;
    setPreviewExercise(name);
    setShowPreview(true);
  };

  const warning12 = selected.size >= 12 && selected.size < 15;
  const warning15 = selected.size === 15;

  const filteredExercises = exerciseLibrary.filter(e => {
    if (equipmentFilter === 'both') return true;
    if (equipmentFilter === 'machine') return e.equipment !== 'freeweight';
    return e.equipment !== 'machine';
  });

  const grouped: Record<string, ExerciseOption[]> = {};
  filteredExercises.forEach(e => {
    const region = regionAliases[e.region] ?? e.region;
    if (!grouped[region]) grouped[region] = [];
    grouped[region].push(e);
  });

  const orderedGroups = Object.entries(grouped).sort((a, b) => {
    const idxA = regionOrder.indexOf(a[0]);
    const idxB = regionOrder.indexOf(b[0]);
    if (idxA === -1 && idxB === -1) return a[0].localeCompare(b[0]);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
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
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <ErrorBoundary>
        <DialogHeader className="space-y-1">
          <DialogTitle>{template ? 'Edit Custom Workout' : 'Create Custom Workout'}</DialogTitle>
          <DialogDescription className="text-left">Select up to 15 exercises and name your workout.</DialogDescription>
          <p className="text-sm text-muted-foreground text-left">Tap any exercise name to preview it.</p>
        </DialogHeader>
        
        <div className="flex justify-end -mt-3">
          <button
            type="button"
            onClick={cycleFilter}
            className="flex flex-col items-center w-20 text-sm select-none cursor-pointer hover:bg-muted/50 rounded-md p-1 transition-colors"
          >
            <span className="text-2xl leading-none">{filterLabel[equipmentFilter].icon}</span>
            <span className="leading-none">{filterLabel[equipmentFilter].label}</span>
          </button>
        </div>
        
        <div className="space-y-4 -mt-2">
          {orderedGroups.map(([region, exercises]) => (
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
                      <div className="flex items-center gap-1">
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
        <div className="border rounded p-2">
          <div className="font-medium mb-2">Add Core Exercises (Optional)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {absLibrary.map(abs => {
              const isLong = abs.name.length > 30;
              return (
                <div key={abs.name} className={cn(isLong && 'sm:col-span-2')}>
                  <div className="flex items-center gap-1">
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
        
        <div className="space-y-4">
          {warning12 && (
            <p className="text-yellow-600 text-sm">⚠️ That's a big session — are you training or moving in?</p>
          )}
          {warning15 && (
            <p className="text-red-600 text-sm">🚨 Danger: Too many exercises in one session isn't effective. Consider splitting it up.</p>
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
        </div>
          </ErrorBoundary>
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
