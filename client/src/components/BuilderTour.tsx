import { useCallback, useEffect, useRef, useState } from 'react';
import { TourPanel } from '@/components/TourPanel';
import { markBuilderTourSeen } from '@/lib/onboarding';

/**
 * A three-step tour of the custom workout builder, shown the first time it is
 * opened.
 *
 * Separate from the welcome tour on purpose. Bolting these steps onto that one
 * would have made it six steps long, and tours are abandoned in proportion to
 * their length — someone who bailed partway would then miss the backup
 * warning, which is the step that actually prevents data loss. Teaching the
 * builder at the moment somebody opens the builder is shorter and better timed.
 *
 * **No spotlight overlay here, unlike the welcome tour.** The builder is a
 * Radix dialog that is both transformed and its own scroll container, which
 * breaks fixed positioning two different ways: `inset-0` resolves against the
 * dialog rather than the viewport, and the overlay then scrolls with the
 * dialog's content. Correcting the offset changes the container's scroll
 * geometry, so it chases itself. Portalling to the body escapes both, but
 * Radix marks every other body child `aria-hidden` and the tour disappears
 * from the accessibility tree — verified, `getByRole` could no longer find the
 * panel.
 *
 * So the target is outlined in place via `data-tour-active` (styled in
 * index.css) and the panel sticks to the bottom of the dialog's own scroll
 * flow. Radix already dims everything outside the dialog, so nothing is lost.
 */

interface Step {
  target: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: 'exercise-row',
    title: 'Pick your exercises',
    body: 'Tick the box to add an exercise to this workout. Tapping the name instead shows a photo of it — useful for anything you have not done before.',
  },
  {
    target: 'new-exercise',
    title: 'Not in the list?',
    body: 'Add your own. Bear crawls, deadlifts, whatever you actually do — they behave like the built-in ones and stay available for future workouts.',
  },
  {
    target: 'name-and-save',
    title: 'Name it, then save',
    body: 'The name and Save sit below every exercise. Once saved you can put the workout on any day, or add it to your rotation.',
  },
];

export function BuilderTour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = useCallback(() => {
    markBuilderTourSeen();
    onClose();
  }, [onClose]);

  // Outline the current target and bring it into view. The attribute is
  // removed on the way out so no element is left permanently ringed.
  useEffect(() => {
    const el = document.querySelector(`[data-builder-tour="${step.target}"]`);
    if (!el) return;

    el.setAttribute('data-tour-active', 'true');
    // `scrollIntoView` walks up to whichever ancestor actually scrolls, which
    // is the dialog — no need to find it by hand. `block: 'end'` plus the
    // `scroll-margin-bottom` in index.css parks the target just above the
    // sticky panel, and works the same for a 31px row and a 144px block;
    // centring does not, because a tall target then overlaps the panel.
    el.scrollIntoView({ block: 'end' });

    return () => el.removeAttribute('data-tour-active');
  }, [step.target]);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        /*
         * Swallowed, or Radix closes the whole builder underneath the tour and
         * a half-built workout goes with it.
         *
         * Not covered by a test: removing this leaves the Escape spec in
         * builder-tour.spec.ts green either way, so that spec is
         * characterisation rather than a guard. Kept because a hand probe did
         * show the difference — do not delete it on the strength of the suite
         * still passing.
         */
        e.stopPropagation();
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [finish]);

  return (
    <div data-testid="builder-tour" className="contents">
      <TourPanel
      ref={panelRef}
      className="sticky bottom-0 z-10 -mx-6 -mb-6 rounded-t-2xl border-t bg-white p-5 shadow-2xl outline-none dark:bg-gray-800"
      stepIndex={index}
      stepCount={STEPS.length}
      title={step.title}
      body={step.body}
      onSkip={finish}
      onBack={index > 0 ? () => setIndex(i => i - 1) : undefined}
      onNext={() => (isLast ? finish() : setIndex(i => i + 1))}
      isLast={isLast}
      />
    </div>
  );
}
