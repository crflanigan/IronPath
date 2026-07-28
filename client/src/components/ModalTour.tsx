import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TourPanel } from '@/components/TourPanel';

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

/** The nearest ancestor that actually scrolls, or null if none does. */
function scrollParent(el: Element): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export interface ModalTourStep {
  /** Matches a `data-builder-tour` attribute inside the dialog. */
  target: string;
  title: string;
  body: string;
}

export const BUILDER_STEPS: ModalTourStep[] = [
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

/**
 * Steps shown on the template picker, before the builder is even open.
 *
 * That screen is the first thing you land on after tapping "Create or Edit
 * Custom Workout", and nothing on it explains what it is for — the tour used
 * to start one screen later, past the button the person actually pressed.
 */
export const TEMPLATE_STEPS: ModalTourStep[] = [
  {
    target: 'create-custom',
    title: 'Start from a preset, or from scratch',
    body: 'The list above holds ready-made workouts you can drop onto any day. Create Custom Workout builds your own instead, choosing exercises yourself.',
  },
];

export function ModalTour({
  steps,
  onDone,
  sticky = true,
}: {
  steps: ModalTourStep[];
  onDone: () => void;
  /**
   * Pin the panel to the bottom of a scrolling dialog. The builder is tall and
   * scrolls, so its panel has to stay put; the template picker is short and has
   * no scroll container at all, where `position: sticky` has nothing to stick
   * to and ends up overlaying the list instead of sitting under it.
   */
  sticky?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const finish = useCallback(() => {
    onDone();
  }, [onDone]);

  /*
   * Hand the dialog back scrolled where it was found.
   *
   * The last step scrolls to the very bottom, and without this the builder is
   * left there — staring at Save on a workout with nothing selected yet, three
   * screens below the exercises you are meant to pick first. Exactly the
   * stranding the welcome tour had, which is what PR #158 was about; the
   * behaviour did not survive the rewrite to outlines.
   *
   * Captured in a layout effect declared ahead of the one that scrolls, since
   * effects run in declaration order.
   */
  const restore = useRef<{ el: HTMLElement; top: number } | null>(null);
  useLayoutEffect(() => {
    // This tour's own first target, not any `[data-builder-tour]` on the page:
    // the template picker stays mounted behind the builder, so a bare
    // attribute selector finds *its* element, in a dialog that does not
    // scroll — and the container captured here would be the wrong one, or
    // none at all.
    const first = document.querySelector(`[data-builder-tour="${steps[0].target}"]`);
    const container = first ? scrollParent(first) : null;
    if (container) restore.current = { el: container, top: container.scrollTop };
    return () => {
      if (restore.current) restore.current.el.scrollTop = restore.current.top;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture once, on mount
  }, []);

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
    <div data-testid="modal-tour" className="contents">
      <TourPanel
      ref={panelRef}
      /*
       * `-bottom-6` and `-mx-6` reach over DialogContent's `p-6`, so the panel
       * meets the dialog's edges instead of leaving a strip of scrolling
       * content visible beneath it. The bottom corners match the dialog's own
       * `sm:rounded-lg`; square ones against a rounded dialog read as a
       * mistake.
       */
      className={
        sticky
          ? 'sticky -bottom-6 z-10 -mx-6 -mb-6 rounded-t-2xl bg-white p-5 shadow-2xl outline-none rounded-b-lg dark:bg-gray-800'
          : '-mx-6 -mb-6 rounded-b-lg border-t bg-gray-50 p-5 outline-none dark:bg-gray-900/40'
      }
      stepIndex={index}
      stepCount={steps.length}
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
