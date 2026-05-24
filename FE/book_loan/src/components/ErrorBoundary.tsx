import React, { Component, ErrorInfo, ReactNode } from 'react';
import EmptyState from './EmptyState';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
            <EmptyState
              icon="sentiment_very_dissatisfied"
              title="Đã xảy ra lỗi"
              message="Có lỗi không mong muốn xảy ra. Vui lòng thử lại sau."
              action={
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="rounded-xl bg-primary px-6 py-2.5 font-bold text-white transition-colors hover:bg-primary/90"
                >
                  Tải lại trang
                </button>
              }
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
