import { Switch, Route, useLocation, useParams } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider, useThemeContext } from '@/components/theme-provider';
import { ViewStackProvider } from '@/components/view-stack-provider';
import { Button } from '@/components/ui/button';
import { CalendarPage } from '@/pages/calendar';
import { WorkoutPage } from '@/pages/workout';
import { HistoryPage } from '@/pages/history';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { CalendarDays, Dumbbell, Moon, Sun, Settings, TrendingUp } from 'lucide-react';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * The two destinations, as a floating bar at the bottom of the screen.
 *
 * This was a strip of tabs under the header: the furthest point on a phone
 * from the thumb that has to reach it, and a second full-width band of chrome
 * stacked on the first. Down here it is one reach away and the header gets to
 * be a single quiet line.
 */
function Navigation() {
  const [location, setLocation] = useLocation();
  const tabs = [
    { path: '/', label: 'Calendar', icon: CalendarDays, active: location === '/' || location.startsWith('/workout') },
    { path: '/history', label: 'History', icon: TrendingUp, active: location === '/history' },
  ];

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex gap-1 rounded-full border border-gray-200/80 bg-white/80 p-1.5 shadow-float backdrop-blur-xl dark:border-white/10 dark:bg-gray-800/80">
        {tabs.map(({ path, label, icon: Icon, active }) => (
          <button
            key={path}
            type="button"
            onClick={() => setLocation(path)}
            aria-current={active ? 'page' : undefined}
            className={`flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? 'bg-brand text-primary-foreground shadow-glow'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function Header() {
  const { theme, toggleTheme } = useThemeContext();
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-gray-50/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-gray-900/75">
      <div className="max-w-md mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-brand flex h-9 w-9 items-center justify-center rounded-xl shadow-glow">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Iron<span className="text-brand">Path</span>
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Button aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} variant="ghost" size="sm" onClick={toggleTheme} className="h-10 w-10 rounded-full p-0 text-gray-600 dark:text-gray-300">
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </Button>
            <SettingsDialog>
              {/* Named here because backup/restore lives behind this button and
                  is otherwise unreachable to a screen reader or a test. */}
              <Button data-tour="settings" aria-label="Settings" variant="ghost" size="sm" className="h-10 w-10 rounded-full p-0 text-gray-600 dark:text-gray-300">
                <Settings className="h-[18px] w-[18px]" />
              </Button>
            </SettingsDialog>
          </div>
        </div>
      </div>
    </header>
  );
}

function WorkoutRoute() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { workouts, loading } = useWorkoutStorage();
  const workoutId = params.id ? parseInt(params.id, 10) : null;
  const currentWorkout = workoutId ? workouts.find(w => w.id === workoutId) : null;

  if (loading) {
    return <div className="max-w-md mx-auto p-4 text-center">Loading workout...</div>;
  }

  if (!currentWorkout) {
    return (
      <div className="max-w-md mx-auto p-4 text-center">
        <p className="text-gray-600 dark:text-gray-400">Workout not found</p>
        <Button onClick={() => setLocation('/')} className="mt-4">Go to Calendar</Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <WorkoutPage 
        workout={currentWorkout} 
        onNavigateBack={() => setLocation('/')} 
      />
    </ErrorBoundary>
  );
}

function AppContent() {
  return (
    <div className="app-backdrop min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Bottom padding clears the floating tab bar. */}
      <main className="flex-1 pb-28">
        <Switch>
          <Route path="/" component={CalendarPage} />
          <Route path="/workout/:id" component={WorkoutRoute} />
          <Route path="/history" component={HistoryPage} />
          <Route>
            <div className="max-w-md mx-auto p-4 text-center">
              <p className="text-gray-600 dark:text-gray-400">Page not found</p>
              <Button onClick={() => window.location.href = '/'} className="mt-4">Go to Calendar</Button>
            </div>
          </Route>
        </Switch>
      </main>
      <Navigation />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <ViewStackProvider>
          <AppContent />
        </ViewStackProvider>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
