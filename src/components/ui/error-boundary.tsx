"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Component ErrorBoundary caught an error:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-destructive font-medium mb-1">
            <AlertCircle className="h-4 w-4" />
            <span>Component Error</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Failed to render this section.
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1 text-xs font-medium border border-input hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
