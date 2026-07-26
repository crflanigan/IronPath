import { describe, expect, it } from 'vitest';
import {
  EXERCISE_IMAGE_SLUGS,
  exerciseImageSrc,
  hasExerciseImage,
  slugForExercise,
} from './exercise-images';
import { exerciseLibrary } from './exercise-library';
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
    expect(exerciseImageSrc('Bear Crawl')).toBeNull();
    expect(hasExerciseImage('Bear Crawl')).toBe(false);
  });

  it('honours an explicitly chosen photo', () => {
    expect(exerciseImageSrc('Bear Crawl', 'push-up')).toBe('/exercise-images/push-up.jpg');
    expect(hasExerciseImage('Bear Crawl', 'push-up')).toBe(true);
  });

  it('reports nothing when the chosen photo does not exist', () => {
    expect(hasExerciseImage('Bear Crawl', 'not-a-real-photo')).toBe(false);
  });

  it('covers most of the built-in library', () => {
    const withPhotos = exerciseLibrary.filter(e => hasExerciseImage(e.machine));
    expect(withPhotos.length).toBeGreaterThan(exerciseLibrary.length * 0.8);
  });
});
