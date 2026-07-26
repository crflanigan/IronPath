import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  dismissInstall,
  hasDismissedInstall,
  hasSeenTour,
  isIOS,
  isStandalone,
  visitCount,
} from '@/lib/onboarding';

/**
 * "Add to home screen", for people who do not know that is a thing.
 *
 * Not being in an app store reads to a lot of people as the app not being
 * real, and the install affordance is buried — on iOS it is inside the Share
 * sheet, which nobody finds by accident.
 *
 * Timing is deliberate: this waits for a **second visit**. Asking someone to
 * install before they have used anything converts badly, and it is also the
 * point at which the ask stops being pushy and starts being useful.
 */

/** Chrome's install event, which is not in lib.dom. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function shouldConsiderPrompting(): boolean {
  // Already installed, already said no, or still finding their feet.
  if (isStandalone()) return false;
  if (hasDismissedInstall()) return false;
  if (!hasSeenTour()) return false;
  return visitCount() >= 2;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldConsiderPrompting()) return;

    // iOS has no install API whatsoever, so instructions are the only option.
    if (isIOS()) {
      setVisible(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      // Suppress Chrome's own mini-infobar so this is the only ask.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const close = () => {
    dismissInstall();
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // The browser refused to show it — nothing useful to do, and certainly
      // nothing worth breaking the page over.
    }
    close();
  };

  if (!visible) return null;

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

          {isIOS() ? (
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              Tap
              {/* The Share glyph is the one thing people genuinely cannot find,
                  so it is drawn inline rather than described. */}
              <Share className="mx-1 inline h-4 w-4 align-text-bottom" aria-label="Share" />
              in Safari&rsquo;s toolbar, then <strong>Add to Home Screen</strong>.
              It opens full screen and works with no signal.
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Add it to your home screen. It opens full screen and works with
                no signal.
              </p>
              <Button size="sm" onClick={install}>
                Install
              </Button>
            </>
          )}
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
