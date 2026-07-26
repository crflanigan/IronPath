/**
 * Which exercises actually have a reference photo.
 *
 * Previously every exercise name was tappable and the dialog fell back to a
 * placeholder for the ones with no photo, with a hand-maintained list of ten
 * core exercises excluded by name. Knowing up front what exists lets the
 * affordance simply not appear, and replaces that list with something derived.
 *
 * Kept in step with `client/public/exercise-images/` by a test, which also
 * checks the service worker precaches exactly this set.
 */
export const EXERCISE_IMAGE_SLUGS: readonly string[] = [
  '1-arm-curl-with-twist',
  '45-degree-leg-press',
  'abductor',
  'adductor',
  'adjustable-cable-crossover',
  'bar-curl',
  'bent-over-rear-deltoid',
  'body-squat',
  'cable-front-deltoid-raise',
  'close-grip-pulldown',
  'glute-machine',
  'high-pulley-kick-back',
  'kick-back',
  'lateral-raise',
  'lateral-raise-machine',
  'low-pulley-1-arm-curl',
  'low-pulley-straight-bar-curl',
  'pec-fly',
  'preacher-curl',
  'push-up',
  'seated-back-extension',
  'seated-chest-press',
  'seated-dip',
  'seated-lateral-raise',
  'seated-leg-curl',
  'seated-leg-extension',
  'seated-leg-press',
  'seated-row',
  'seated-shoulder-press',
  'seated-shrug',
  'standing-1-leg-calf-raise',
  'standing-barbell-shrug',
  'standing-calf-raise',
  'standing-shrug',
  'standing-wrist-curl-with-extension',
  'straight-bar-pushdown',
  'v-bar-pushdown',
  'wide-grip-pulldown',
];

const SLUG_SET = new Set(EXERCISE_IMAGE_SLUGS);

/**
 * Filename an exercise's photo would use.
 *
 * Unchanged from what the image dialog already did: lowercase, drop anything
 * parenthesised, hyphenate, strip the rest.
 */
export function slugForExercise(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

/** Path to a photo, or null when there is no photo for this exercise. */
export function exerciseImageSrc(name: string, explicitSlug?: string | null): string | null {
  const slug = explicitSlug ?? slugForExercise(name);
  return SLUG_SET.has(slug) ? `/exercise-images/${slug}.jpg` : null;
}

/** Whether there is anything worth showing if the user taps this exercise. */
export function hasExerciseImage(name: string, explicitSlug?: string | null): boolean {
  return exerciseImageSrc(name, explicitSlug) !== null;
}
