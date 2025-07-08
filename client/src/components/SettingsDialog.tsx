import { useState, ChangeEvent } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { localWorkoutStorage } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';

export function SettingsDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const handleExport = async () => {
    const data = await localWorkoutStorage.exportData();
    const headers = ['id', 'date', 'type', 'completed', 'duration'];
    const rows = data.workouts.map(w => [w.id, w.date, w.type, w.completed, w.duration ?? ''].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workouts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      toast({
        title: 'Import not implemented',
        description: 'Importing workouts will be available in a future update.'
      });
      e.target.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage app data and preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button onClick={handleExport} className="w-full">Export Workouts</Button>
          <div>
            <input id="import-file" type="file" accept=".csv" onChange={handleImport} className="hidden" />
            <label htmlFor="import-file">
              <Button asChild className="w-full cursor-pointer">
                <span>Import Workouts</span>
              </Button>
            </label>
          </div>
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
        <div className="text-sm text-gray-500 dark:text-gray-400">
          IronPath v1.0.0
        </div>
      </DialogContent>
    </Dialog>
  );
}
