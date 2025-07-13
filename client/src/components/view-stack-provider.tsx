import { createContext, ReactNode, useContext, useState } from 'react';

interface ViewStackContextType {
  currentView: string;
  pushView: (view: string) => void;
  popView: () => void;
}

const ViewStackContext = createContext<ViewStackContextType | undefined>(undefined);

export function ViewStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<string[]>(['calendar']);

  const pushView = (view: string) => {
    setStack(prev => [...prev, view]);
  };

  const popView = () => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, prev.length - 1) : prev));
  };

  const currentView = stack[stack.length - 1];

  return (
    <ViewStackContext.Provider value={{ currentView, pushView, popView }}>
      {children}
    </ViewStackContext.Provider>
  );
}

export function useViewStack() {
  const context = useContext(ViewStackContext);
  if (!context) {
    throw new Error('useViewStack must be used within a ViewStackProvider');
  }
  return context;
}
