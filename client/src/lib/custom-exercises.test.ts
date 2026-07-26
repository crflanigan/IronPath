import { beforeEach, describe, expect, it } from 'vitest';
import { LocalWorkoutStorage } from './storage';

/**
 * Exercises the user adds themselves. `block` decides how they are logged:
 * main entries are sets x weight x reps, warm-up entries join the core block,
 * which takes reps or a duration and has no weight.
 */

beforeEach(() => {
  localStorage.clear();
});

const deadlift = {
  name: 'Deadlift',
  block: 'main' as const,
  equipment: 'freeweight' as const,
  region: 'Back',
};

const bearCrawl = {
  name: 'Bear Crawl',
  block: 'warmup' as const,
  defaultReps: 2,
};

describe('adding an exercise', () => {
  it('stores it and gives it an id', () => {
    const storage = new LocalWorkoutStorage();
    const created = storage.addCustomExercise(deadlift);

    expect(created.id).toBeGreaterThan(0);
    expect(created.createdAt).toBeTruthy();
    expect(storage.getCustomExercises()).toHaveLength(1);
  });

  it('keeps ids distinct as more are added', () => {
    const storage = new LocalWorkoutStorage();
    const a = storage.addCustomExercise(deadlift);
    const b = storage.addCustomExercise(bearCrawl);

    expect(a.id).not.toBe(b.id);
  });

  it('survives a reload', () => {
    new LocalWorkoutStorage().addCustomExercise(deadlift);
    expect(new LocalWorkoutStorage().getCustomExercises()[0].name).toBe('Deadlift');
  });

  it('defaults to no image', () => {
    const storage = new LocalWorkoutStorage();
    expect(storage.addCustomExercise(deadlift).imageSlug).toBeUndefined();
  });

  it('keeps an image when one was chosen', () => {
    const storage = new LocalWorkoutStorage();
    const created = storage.addCustomExercise({ ...deadlift, imageSlug: 'body-squat' });
    expect(storage.getCustomExercises()[0].imageSlug).toBe('body-squat');
    expect(created.imageSlug).toBe('body-squat');
  });
});

describe('warm-up entries', () => {
  it('need no equipment or weight', () => {
    const storage = new LocalWorkoutStorage();
    storage.addCustomExercise(bearCrawl);

    const [stored] = storage.getCustomExercises();
    expect(stored.block).toBe('warmup');
    expect(stored.equipment).toBeUndefined();
    expect(stored.defaultWeight).toBeUndefined();
  });

  it('can be measured by time instead of reps', () => {
    const storage = new LocalWorkoutStorage();
    storage.addCustomExercise({ name: 'Plank', block: 'warmup', defaultTime: '1:00' });

    expect(storage.getCustomExercises()[0].defaultTime).toBe('1:00');
  });
});

describe('editing and removing', () => {
  it('updates in place', () => {
    const storage = new LocalWorkoutStorage();
    const created = storage.addCustomExercise(deadlift);

    storage.updateCustomExercise(created.id, { ...deadlift, name: 'Romanian Deadlift' });

    expect(storage.getCustomExercises()[0].name).toBe('Romanian Deadlift');
    expect(storage.getCustomExercises()).toHaveLength(1);
  });

  it('reports an unknown id rather than inventing one', () => {
    const storage = new LocalWorkoutStorage();
    expect(storage.updateCustomExercise(999, deadlift)).toBeUndefined();
    expect(storage.deleteCustomExercise(999)).toBe(false);
  });

  it('removes only the one asked for', () => {
    const storage = new LocalWorkoutStorage();
    const a = storage.addCustomExercise(deadlift);
    storage.addCustomExercise(bearCrawl);

    expect(storage.deleteCustomExercise(a.id)).toBe(true);
    expect(storage.getCustomExercises().map(e => e.name)).toEqual(['Bear Crawl']);
  });
});

describe('bad data', () => {
  it('skips unreadable entries instead of losing the list', () => {
    localStorage.setItem(
      'ironpath_custom_exercises',
      JSON.stringify([{ id: 1, name: 'Fine', block: 'main' }, { nonsense: true }]),
    );

    expect(new LocalWorkoutStorage().getCustomExercises().map(e => e.name)).toEqual(['Fine']);
  });

  it('tolerates the key holding something that is not a list', () => {
    localStorage.setItem('ironpath_custom_exercises', '"nope"');
    expect(new LocalWorkoutStorage().getCustomExercises()).toEqual([]);
  });
});

describe('backup', () => {
  it('carries custom exercises across', async () => {
    const storage = new LocalWorkoutStorage();
    storage.addCustomExercise(deadlift);
    storage.addCustomExercise(bearCrawl);

    const backup = await storage.exportData();
    expect(backup.customExercises).toHaveLength(2);

    localStorage.clear();
    await storage.importData(backup);

    expect(storage.getCustomExercises().map(e => e.name)).toEqual(['Deadlift', 'Bear Crawl']);
  });

  it('is cleared by a full reset', async () => {
    const storage = new LocalWorkoutStorage();
    storage.addCustomExercise(deadlift);

    await storage.clearAllData();

    expect(storage.getCustomExercises()).toEqual([]);
  });
});
