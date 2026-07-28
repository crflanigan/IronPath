import { forwardRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * The bottom sheet both tours use.
 *
 * Shared so the welcome tour and the builder tour cannot drift into looking
 * like two different features. Only the presentation lives here — finding and
 * highlighting a target differs between them, because one scrolls the window
 * and the other scrolls a dialog.
 *
 * It sits at the bottom rather than beside the target on purpose: on a 375px
 * screen an anchored tooltip covers the thing it is pointing at.
 */
export interface TourPanelProps {
  stepIndex: number;
  stepCount: number;
  title: string;
  body: string;
  /** Rendered under the body — the install guide uses this. */
  children?: ReactNode;
  onSkip: () => void;
  onBack?: () => void;
  onNext: () => void;
  isLast: boolean;
  /** Overrides positioning. The builder tour sticks it inside a dialog. */
  className?: string;
}

export const TourPanel = forwardRef<HTMLDivElement, TourPanelProps>(function TourPanel(
  { stepIndex, stepCount, title, body, children, onSkip, onBack, onNext, isLast, className },
  ref,
) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      data-testid="app-tour-panel"
      className={
        className ??
        'absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 shadow-2xl outline-none dark:bg-gray-800'
      }
    >
      <div className="mx-auto max-w-md space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Step {stepIndex + 1} of {stepCount}
        </p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{body}</p>
        {children}

        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={onNext}>
              {isLast ? 'Got it' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
