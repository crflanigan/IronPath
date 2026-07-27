import { useEffect, useState } from 'react';
import { Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  canPromptInstall,
  installRoute,
  promptInstall,
  subscribeToInstallability,
} from '@/lib/install';
import { iosBrowser } from '@/lib/onboarding';

/**
 * How to install IronPath, wherever that question gets asked.
 *
 * Used in three places on purpose — the last tour step, a permanent entry in
 * Settings, and the second-visit banner — because "why isn't this in the app
 * store, how do I get it" is a question people ask at unpredictable moments,
 * and the first version of this had exactly one answer point that was gated
 * behind a visit count. Someone who skipped the tour, or whose browser never
 * fires `beforeinstallprompt`, had nowhere to find out.
 */
export function InstallGuide({ onInstalled }: { onInstalled?: () => void }) {
  const [, force] = useState(0);

  // The install event can land after this renders.
  useEffect(() => subscribeToInstallability(() => force(n => n + 1)), []);

  const route = installRoute();
  if (route === 'none') return null;

  if (route === 'ios') {
    /*
     * Named the browser you are actually in, or named none at all.
     *
     * This used to say "in Safari's toolbar" to every iOS visitor, which is
     * an instruction a Chrome user cannot follow without leaving the page
     * first. Chrome, Firefox and Edge on iOS all have the same Share sheet
     * and most builds offer Add to Home Screen from it — so the honest
     * advice is to try the browser in hand, with Safari named only as the
     * fallback that is always there.
     */
    const inSafari = iosBrowser() === 'safari';

    return (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Tap
          {/* The one thing people genuinely cannot find, so it is drawn
              rather than described. */}
          <Share className="mx-1 inline h-4 w-4 align-text-bottom" aria-label="the Share button" />
          {inSafari ? ' in the toolbar' : ' in this browser'}, then{' '}
          <strong>Add to Home Screen</strong>. It opens full screen, with no
          address bar, and works with no signal.
        </p>
        {!inSafari && (
          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            No <strong>Add to Home Screen</strong> in that menu? Open{' '}
            ironpath.app in Safari — iOS only lets Safari do it in some
            versions.
          </p>
        )}
      </div>
    );
  }

  if (route === 'manual') {
    return (
      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Open your browser&rsquo;s menu and choose{' '}
        <strong>Install app</strong> or <strong>Add to Home screen</strong>. It
        opens full screen, with no address bar, and works with no signal.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Add IronPath to your home screen. It opens full screen, with no address
        bar, and works with no signal.
      </p>
      <Button
        size="sm"
        onClick={async () => {
          const shown = await promptInstall();
          if (shown) onInstalled?.();
        }}
        disabled={!canPromptInstall()}
      >
        Install IronPath
      </Button>
    </div>
  );
}
