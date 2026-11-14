import { describe, expect, it } from 'vitest';
import {
  EXERCISE_IMAGE_SLUGS,
  exerciseImageSrc,
  hasExerciseImage,
  slugForExercise,
} from './exercise-images';
import { exerciseLibrary } from './exercise-library';
import { absLibrary } from './abs-library';
// @ts-expect-error - vite raw import
import SW_SRC from '../../public/sw.js?raw';

const IMAGE_FILES = import.meta.glob('../../public/exercise-images/*', { eager: false });

function filesOnDisk(): string[] {
  return Object.keys(IMAGE_FILES)
    .map(path => (path.split('/').pop() as string).replace(/\.[a-z]+$/, ''))
    .filter(slug => slug !== 'placeholder')
    .sort();
}

describe('the slug list matches what is actually shipped', () => {
  it('lists every photo in public/exercise-images', () => {
    expect([...EXERCISE_IMAGE_SLUGS].sort()).toEqual(filesOnDisk());
  });

  it('is the same set the service worker precaches', () => {
    const precached = Array.from(
      (SW_SRC as string).matchAll(/'\/exercise-images\/([^']+)'/g),
      (m: RegExpMatchArray) => m[1].replace(/\.[a-z]+$/, ''),
    )
      .filter(slug => slug !== 'placeholder')
      .sort();

    // An exercise with a photo that is not precached would be missing exactly
    // when it is most wanted: offline, in front of an unfamiliar machine.
    expect(precached).toEqual([...EXERCISE_IMAGE_SLUGS].sort());
  });
});

describe('slugForExercise', () => {
  it('matches the naming the files already use', () => {
    expect(slugForExercise('Seated Chest Press')).toBe('seated-chest-press');
    expect(slugForExercise('45 Degree Leg Press')).toBe('45-degree-leg-press');
  });

  it('drops parenthesised qualifiers, as the files do', () => {
    expect(slugForExercise('Standing Calf Raise (1-DB)')).toBe('standing-calf-raise');
  });

  it('survives punctuation and stray spacing', () => {
    expect(slugForExercise('  Bear   Crawl!  ')).toBe('bear-crawl');
  });
});

describe('image availability', () => {
  it('resolves a photo that exists', () => {
    expect(exerciseImageSrc('Seated Row')).toBe('/exercise-images/seated-row.jpg');
    expect(hasExerciseImage('Seated Row')).toBe(true);
  });

  it('reports nothing for an exercise with no photo', () => {
    expect(exerciseImageSrc('Sled Push')).toBeNull();
    expect(hasExerciseImage('Sled Push')).toBe(false);
  });

  it('honours an explicitly chosen photo', () => {
    expect(exerciseImageSrc('Sled Push', 'push-up')).toBe('/exercise-images/push-up.jpg');
    expect(hasExerciseImage('Sled Push', 'push-up')).toBe(true);
  });

  it('reports nothing when the chosen photo does not exist', () => {
    expect(hasExerciseImage('Sled Push', 'not-a-real-photo')).toBe(false);
  });

  it('serves a drawn image as an SVG', () => {
    expect(exerciseImageSrc('Jack Knife')).toBe('/exercise-images/jack-knife.svg');
    expect(exerciseImageSrc('Sled Push', 'plank')).toBe('/exercise-images/plank.svg');
  });

  it('has an image for every core-block exercise', () => {
    // These ten were the only built-in exercises with nothing to show.
    const missing = absLibrary.filter(a => !hasExerciseImage(a.name)).map(a => a.name);
    expect(missing).toEqual([]);
  });

  it('does not attach an extra drawing just because a name matches', () => {
    // Pictures on custom exercises are opt-in. "Deadlift" gets the deadlift
    // drawing when it is chosen, not because of what it is called.
    expect(exerciseImageSrc('Deadlift')).toBeNull();
    expect(exerciseImageSrc('Bear Crawl')).toBeNull();
    expect(exerciseImageSrc('Deadlift', 'deadlift')).toBe('/exercise-images/deadlift.svg');
  });

  it('keeps every drawn image small', async () => {
    // The point of drawing them. A photo here is ~40 KB.
    const sources = import.meta.glob('../../public/exercise-images/*.svg', {
      query: '?raw',
      import: 'default',
    });
    for (const [path, load] of Object.entries(sources)) {
      const text = (await load()) as string;
      expect(text.length, path).toBeLessThan(8 * 1024);
    }
  });

  it('covers most of the built-in library', () => {
    const withPhotos = exerciseLibrary.filter(e => hasExerciseImage(e.machine));
    expect(withPhotos.length).toBeGreaterThan(exerciseLibrary.length * 0.8);
  });
});
