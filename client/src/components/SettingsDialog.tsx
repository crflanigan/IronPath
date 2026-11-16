import { useState, ChangeEvent, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChevronRight, Download, Eye, Repeat, Sparkles, Timer, Upload, Volume2, type LucideIcon } from 'lucide-react';
import { restTimerEnabled, restTimerSoundEnabled, setRestTimerEnabled, setRestTimerSoundEnabled } from '@/lib/workout-prefs';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { localWorkoutStorage } from '@/lib/storage';
import { AutoScheduleModal } from '@/components/AutoScheduleModal';
import { toast } from '@/hooks/use-toast';
import { backupFilename, describeBackup, downloadJson, readJsonFile } from '@/lib/backup';
import { resetTour } from '@/lib/onboarding';
import { InstallGuide } from '@/components/InstallGuide';
import { installRoute } from '@/lib/install';

/** Hidden entirely once the app is installed, rather than shown as a no-op. */
function InstallSection() {
  if (installRoute() === 'none') return null;
  return (
    <div>
      <p className="eyebrow mb-2 px-1">Install IronPath</p>
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.04]">
        <InstallGuide />
      </div>
    </div>
  );
}

const rowClass =
  'flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 active:bg-gray-200/70 dark:text-gray-100 dark:hover:bg-white/[0.05] dark:active:bg-white/[0.08]';

function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2 px-1">{label}</p>
      <div className="divide-y divide-gray-200/70 overflow-hidden rounded-xl bg-gray-50 dark:divide-white/[0.06] dark:bg-white/[0.04]">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  onClick,
  children,
}: {
  icon: LucideIcon;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={rowClass}>
      <RowIcon icon={icon} />
      <span className="flex-1">{children}</span>
      <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" aria-hidden="true" />
    </button>
  );
}

function SettingsSwitch({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={rowClass}
    >
      <RowIcon icon={icon} />
      <span className="flex-1">
        {label}
        {hint && <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
          checked ? 'bg-brand' : 'bg-gray-300 dark:bg-white/15'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );
}

export function SettingsDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [restTimer, setRestTimer] = useState(restTimerEnabled);
  const [restSound, setRestSound] = useState(restTimerSoundEnabled);
  const [usage, setUsage] = useState({ percent: 0, used: 0, limit: 0 });
  // Held between choosing a file and confirming the replace, so the summary
  // shown in the dialog describes the file actually about to be restored.
  const [pendingImport, setPendingImport] = useState<{ data: unknown; summary: string } | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      setUsage(localWorkoutStorage.getStorageUsage());
    }
  }, [open]);

  const handleExport = async () => {
    try {
      downloadJson(backupFilename(), await localWorkoutStorage.exportData());
    } catch {
      toast({
        title: 'Export failed',
        description: 'Your workouts could not be exported.',
        variant: 'destructive',
      });
    }
  };

  const handleFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so choosing the same file twice still fires onChange.
    event.target.value = '';
    if (!file) return;

    try {
      const data = await readJsonFile(file);
      setPendingImport({ data, summary: describeBackup(data) });
    } catch (error) {
      toast({
        title: "Couldn't read that file",
        description: error instanceof Error ? error.message : 'Unknown error.',
        variant: 'destructive',
      });
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    const { data } = pendingImport;
    setPendingImport(null);

    try {
      await localWorkoutStorage.importData(data);
    } catch {
      // importData validates before writing anything, so existing data is
      // untouched when this happens.
      toast({
        title: 'Restore failed',
        description: 'That backup could not be read. Nothing was changed.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Backup restored', description: 'Reloading…' });
    window.location.reload();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        {/* Same shape as the two workout dialogs: capped height, scrolling on
            an inner element rather than on the transformed DialogContent. This
            one had grown past the screen too — measured 868px against an 839px
            viewport, hanging off both ends with nothing to scroll. */}
        <DialogContent className="overflow-hidden p-0">
        <div className="max-h-[85vh] space-y-4 overflow-y-auto overscroll-contain p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold">Settings</DialogTitle>
          <DialogDescription>Manage app data and preferences.</DialogDescription>
        </DialogHeader>
        {/*
          * A grouped list, not a stack of slabs.
          *
          * This was eight full-width buttons in four colours — two of them the
          * brightest thing in the app, for the two actions used least. Rows in
          * quiet groups put everything at one volume, with the one destructive
          * action set apart at the bottom in red text rather than a red wall.
          */}
        <SettingsGroup label="Training">
          <SettingsRow icon={Repeat} onClick={() => setScheduleOpen(true)}>
            Customize Auto-Schedule
          </SettingsRow>
          <SettingsRow
            icon={Eye}
            onClick={() => { localWorkoutStorage.saveHiddenPresets({}); toast({ title: 'Presets restored', description: 'All presets are visible.' }); }}
          >
            Show Hidden Workout Presets
          </SettingsRow>
          {/* Replaces a "don't show this again" checkbox on the tour itself.
              Skipping already means never again, so the only control worth
              having is the one that brings it back. */}
          <SettingsRow
            icon={Sparkles}
            onClick={() => {
              resetTour();
              window.location.reload();
            }}
          >
            Replay welcome tour
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup label="During a workout">
          <SettingsSwitch
            icon={Timer}
            label="Rest timer"
            hint="Counts down when you tick a set"
            checked={restTimer}
            onChange={on => { setRestTimerEnabled(on); setRestTimer(on); }}
          />
          {restTimer && (
            <SettingsSwitch
              icon={Volume2}
              label="Sound when rest ends"
              checked={restSound}
              onChange={on => { setRestTimerSoundEnabled(on); setRestSound(on); }}
            />
          )}
        </SettingsGroup>

        <SettingsGroup label="Your data">
          <SettingsRow icon={Download} onClick={handleExport}>
            Export Backup
          </SettingsRow>
          <div>
            <input
              id="import-file"
              type="file"
              accept="application/json,.json"
              onChange={handleFileChosen}
              className="hidden"
            />
            <label htmlFor="import-file" className="block cursor-pointer">
              <span className={rowClass}>
                <RowIcon icon={Upload} />
                <span className="flex-1">Restore From Backup</span>
                <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              </span>
            </label>
          </div>
        </SettingsGroup>
        <p className="px-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          A backup holds every workout, template, exercise history entry, note and setting.
          Restoring replaces everything currently on this device.
        </p>

        {/* The permanent answer to "how do I get this on my phone?".
            Renders nothing once the app is installed. */}
        <InstallSection />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="w-full rounded-xl bg-red-500/[0.08] px-4 py-3.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/15 active:bg-red-500/20 dark:text-red-400"
            >
              Reset All Data
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Application</AlertDialogTitle>
              <AlertDialogDescription>This will delete all workouts and preferences. Continue?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 bg-none text-white shadow-none hover:bg-red-700" onClick={async () => { await localWorkoutStorage.clearAllData(); window.location.reload(); }}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="space-y-1 px-1 pt-1 text-center text-xs leading-relaxed text-gray-400 dark:text-gray-500">
          <div className="nums">
            Storage Usage: {Math.round(usage.percent * 100)}% ({(usage.used / 1024).toFixed(1)} KB of {(usage.limit / 1024).toFixed(1)} KB)
          </div>
          <div>
            IronPath v{__APP_VERSION__}{' '}
            <span className="text-gray-400 dark:text-gray-500">{__APP_BUILD__}</span>
            <br />
            Created by Casey Flanigan<br />
            This is an open source project which can be found here: https://github.com/crflanigan/IronPath
          </div>
        </div>
        </div>
        </DialogContent>
      </Dialog>
      <AutoScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={isOpen => !isOpen && setPendingImport(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This file contains {pendingImport?.summary}. Restoring it replaces every workout,
              template and setting currently on this device. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
