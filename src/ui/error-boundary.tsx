/**
 * Error Boundary
 *
 * Catches rendering errors in child components and displays
 * a fallback UI instead of crashing the entire application.
 */

import { Component } from 'preact';
import { clearFatalError, reportFatalError } from '@/errors';
import * as store from '@/ui/store';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: any }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, _errorInfo: unknown) {
    reportFatalError(error);
  }

  render() {
    if (this.state.error) {
      return (
        <div class="p-4 bg-red-900 text-white font-mono text-sm">
          <h2 class="text-lg font-bold mb-2">Game Error</h2>
          <p>Something went wrong. Return to the main menu and try again.</p>
          {import.meta.env.DEV && (
            <pre class="mt-2 whitespace-pre-wrap text-xs opacity-80">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            aria-label="Retry"
            class="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded"
            onClick={() => {
              clearFatalError();
              store.gameLoading.value = false;
              store.continueRequested.value = false;
              store.menuState.value = 'main';
              this.setState({ error: null });
            }}
          >
            Return to Menu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
