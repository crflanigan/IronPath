import { useState, useEffect, useMemo } from 'react';
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
import type { Exercise, AbsExercise } from '@shared/schema';
import { CustomWorkoutTemplate, localWorkoutStorage, type CustomExercise } from '@/lib/storage';
import { exerciseLibrary } from '@/lib/exercise-library';
import { ExerciseOption } from '@/lib/exercise-library';
import { absLibrary, type AbsExerciseOption } from '@/lib/abs-library';
import { hasExerciseImage } from '@/lib/exercise-images';
import { NewExerciseForm } from './NewExerciseForm';
import { useViewStack } from './view-stack-provider';
import { ExerciseImageDialog } from './ExerciseImageDialog';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from './ErrorBoundary';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

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
  /**
   * Names the built-in workouts already answer to.
   *
   * Templates are looked up by name, and `workoutTemplates[name]` is checked
   * first — so a custom workout sharing a preset's name is unreachable: choose
   * it and you silently get the built-in one instead. Cheaper to refuse the
   * name than to let someone build a workout they can never open.
   */
  reservedNames?: string[];
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
  reservedNames = [],
}: CustomWorkoutBuilderModalProps) {
  const { popView } = useViewStack();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedAbs, setSelectedAbs] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [includeInSchedule, setIncludeInSchedule] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState<'freeweight' | 'machine' | 'both'>('both');
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [addingExercise, setAddingExercise] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<CustomExercise | null>(null);


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
      setCustomExercises(localWorkoutStorage.getCustomExercises());
      setAddingExercise(false);
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

  /**
   * What the builder can offer, and what it must not lose.
   *
   * Built-in library, plus the user's own exercises, plus anything the
   * template being edited already references. That last part matters: the
   * save path looks each selected exercise up here, and previously dropped
   * whatever it could not find — so editing a template after an exercise was
   * renamed or deleted silently removed it from the workout.
   */
  const availableExercises: ExerciseOption[] = useMemo(() => {
    const merged = new Map<string, ExerciseOption>();
    exerciseLibrary.forEach(e => merged.set(e.machine, e));
    customExercises
      .filter(e => e.block === 'main')
      .forEach(e =>
        merged.set(e.name, {
          machine: e.name,
          region: e.region ?? 'Other',
          equipment: e.equipment ?? 'both',
        }),
      );
    (template?.exercises ?? []).forEach(e => {
      if (!merged.has(e.machine)) {
        merged.set(e.machine, { machine: e.machine, region: e.region, equipment: e.equipment });
      }
    });
    return Array.from(merged.values());
  }, [customExercises, template]);

  const availableAbs: AbsExerciseOption[] = useMemo(() => {
    const merged = new Map<string, AbsExerciseOption>();
    absLibrary.forEach(a => merged.set(a.name, a));
    customExercises
      .filter(e => e.block === 'warmup')
      .forEach(e => merged.set(e.name, { name: e.name, reps: e.defaultReps, time: e.defaultTime }));
    (template?.abs ?? []).forEach(a => {
      if (!merged.has(a.name)) merged.set(a.name, { name: a.name, reps: a.reps, time: a.time });
    });
    return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [customExercises, template]);

  const customByName = useMemo(
    () => new Map(customExercises.map(e => [e.name, e])),
    [customExercises],
  );

  /** Only offer a preview when there is actually a photo behind it. */
  const previewable = (exerciseName: string) =>
    hasExerciseImage(exerciseName, customByName.get(exerciseName)?.imageSlug);

  const trimmedName = name.trim().toLowerCase();
  const clashesWithTemplate = existingNames
    .filter(n => !template || n.toLowerCase() !== template.name.toLowerCase())
    .some(n => n.toLowerCase() === trimmedName);
  const clashesWithPreset = reservedNames.some(n => n.toLowerCase() === trimmedName);
  const isDuplicate = clashesWithTemplate || clashesWithPreset;

  const handleSave = () => {
    if (name.trim() === '' || selected.size === 0 || isDuplicate) return;
    const exercises: Exercise[] = [];
    Array.from(selected).forEach(m => {
      const info = availableExercises.find(e => e.machine === m);
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
      const info = availableAbs.find(a => a.name === n);
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

  const handlePreview = (exerciseName: string) => {
    if (!previewable(exerciseName)) return;
    setPreviewExercise(exerciseName);
    setShowPreview(true);
  };

  const warning12 = selected.size >= 12 && selected.size < 15;
  const warning15 = selected.size === 15;

  const filteredExercises = availableExercises.filter(e => {
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
          <p className="text-sm text-muted-foreground text-left">Tap an exercise name to preview it.</p>
        </DialogHeader>
        
        <div className="flex items-center justify-between gap-2 -mt-3">
          {/* Placed first so the filter toggle stays flush right exactly where
              it was; it keeps its fixed width and this button does the
              shrinking if space runs short. The label stays put when the form
              is open — a second button reading "Cancel" beside the form's own
              would be ambiguous to read and to announce. */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-w-0 shrink"
            onClick={() => setAddingExercise(v => !v)}
          >
            <span className="truncate">+ New exercise</span>
          </Button>
          <button
            type="button"
            onClick={cycleFilter}
            className="flex flex-col items-center w-20 text-sm select-none cursor-pointer hover:bg-muted/50 rounded-md p-1 transition-colors"
          >
            <span className="text-2xl leading-none">{filterLabel[equipmentFilter].icon}</span>
            <span className="leading-none">{filterLabel[equipmentFilter].label}</span>
          </button>
        </div>

        {addingExercise && (
          <NewExerciseForm
            regions={regionOrder}
            takenNames={[
              ...availableExercises.map(e => e.machine),
              ...availableAbs.map(a => a.name),
            ]}
            onCancel={() => setAddingExercise(false)}
            onCreate={created => {
              const saved = localWorkoutStorage.addCustomExercise(created);
              setCustomExercises(localWorkoutStorage.getCustomExercises());
              setAddingExercise(false);
              // Tick it straight away — you added it because you want it.
              if (saved.block === 'main') {
                setSelected(prev => (prev.size < 15 ? new Set(prev).add(saved.name) : prev));
              } else {
                setSelectedAbs(prev => new Set(prev).add(saved.name));
              }
            }}
          />
        )}
        
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
                            aria-label={ex.machine}
                            checked={selected.has(ex.machine)}
                            onCheckedChange={() => toggle(ex.machine)}
                          />
                          {previewable(ex.machine) ? (
                            <button
                              type="button"
                              onClick={() => handlePreview(ex.machine)}
                              className="truncate text-sm text-left hover:text-primary"
                              title={ex.machine}
                            >
                              {ex.machine}
                            </button>
                          ) : (
                            <span className="truncate text-sm text-left" title={ex.machine}>
                              {ex.machine}
                            </span>
                          )}
                        </div>
                        {customByName.has(ex.machine) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove ${ex.machine}`}
                            className="ml-auto h-6 px-2 text-xs text-muted-foreground"
                            onClick={() => setPendingRemoval(customByName.get(ex.machine)!)}
                          >
                            Remove
                          </Button>
                        )}
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
            {availableAbs.map(abs => {
              const isLong = abs.name.length > 30;
              return (
                <div key={abs.name} className={cn(isLong && 'sm:col-span-2')}>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        aria-label={abs.name}
                        checked={selectedAbs.has(abs.name)}
                        onCheckedChange={() => toggleAbs(abs.name)}
                      />
                      {previewable(abs.name) ? (
                        <button
                          type="button"
                          onClick={() => handlePreview(abs.name)}
                          className="truncate text-sm text-left hover:text-primary"
                          title={abs.name}
                        >
                          {abs.name}
                        </button>
                      ) : (
                        <span className="truncate text-sm text-left" title={abs.name}>
                          {abs.name}
                        </span>
                      )}
                    </div>
                    {customByName.has(abs.name) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${abs.name}`}
                        className="ml-auto h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => setPendingRemoval(customByName.get(abs.name)!)}
                      >
                        Remove
                      </Button>
                    )}
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
          <Input aria-label="Workout name" placeholder="Workout name" value={name} onChange={e => setName(e.target.value)} />
          <label className="flex items-center space-x-2 text-sm">
            <Checkbox
              aria-label="Include in auto-schedule"
              checked={includeInSchedule}
              onCheckedChange={v => setIncludeInSchedule(!!v)}
            />
            <span>Include in auto-schedule</span>
          </label>
          {clashesWithPreset && (
            <p className="text-red-600 text-sm">
              “{name.trim()}” is a built-in workout. Choose a different name.
            </p>
          )}
          {clashesWithTemplate && (
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
      imageSlug={previewExercise ? customByName.get(previewExercise)?.imageSlug : undefined}
      open={showPreview}
      onOpenChange={setShowPreview}
    />
    <AlertDialog
      open={pendingRemoval !== null}
      onOpenChange={isOpen => !isOpen && setPendingRemoval(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove “{pendingRemoval?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            It stops appearing in this list. Workouts and templates that already
            include it are unaffected — they keep their own copy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => {
              if (!pendingRemoval) return;
              localWorkoutStorage.deleteCustomExercise(pendingRemoval.id);
              setCustomExercises(localWorkoutStorage.getCustomExercises());
              setPendingRemoval(null);
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
