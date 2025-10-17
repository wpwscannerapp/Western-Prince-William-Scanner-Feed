import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="tw-min-h-screen tw-flex tw-col tw-items-center tw-justify-center tw-bg-background tw-p-4">
          <Card className="tw-w-full tw-max-w-md tw-text-center tw-bg-card tw-border-destructive tw-border-2 tw-shadow-lg">
            <CardHeader>
              <AlertTriangle className="tw-h-12 tw-w-12 tw-text-destructive tw-mx-auto tw-mb-4" />
              <CardTitle className="tw-text-2xl tw-font-bold tw-text-destructive">
                Something went wrong.
              </CardTitle>
              <CardDescription className="tw-text-muted-foreground">
                An unexpected error occurred in the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="tw-space-y-4">
              <p className="tw-text-sm tw-text-foreground">
                We're sorry for the inconvenience. Please try refreshing the page.
              </p>
              {this.state.error && (
                <details className="tw-text-xs tw-text-muted-foreground tw-text-left tw-bg-muted tw-p-3 tw-rounded-md">
                  <summary className="tw-cursor-pointer tw-font-medium">Error Details</summary>
                  <pre className="tw-mt-2 tw-whitespace-pre-wrap tw-break-all">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              <Button onClick={this.handleRefresh} className="tw-w-full tw-bg-primary hover:tw-bg-primary/90 tw-text-primary-foreground">
                <RefreshCcw className="tw-mr-2 tw-h-4 tw-w-4" /> Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;