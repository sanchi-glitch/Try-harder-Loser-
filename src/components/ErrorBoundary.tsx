import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary caught error:', error, info);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#F5F3EE] text-[#111111] p-6">
          <div className="max-w-md w-full rounded-xl border-2 border-[#111111] bg-[#FFFFFF] shadow-[5px_5px_0px_#DC2626] p-6">
            <div className="text-xs font-mono-tabular font-bold text-[#DC2626] uppercase">
              Runtime Error
            </div>
            <h1 className="font-display font-extrabold text-xl mt-1">
              Something went sideways.
            </h1>
            <p className="text-xs text-[#57534E] mt-2 break-words font-mono-tabular">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-[#111111] text-[#F5F3EE] text-xs font-display font-bold hover:bg-[#DC2626] transition-colors cursor-pointer"
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
