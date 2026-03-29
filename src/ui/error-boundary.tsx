/**
 * Error Boundary
 *
 * Catches rendering errors in child components and displays
 * a fallback UI instead of crashing the entire application.
 */

import { Component } from 'preact';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: any }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div class="p-4 bg-red-900 text-white font-mono text-sm">
          <h2 class="text-lg font-bold mb-2">Game Error</h2>
          <p>Something went wrong. Please reload the game.</p>
          {import.meta.env.DEV && (
            <pre class="mt-2 whitespace-pre-wrap text-xs opacity-80">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            class="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
