import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props {
  viewName: string;
  onReset?: () => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class WorkspaceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[LOCUS AI] Error in ${this.props.viewName}:`, error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <section
          aria-label={`${this.props.viewName} Recovery Screen`}
          className="relative flex min-h-[600px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/[0.08] bg-[#03020A] p-8 text-center text-white"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/15">
            <AlertTriangle className="h-7 w-7 text-[#FB923C]" />
          </div>

          <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-white sm:text-xl">
            {this.props.viewName} encountered an unexpected state
          </h2>

          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300">
            {this.state.errorMessage ||
              'A runtime error prevented this stage from displaying properly. You can return to Market Discovery to reload candidate location parameters.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#E879F9]/50 bg-gradient-to-r from-[#4F46E5] via-[#A855F7] to-[#F97316] px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition-all hover:brightness-110"
            >
              <ArrowLeft className="h-4 w-4 text-[#FDBA74]" />
              <span>Return to 01 / Market Discovery</span>
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
