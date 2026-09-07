import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard, ChevronDown, ChevronUp, Terminal, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  onReturnToDashboard?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught runtime exception:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReturnToDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    if (this.props.onReturnToDashboard) {
      this.props.onReturnToDashboard();
    } else {
      try {
        localStorage.setItem('inboxforge_active_tab', 'dashboard');
        window.location.hash = '#dashboard';
      } catch {}
      window.location.reload();
    }
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[440px] w-full flex items-center justify-center p-6 bg-slate-950/90 rounded-2xl border border-rose-900/40">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {this.props.fallbackTitle || 'Application Error Recovered'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                An isolated issue occurred, but your workspace data, database records, and background jobs are safely preserved in IndexedDB.
              </p>
            </div>

            {/* Error Message & Details View */}
            {this.state.error && (
              <div className="text-left bg-slate-950/95 rounded-xl border border-slate-800/80 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{this.state.error.name || 'Error'}: {this.state.error.message}</span>
                  </span>
                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer transition"
                  >
                    <span>{this.state.showDetails ? 'Hide details' : 'View details'}</span>
                    {this.state.showDetails ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {this.state.showDetails && (
                  <div className="mt-2 pt-2 border-t border-slate-800 font-mono text-[11px] text-slate-400 max-h-48 overflow-y-auto space-y-2 select-text">
                    {this.state.error.stack && (
                      <div>
                        <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Stack Trace:</div>
                        <pre className="whitespace-pre-wrap break-all text-rose-300/80 leading-relaxed font-mono">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div className="pt-2 border-t border-slate-800/60">
                        <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Component Stack:</div>
                        <pre className="whitespace-pre-wrap break-all text-slate-400/80 leading-relaxed font-mono">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3 Explicit Action Buttons: Retry, View details (also accessible above), Return to dashboard */}
            <div className="flex items-center gap-2 pt-2">
              <button
                id="error-boundary-retry-btn"
                onClick={this.handleRetry}
                className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>

              <button
                id="error-boundary-details-btn"
                onClick={this.toggleDetails}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{this.state.showDetails ? 'Hide Details' : 'View Details'}</span>
              </button>

              <button
                id="error-boundary-dashboard-btn"
                onClick={this.handleReturnToDashboard}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Standalone Recoverable Error Card for asynchronous non-render failures
 */
export const AsyncErrorRecoveryCard: React.FC<{
  title?: string;
  error?: string | Error | null;
  onRetry: () => void;
  onReturnToDashboard: () => void;
}> = ({ title = 'Operation Encountered an Error', error, onRetry, onReturnToDashboard }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected failure occurred.';
  const errorStack = error instanceof Error ? error.stack : undefined;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 my-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-100">{title}</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            The operation was safely contained. Workspace data remains intact in IndexedDB.
          </p>
        </div>
      </div>

      <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-3 text-xs">
        <div className="flex items-center justify-between text-slate-300">
          <span className="font-mono text-rose-400 truncate">{errorMessage}</span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer shrink-0 ml-2"
          >
            <span>{showDetails ? 'Hide details' : 'View details'}</span>
            {showDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 rotate-180" />}
          </button>
        </div>
        {showDetails && errorStack && (
          <pre className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-rose-300/70 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
            {errorStack}
          </pre>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onRetry}
          className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>View details</span>
        </button>
        <button
          onClick={onReturnToDashboard}
          className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Return to dashboard</span>
        </button>
      </div>
    </div>
  );
};
