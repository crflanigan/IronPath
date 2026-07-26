import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { markTourSeen } from '@/lib/onboarding';

/**
 * A three-step first-run tour.
 *
 * Two decisions worth knowing before changing this:
 *
 * 1. **The explanation sits at the bottom, not next to the target.** An
 *    anchored tooltip on a 375px screen covers the thing it is pointing at —
 *    highlight a calendar cell and the tooltip eats half the calendar. A fixed
 *    bottom panel can never overlap the element above it.
 *
 * 2. **It highlights the live element rather than showing a screenshot.**
 *    Screenshots of your own UI rot; the calendar changed the week this was
 *    written. Pointing at the real button cannot go stale and weighs nothing.
 *
 * Installing the app is deliberately *not* a step here. Asking someone to
 * install before they have used anything converts badly — see InstallPrompt,
 * which waits for a second visit.
 */

interface Step {
  /** Matches a `data-tour` attribute. Absent means a centred card. */
  target?: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: 'calendar',
    title: 'Your month at a glance',
    body: 'Tap any day to see what is scheduled and start it. Days you finish turn green, so a glance tells you how the month went.',
  },
  {
    target: 'custom-workout',
    title: 'Build your own',
    body: 'Make a workout from the exercise library, or add exercises it does not have — bear crawls, deadlifts, whatever you actually do.',
  },
  {
    target: 'settings',
    title: 'Keep a backup',
    body: 'IronPath has no account and no server, so your history lives only on this device. Export a backup from Settings — if you clear your browser or change phones, it is the only way back.',
  },
];

/** Padding around the highlighted element, in px. */
const HALO = 6;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function AppTour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = useCallback(() => {
    markTourSeen();
    onClose();
  }, [onClose]);

  // Measure the target. A missing target is not an error: the step simply
  // renders as a centred card rather than throwing on a page that does not
  // contain it.
  const measure = useCallback(() => {
    if (!step.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step.target]);

  // Bring the target into the part of the screen the panel is not covering.
  //
  // `scrollIntoView({ block: 'center' })` is the obvious approach and it is
  // wrong here: it centres within the *viewport*, and the bottom third of the
  // viewport is this component's own panel. The second step scrolled its
  // button to a position underneath the panel, so the halo was drawn but
  // invisible — the step looked like it had simply failed.
  //
  // Padding the body by the panel height guarantees there is always enough
  // scroll room to lift a target clear, even one at the very bottom of the
  // page. Restored on unmount.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const panelHeight = panel?.offsetHeight ?? 0;

    const previousPadding = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${panelHeight}px`;

    const el = step.target
      ? document.querySelector(`[data-tour="${step.target}"]`)
      : null;

    if (el) {
      const visibleHeight = Math.max(window.innerHeight - panelHeight, 120);
      const box = el.getBoundingClientRect();
      const delta = box.top + box.height / 2 - visibleHeight / 2;
      window.scrollBy({ top: delta, behavior: 'smooth' });
    }

    // The scroll listener keeps the halo tracking during the smooth scroll;
    // this is the settle-time backstop.
    const timer = window.setTimeout(measure, 400);

    return () => {
      window.clearTimeout(timer);
      document.body.style.paddingBottom = previousPadding;
    };
  }, [step.target, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  // Escape closes, and focus moves to the panel so the controls are reachable
  // by keyboard without hunting.
  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
      data-testid="app-tour"
    >
      {/*
        The dimming and the hole in it are the same element. An enormous spread
        on the box-shadow paints everything outside the halo, which avoids
        stacking four separate overlay panels and keeps the cutout exactly
        aligned with the target while it scrolls.
      */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl transition-all duration-200"
          style={{
            top: rect.top - HALO,
            left: rect.left - HALO,
            width: rect.width + HALO * 2,
            height: rect.height + HALO * 2,
            // Both the outline and the dimming, in one shadow. Tailwind's
            // `ring-2` is itself a box-shadow, so an inline boxShadow silently
            // replaces it — the ring never rendered at all until this was
            // written out longhand. It matters most in dark mode, where
            // dimming an already-dark page barely reads.
            boxShadow: '0 0 0 2px var(--primary), 0 0 0 9999px rgba(0, 0, 0, 0.7)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/65" />
      )}

      <div
        ref={panelRef}
        tabIndex={-1}
        data-testid="app-tour-panel"
        className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 shadow-2xl outline-none dark:bg-gray-800"
      >
        <div className="mx-auto max-w-md space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Step {index + 1} of {STEPS.length}
          </p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {step.title}
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {step.body}
          </p>

          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" onClick={finish}>
              Skip
            </Button>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIndex(i => i - 1)}
                >
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => (isLast ? finish() : setIndex(i => i + 1))}
              >
                {isLast ? 'Got it' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
