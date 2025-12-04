import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Suppress runtime-error-plugin errors specifically
    if (error.message.includes("Cannot read properties of undefined (reading 'frame')")) {
      console.warn("Suppressed runtime-error-plugin error:", error);
      return;
    }
    
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Don't show error UI for runtime-error-plugin errors
      if (this.state.error?.message.includes("Cannot read properties of undefined (reading 'frame')")) {
        return this.props.children;
      }
      
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-[200px] text-white">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Что-то пошло не так</h2>
            <p className="text-gray-400">Попробуйте обновить страницу</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;