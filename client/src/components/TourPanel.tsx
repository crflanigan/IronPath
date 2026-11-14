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
        'absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-gray-200/80 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float outline-none dark:border-white/10 dark:bg-gray-800'
      }
    >
      <div className="mx-auto max-w-md space-y-3">
        {/* Where you are in the tour, drawn as well as said: the bar is read
            in a glance, the words are there for whoever needs them. */}
        {stepCount > 1 && (
          <div className="flex items-center justify-between gap-4">
            <p className="eyebrow !text-primary">
              Step {stepIndex + 1} of {stepCount}
            </p>
            <div className="flex flex-1 justify-end gap-1.5" aria-hidden="true">
              {Array.from({ length: stepCount }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === stepIndex
                      ? 'bg-brand w-6'
                      : i < stepIndex
                        ? 'w-1.5 bg-primary/50'
                        : 'w-1.5 bg-gray-200 dark:bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
        <h2 key={title} className="animate-rise-in text-xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{body}</p>
        {children}

        <div className="flex items-center justify-between pt-1">
          {/* On a one-step tour, Skip and Got it are the same action, and
              offering both invites a moment's thought about a difference that
              does not exist. */}
          {stepCount > 1 ? (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={onNext} className="px-5">
              {isLast ? 'Got it' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
