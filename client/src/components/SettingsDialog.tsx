import { useState, ChangeEvent, useEffect } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { localWorkoutStorage } from '@/lib/storage';
import { AutoScheduleModal } from '@/components/AutoScheduleModal';
import { toast } from '@/hooks/use-toast';
import { backupFilename, describeBackup, downloadJson, readJsonFile } from '@/lib/backup';
import { resetTour } from '@/lib/onboarding';

export function SettingsDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
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
        <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage app data and preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button onClick={handleExport} className="w-full">Export Backup</Button>
          <div>
            <input
              id="import-file"
              type="file"
              accept="application/json,.json"
              onChange={handleFileChosen}
              className="hidden"
            />
            <label htmlFor="import-file">
              <Button asChild className="w-full cursor-pointer">
                <span>Restore From Backup</span>
              </Button>
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            A backup holds every workout, template, exercise history entry and setting.
            Restoring replaces everything currently on this device.
          </p>
          <Button className="w-full" variant="secondary" onClick={() => setScheduleOpen(true)}>
            Customize Auto-Schedule
          </Button>
          <Button className="w-full" variant="secondary" onClick={() => { localWorkoutStorage.saveHiddenPresets({}); toast({ title: 'Presets restored', description: 'All presets are visible.' }); }}>
            Show Hidden Workout Presets
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">Reset All Data</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Application</AlertDialogTitle>
                <AlertDialogDescription>This will delete all workouts and preferences. Continue?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={async () => { await localWorkoutStorage.clearAllData(); window.location.reload(); }}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Separator />
        {/* Replaces a "don't show this again" checkbox on the tour itself.
            Skipping already means never again, so the only control worth
            having is the one that brings it back. */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            resetTour();
            window.location.reload();
          }}
        >
          Replay welcome tour
        </Button>
        <Separator />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Storage Usage: {Math.round(usage.percent * 100)}% ({(usage.used / 1024).toFixed(1)} KB of {(usage.limit / 1024).toFixed(1)} KB)
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          IronPath v{__APP_VERSION__}<br />
          Created by Casey Flanigan<br />
          This is an open source project which can be found here: https://github.com/crflanigan/IronPath
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
