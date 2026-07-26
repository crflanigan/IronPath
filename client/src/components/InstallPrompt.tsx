import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstallGuide } from '@/components/InstallGuide';
import {
  dismissInstall,
  hasDismissedInstall,
  hasSeenTour,
  isStandalone,
  visitCount,
} from '@/lib/onboarding';
import { installRoute, subscribeToInstallability } from '@/lib/install';

/**
 * A second-visit reminder, for people who skipped the tour.
 *
 * This used to be the *only* place installing was explained, which was the
 * wrong call: gated behind a visit count and behind Chrome firing
 * `beforeinstallprompt`, it was invisible exactly when someone went looking.
 * The tour now covers it and Settings keeps a permanent copy; this is the
 * backstop for whoever skipped both.
 */
function shouldShow(): boolean {
  if (isStandalone()) return false;
  if (hasDismissedInstall()) return false;
  // Whoever sat through the tour has already been told.
  if (!hasSeenTour()) return false;
  return visitCount() >= 2;
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(shouldShow);
  const [, force] = useState(0);

  // `beforeinstallprompt` can land after this mounts, which changes the guide
  // from written instructions to a one-tap button.
  useEffect(() => subscribeToInstallability(() => force(n => n + 1)), []);

  if (!visible || installRoute() === 'none') return null;

  const close = () => {
    dismissInstall();
    setVisible(false);
  };

  return (
    <div
      className="rounded-lg border border-primary/30 bg-primary/5 p-4 dark:bg-primary/10"
      data-testid="install-prompt"
    >
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Install IronPath
          </p>
          <InstallGuide onInstalled={close} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Dismiss install prompt"
          onClick={close}
          className="-mr-2 -mt-2 h-8 w-8 shrink-0 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
