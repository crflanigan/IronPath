import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CustomWorkoutTemplate, localWorkoutStorage } from '@/lib/storage';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Plus, Settings } from 'lucide-react';
import { useViewStack } from './view-stack-provider';
import { ModalTour, TEMPLATE_STEPS } from './ModalTour';
import { hasSeenTemplateTour, markTemplateTourSeen } from '@/lib/onboarding';

/**
 * The gear beside a template row, and the menu it opens.
 *
 * Radix's DropdownMenu opens on `pointerdown`, and it does that for a finger as
 * well as a mouse. In a list that scrolls, that is the wrong moment: a swipe
 * that happens to start on a gear opened the menu as soon as the finger landed,
 * and the menu's scroll lock then cancelled the swipe. The gears run down the
 * right-hand side of the screen, which is where a right thumb scrolls, so this
 * happened a lot. The only reliable place to scroll was the strip of padding at
 * the edge.
 *
 * So for touch and pen the menu opens on `click`, which the browser fires for a
 * tap and never for a scroll. A mouse keeps Radix's open-on-press and the
 * keyboard is untouched. Radix's Select, the only other menu in the app, already
 * works this way, which is why this one felt different.
 */
function RowOptions({ name, children }: { name: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pointerType = useRef('');

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        onPointerDown={e => {
          pointerType.current = e.pointerType;
          // Radix skips its own handler when this one has prevented default.
          if (e.pointerType !== 'mouse') e.preventDefault();
        }}
        onClick={() => {
          // Cleared on use, so a click the keyboard synthesises later is not
          // mistaken for a tap.
          const type = pointerType.current;
          pointerType.current = '';
          if (type === 'touch' || type === 'pen') setOpen(true);
        }}
      >
        <Button aria-label={`Options for ${name}`} variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

interface WorkoutTemplateSelectorModalProps {
  open: boolean;
  customTemplates: CustomWorkoutTemplate[];
  onClose: () => void;
  onSelectTemplate: (template: string) => void;
  onCreateCustom: () => void;
  onClonePreset: (preset: string) => void;
  onDeleteTemplate: (id: number) => void;
  onEditTemplate: (template: CustomWorkoutTemplate) => void;
}

export function WorkoutTemplateSelectorModal({ open, customTemplates, onClose, onSelectTemplate, onCreateCustom, onClonePreset, onDeleteTemplate, onEditTemplate }: WorkoutTemplateSelectorModalProps) {
  const { pushView } = useViewStack();
  const [hiddenPresets, setHiddenPresets] = useState<Record<string, boolean>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  // Read once per mount; finishing writes the flag and re-reading would tear
  // the panel down mid-transition.
  const [showTour, setShowTour] = useState(() => !hasSeenTemplateTour());

  useEffect(() => {
    if (open) {
      setHiddenPresets(localWorkoutStorage.getHiddenPresets());
    }
  }, [open]);
  const presetList = [
    'Chest Day',
    'Legs',
    'Back & Biceps',
    'Back, Biceps & Legs',
    'Chest & Triceps',
    'Chest & Shoulders',
    'Chest, Shoulders & Legs',
  ];
  const visiblePresets = presetList.filter(name => !hiddenPresets[name]);
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/*
        * Scrolls on an inner element, like the builder.
        *
        * This dialog had no height cap and no overflow at all: with eight
        * custom workouts it measured 1122px in an 839px viewport, hanging
        * 143px off both the top and the bottom with nothing to scroll —
        * which is why the fix was to delete workouts until the list fit.
        * Adding a tour panel at the bottom then put "Got it" off screen.
        *
        * The scroll is on the inner div rather than DialogContent because
        * DialogContent is `position: fixed` with a transform, which is the
        * configuration iOS Safari handles worst.
        */}
      <DialogContent className="overflow-hidden p-0">
        <div className="max-h-[85vh] space-y-4 overflow-y-auto overscroll-contain p-6">
        <DialogHeader>
          <DialogTitle>Select Workout Template</DialogTitle>
          <DialogDescription>
            Choose a template to pre-fill your workout details.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-2">
          {visiblePresets.map(name => (
            <div key={name} className="flex items-center space-x-1">
              <Button
                variant="outline"
                className="flex-1 justify-start"
                onClick={() => onSelectTemplate(name)}
              >
                {name}
              </Button>
              <RowOptions name={name}>
                <DropdownMenuItem
                  onClick={() => {
                    onClonePreset(name);
                    pushView('customWorkoutBuilder');
                  }}
                >
                  Clone as custom
                </DropdownMenuItem>
              </RowOptions>
            </div>
          ))}

          {/*
            * This is an action, not a template, and it used to be impossible to
            * tell: same outlined card as Chest Day or Legs, with a gear beside
            * it. A verb among nouns, and a gear implying "configure the
            * create-new action", which is not a thing.
            *
            * It stays in the list rather than moving below a divider. Pulling
            * it out cost a separator plus a full-width row, and that space is
            * worth most exactly when it is scarcest — a picker holding a lot of
            * custom workouts already scrolls.
            *
            * So the difference is carried by colour instead: the primary teal
            * on the border, text and icon, against the neutral grey of every
            * template around it. Same footprint, unmistakably not a template.
            *
            * The gear is gone regardless. It called the same handler as the
            * button beside it, so the row held two controls doing one job and a
            * screen reader found two buttons with the same name.
            */}
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              className="flex-1 justify-start border-primary text-primary hover:bg-primary/10 hover:text-primary"
              data-builder-tour="create-custom"
              onClick={() => {
                onCreateCustom();
                pushView('customWorkoutBuilder');
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Workout
            </Button>
            {/*
              * Holds the space a template's gear occupies, so this row ends
              * where every row above it ends. Without it the button was
              * `w-full` and ran 44px past them, which read as a mistake rather
              * than as emphasis.
              */}
            <div className="h-10 w-10 shrink-0" aria-hidden="true" />
          </div>

          <Separator className="my-2" />

          {customTemplates.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Custom Workouts</div>
              {customTemplates.map(t => (
                <div key={t.id} className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    className="flex-1 justify-start"
                    onClick={() => onSelectTemplate(t.name)}
                  >
                    {t.name}
                  </Button>
                  <RowOptions name={t.name}>
                    <DropdownMenuItem
                      onClick={() => {
                        onEditTemplate(t);
                        pushView('customWorkoutBuilder');
                      }}
                    >
                      Edit workout
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setPendingDeleteId(t.id);
                      }}
                    >
                      Delete workout
                    </DropdownMenuItem>
                  </RowOptions>
                </div>
              ))}
            </div>
          )}

        </div>
        {showTour && (
          <ModalTour
            steps={TEMPLATE_STEPS}
            onDone={() => {
              markTemplateTourSeen();
              setShowTour(false);
            }}
          />
        )}
        </div>
      </DialogContent>
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={o => !o && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (pendingDeleteId !== null) {
                  onDeleteTemplate(pendingDeleteId);
                  setPendingDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
