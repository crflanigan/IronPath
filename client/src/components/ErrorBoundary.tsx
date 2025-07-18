import React from 'react';
import { Button } from './ui/button';

interface ErrorBoundaryProps {
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    this.setState({ hasError: true, error });
    this.reportError(error);
  };

  private handleErrorEvent = (event: ErrorEvent) => {
    this.setState({ hasError: true, error: event.error || new Error(event.message) });
    this.reportError(event.error || new Error(event.message));
  };

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.addEventListener('error', this.handleErrorEvent);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleErrorEvent);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, info);
    this.reportError(error);
  }

  private reportError(error: Error) {
    // Simple error logging. In a real app, send to logging service here.
    console.error(error);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error!, this.reset);
      }
      return (
        <div className="p-4 text-center space-y-4">
          <h2 className="text-lg font-semibold">Something went wrong.</h2>
          {this.state.error && (
            <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
          )}
          <Button onClick={this.reset}>Retry</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
