import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { backUpNow } from '@/lib/backup';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 space-y-4 text-center flex flex-col items-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-muted-foreground">Something went wrong.</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="text-xs whitespace-pre-wrap text-left w-full overflow-auto bg-muted/50 p-2 rounded">
              {this.state.error.message}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
          <div className="flex justify-center gap-2">
            <Button onClick={this.resetError}>Try Again</Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Reload App
            </Button>
          </div>
          {/* The way out. A crash caused by something in storage will happen
              again on every reload, and without this the data behind it is
              unreachable — there is no server copy to fall back on. */}
          <p className="max-w-xs text-xs text-muted-foreground">
            Your workouts are still saved on this device. If this keeps
            happening, save a copy of them first.
          </p>
          <Button variant="outline" size="sm" onClick={() => void backUpNow()}>
            Save a backup
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
