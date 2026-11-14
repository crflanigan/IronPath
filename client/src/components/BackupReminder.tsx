import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { localWorkoutStorage } from '@/lib/storage';
import { backUpNow, describeAge } from '@/lib/backup';
import { toast } from '@/hooks/use-toast';

/**
 * The one honest cost of "no login", said out loud at the moment it matters.
 *
 * There is no account, so there is no server copy: the phone is the only place
 * a training history exists. Export has been in Settings all along, but
 * nothing ever pointed at it, which in practice meant nobody had a backup
 * until the day they needed one.
 *
 * Appears after every ten completed workouts that exist nowhere else, takes
 * one tap to satisfy, and "Later" buys another ten. It never blocks anything.
 */
export function BackupReminder() {
  const [status, setStatus] = useState(() => localWorkoutStorage.getBackupStatus());

  if (!status.shouldRemind) return null;

  const refresh = () => setStatus(localWorkoutStorage.getBackupStatus());

  const backUp = async () => {
    try {
      const outcome = await backUpNow();
      if (outcome === 'cancelled') return;
      toast({
        title: 'Backup saved',
        description: 'Keep that file somewhere other than this phone.',
      });
      refresh();
    } catch {
      toast({
        title: 'Backup failed',
        description: 'Your workouts could not be exported.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10"
      data-testid="backup-reminder"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {status.sinceBackup} workouts live only on this device
          </p>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            IronPath has no account and no server, so there is no other copy.{' '}
            {status.lastBackupAt
              ? `Your last backup was ${describeAge(status.lastBackupAt)}.`
              : 'You have never saved a backup.'}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={backUp}>
              Back up now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                localWorkoutStorage.snoozeBackupReminder();
                refresh();
              }}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
