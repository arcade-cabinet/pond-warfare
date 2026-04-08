/**
 * Error Overlay
 *
 * Displays errors to the user — NEVER hidden.
 * - Fatal errors: blocking modal that requires action
 * - Non-fatal errors: toast notification in the corner
 * - Error log: expandable list of recent errors for debugging
 */

import { useEffect, useState } from 'preact/hooks';
import {
  clearErrorLog,
  clearFatalError,
  type ErrorLogEntry,
  getErrorLog,
  getFatalError,
  subscribeErrors,
  subscribeFatalError,
} from '@/errors';
import { restartMountedGameSession } from '@/game/shell-session';
import * as store from '@/ui/store';
import { Frame9Slice } from './components/frame';

/** Fatal error modal — blocks the screen until the session is safely recovered. */
function FatalErrorModal({ error }: { error: Error }) {
  const handleRecovery = () => {
    clearFatalError();
    if (store.menuState.value === 'playing') {
      void restartMountedGameSession();
      return;
    }
    store.gameLoading.value = false;
    store.continueRequested.value = false;
    store.menuState.value = 'main';
  };

  return (
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
      <div class="max-w-lg w-full mx-4">
        <Frame9Slice>
          <div class="p-6">
            <h2 class="font-title text-2xl text-[var(--pw-enemy)] mb-4">Fatal Error</h2>
            <p class="font-game text-[var(--pw-text-primary)] mb-2">{error.message}</p>
            <p class="font-game text-xs text-[var(--pw-text-muted)]">
              The current session cannot continue until it is safely restarted.
            </p>
            {error.stack && (
              <pre class="font-numbers text-[10px] text-[var(--pw-text-muted)] bg-black/40 p-3 rounded mt-2 max-h-40 overflow-auto whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
            <div class="flex gap-3 mt-6">
              <button
                type="button"
                class="action-btn px-4 py-2 min-h-[44px] font-heading text-sm"
                onClick={handleRecovery}
              >
                {store.menuState.value === 'playing' ? 'Retry Session' : 'Return to Menu'}
              </button>
            </div>
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}

/** Toast notification for non-fatal errors. */
function ErrorToast({ entry, onDismiss }: { entry: ErrorLogEntry; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div class="bg-[var(--pw-enemy)]/90 text-white px-4 py-2 rounded shadow-lg max-w-sm font-game text-xs flex items-start gap-2">
      <span class="flex-1">
        <span class="font-heading text-[10px] opacity-70">[{entry.system}]</span> {entry.message}
      </span>
      <button type="button" class="opacity-60 hover:opacity-100" onClick={onDismiss}>
        x
      </button>
    </div>
  );
}

/** Main error overlay — renders fatal modal and error toasts. */
export function ErrorOverlay() {
  const [fatalErr, setFatalErr] = useState<Error | null>(getFatalError());
  const [toasts, setToasts] = useState<ErrorLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [logEntries, setLogEntries] = useState<readonly ErrorLogEntry[]>(getErrorLog());

  useEffect(() => {
    const unsubFatal = subscribeFatalError(() => {
      setFatalErr(getFatalError());
    });

    const unsubErrors = subscribeErrors(() => {
      const log = getErrorLog();
      setLogEntries([...log]);
      // Show toast for the latest non-fatal error
      if (log.length > 0) {
        const latest = log[log.length - 1];
        if (!latest.isFatal) {
          setToasts((prev) => [...prev.slice(-4), latest]); // max 5 toasts
        }
      }
    });

    return () => {
      unsubFatal();
      unsubErrors();
    };
  }, []);

  return (
    <>
      {/* Fatal error modal */}
      {fatalErr && <FatalErrorModal error={fatalErr} />}

      {/* Error toasts (bottom-right corner) */}
      {toasts.length > 0 && (
        <div class="fixed bottom-4 right-4 z-[9998] flex flex-col gap-2">
          {toasts.map((t, i) => (
            <ErrorToast
              key={`${t.timestamp}-${i}`}
              entry={t}
              onDismiss={() => setToasts((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}

      {/* Debug error log toggle (dev only) */}
      {logEntries.length > 0 && (
        <button
          type="button"
          class="fixed bottom-4 left-4 z-[9998] bg-[var(--pw-enemy)]/80 text-white text-[10px] px-2 py-1 rounded font-numbers"
          onClick={() => setShowLog(!showLog)}
        >
          Errors: {logEntries.length}
        </button>
      )}

      {/* Expanded error log */}
      {showLog && (
        <div class="fixed bottom-10 left-4 z-[9998] bg-black/95 text-white p-4 rounded-lg max-w-md max-h-80 overflow-auto font-numbers text-[10px]">
          <div class="flex justify-between mb-2">
            <span class="font-heading text-xs">Error Log ({logEntries.length})</span>
            <button
              type="button"
              class="text-[var(--pw-accent)] hover:underline"
              onClick={() => {
                clearErrorLog();
                setLogEntries([]);
                setShowLog(false);
              }}
            >
              Clear
            </button>
          </div>
          {logEntries.map((e, i) => (
            <div key={`${e.timestamp}-${i}`} class="mb-2 border-b border-white/10 pb-1">
              <div class={e.isFatal ? 'text-red-400' : 'text-amber-400'}>
                [{e.system}] {e.message}
              </div>
              {e.stack && (
                <pre class="text-gray-500 whitespace-pre-wrap mt-1">
                  {e.stack.split('\n').slice(0, 3).join('\n')}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
