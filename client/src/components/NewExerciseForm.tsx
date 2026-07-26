import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EXERCISE_IMAGE_SLUGS } from '@/lib/exercise-images';
import type { CustomExercise } from '@/lib/storage';

type Block = 'main' | 'warmup';
type Equipment = 'machine' | 'freeweight' | 'both';

interface NewExerciseFormProps {
  regions: string[];
  /** Names already in use — built-ins and previously added exercises alike. */
  takenNames: string[];
  onCancel: () => void;
  onCreate: (exercise: Omit<CustomExercise, 'id' | 'createdAt'>) => void;
}

const EQUIPMENT_CHOICES: { value: Equipment; label: string }[] = [
  { value: 'freeweight', label: 'Weights' },
  { value: 'machine', label: 'Machine' },
  { value: 'both', label: 'Both' },
];

function slugLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function NewExerciseForm({
  regions,
  takenNames,
  onCancel,
  onCreate,
}: NewExerciseFormProps) {
  const [name, setName] = useState('');
  const [block, setBlock] = useState<Block>('main');
  const [equipment, setEquipment] = useState<Equipment>('freeweight');
  const [region, setRegion] = useState(regions[0] ?? 'Other');
  const [imageSlug, setImageSlug] = useState<string | null>(null);
  const [browsingImages, setBrowsingImages] = useState(false);

  const trimmed = name.trim();
  const isDuplicate = takenNames.some(n => n.toLowerCase() === trimmed.toLowerCase());
  const canSave = trimmed !== '' && !isDuplicate;

  const submit = () => {
    if (!canSave) return;
    onCreate(
      block === 'main'
        ? { name: trimmed, block, equipment, region, imageSlug }
        : { name: trimmed, block, imageSlug },
    );
  };

  return (
    <div className="border rounded p-3 space-y-3 bg-muted/30">
      <div className="font-medium">New exercise</div>

      <Input
        aria-label="Exercise name"
        placeholder="Exercise name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      {isDuplicate && (
        <p className="text-red-600 text-sm">“{trimmed}” already exists. Choose another name.</p>
      )}

      <fieldset className="space-y-1">
        <legend className="text-sm text-muted-foreground">Where does it go?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['main', 'Main workout', 'Sets, weight and reps'],
              ['warmup', 'Warm-up', 'Reps or time, no weight'],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              aria-pressed={block === value}
              onClick={() => setBlock(value)}
              className={cn(
                'rounded-md border p-2 text-left text-sm transition-colors',
                block === value ? 'border-primary bg-accent' : 'hover:bg-muted/50',
              )}
            >
              <div className="font-medium">{label}</div>
              <div className="text-xs text-muted-foreground">{hint}</div>
            </button>
          ))}
        </div>
      </fieldset>

      {block === 'main' && (
        <>
          <fieldset className="space-y-1">
            <legend className="text-sm text-muted-foreground">Equipment</legend>
            <div className="grid grid-cols-3 gap-2">
              {EQUIPMENT_CHOICES.map(choice => (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={equipment === choice.value}
                  onClick={() => setEquipment(choice.value)}
                  className={cn(
                    'rounded-md border p-2 text-sm transition-colors',
                    equipment === choice.value ? 'border-primary bg-accent' : 'hover:bg-muted/50',
                  )}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">Muscle group</span>
            <select
              aria-label="Muscle group"
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            >
              {regions.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Photo: {imageSlug ? slugLabel(imageSlug) : 'none'}
          </span>
          <div className="flex gap-2">
            {imageSlug && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setImageSlug(null)}>
                Remove
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setBrowsingImages(v => !v)}
            >
              {browsingImages ? 'Done' : 'Choose a photo'}
            </Button>
          </div>
        </div>

        {/* Only fetched once the user asks — otherwise adding an exercise would
            pull down every bundled photo for no reason. */}
        {browsingImages && (
          <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
            {EXERCISE_IMAGE_SLUGS.map(slug => (
              <button
                key={slug}
                type="button"
                aria-label={slugLabel(slug)}
                aria-pressed={imageSlug === slug}
                onClick={() => {
                  setImageSlug(slug);
                  setBrowsingImages(false);
                }}
                className={cn(
                  'rounded border overflow-hidden',
                  imageSlug === slug ? 'ring-2 ring-primary' : 'hover:opacity-80',
                )}
              >
                <img
                  src={`/exercise-images/${slug}.jpg`}
                  alt={slugLabel(slug)}
                  loading="lazy"
                  className="w-full h-16 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={submit} disabled={!canSave}>
          Add exercise
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
