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
/**
 * Images drawn as vectors by `scripts/build-exercise-art.mjs`, rather than
 * stored as photos. A few kilobytes each, against roughly forty for a JPEG.
 *
 * These ten are the core-block exercises, which never had an image at all.
 */
export const CORE_ILLUSTRATED_SLUGS: readonly string[] = [
  'crunch',
  'reverse-crunch',
  'cross-leg-crunch',
  'side-oblique-crunch',
  'straight-leg-thrust',
  'legs-up-vertical-crunch',
  'jack-knife',
  'knee-raise',
  'side-oblique-knee-raise',
  'side-oblique-leg-raise',
];

/**
 * Common movements the built-in library does not include, drawn so there is
 * something fitting to choose for a custom exercise.
 *
 * Chosen, not guessed: a custom exercise gets one of these only when it is
 * picked for it. Pictures on custom exercises are opt-in by design, and a
 * drawing appearing on somebody's existing "Deadlift" because the name
 * happened to match would be the app deciding that for them.
 */
export const EXTRA_ILLUSTRATED_SLUGS: readonly string[] = [
  'plank',
  'bear-crawl',
  'mountain-climber',
  'glute-bridge',
  'deadlift',
  'barbell-squat',
  'bench-press',
  'pull-up',
  'lunge',
  'kettlebell-swing',
  'farmers-carry',
  'dumbbell-curl',
];

export const ILLUSTRATED_SLUGS: readonly string[] = [
  ...CORE_ILLUSTRATED_SLUGS,
  ...EXTRA_ILLUSTRATED_SLUGS,
];

const CHOSEN_ONLY = new Set(EXTRA_ILLUSTRATED_SLUGS);
const ILLUSTRATED = new Set(ILLUSTRATED_SLUGS);

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
  ...ILLUSTRATED_SLUGS,
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
    .replace(/[^a-z0-9-]/g, '');
}

/** Where a known slug's file lives. Photos are JPEGs; drawings are SVGs. */
export function imagePathForSlug(slug: string): string {
  return `/exercise-images/${slug}.${ILLUSTRATED.has(slug) ? 'svg' : 'jpg'}`;
}

/** Path to a photo, or null when there is no photo for this exercise. */
export function exerciseImageSrc(name: string, explicitSlug?: string | null): string | null {
  const slug = explicitSlug ?? slugForExercise(name);
  if (!explicitSlug && CHOSEN_ONLY.has(slug)) return null;
  return SLUG_SET.has(slug) ? imagePathForSlug(slug) : null;
}

/** Whether there is anything worth showing if the user taps this exercise. */
export function hasExerciseImage(name: string, explicitSlug?: string | null): boolean {
  return exerciseImageSrc(name, explicitSlug) !== null;
}
