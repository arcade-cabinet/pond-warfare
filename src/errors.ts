/**
 * Error Handling — assert + throw, NEVER swallow + continue.
 *
 * GameError carries structured context: which system failed, what entity
 * was involved, and a snapshot of relevant state. The ErrorOverlay and
 * ErrorBoundary both consume this.
 *
 * Pattern from: ~/src/arcade-cabinet/syntheteria/src/errors.ts
 */

export class GameError extends Error {
  readonly system: string;
  readonly entityId?: number;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    system: string,
    options?: {
      entityId?: number;
      context?: Record<string, unknown>;
      cause?: unknown;
    },
  ) {
    super(`[${system}] ${message}`, { cause: options?.cause });
    this.name = 'GameError';
    this.system = system;
    this.entityId = options?.entityId;
    this.context = options?.context;
  }
}

/**
 * Assert a condition is truthy. Throws GameError with context on failure.
 * Use this INSTEAD of silent `if (!x) return` for required data.
 */
export function gameAssert(
  condition: unknown,
  message: string,
  system: string,
  context?: Record<string, unknown>,
): asserts condition {
  if (!condition) {
    throw new GameError(message, system, { context });
  }
}

// --- Error log ring buffer (last N errors for debug overlay) ---

export interface ErrorLogEntry {
  timestamp: number;
  message: string;
  system: string;
  entityId?: number;
  stack?: string;
  isFatal: boolean;
}

const MAX_LOG_ENTRIES = 50;
const errorLog: ErrorLogEntry[] = [];
const errorListeners = new Set<() => void>();
let fatalError: Error | null = null;
const fatalListeners = new Set<() => void>();

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

/** Log an error to the ring buffer and notify subscribers. */
export function logError(error: unknown): void {
  const entry: ErrorLogEntry = {
    timestamp: Date.now(),
    message: 'Unknown error',
    system: 'unknown',
    isFatal: false,
  };

  if (error instanceof GameError) {
    entry.message = error.message;
    entry.system = error.system;
    entry.entityId = error.entityId;
    entry.stack = error.stack;
  } else if (error instanceof Error) {
    entry.message = error.message;
    entry.stack = error.stack;
  } else {
    entry.message = String(error);
  }

  errorLog.push(entry);
  if (errorLog.length > MAX_LOG_ENTRIES) {
    errorLog.shift();
  }

  // biome-ignore lint/suspicious/noConsole: errors MUST always reach the console
  console.error(`[GameError] ${entry.message}`, error);

  for (const listener of errorListeners) {
    listener();
  }
}

/** Report a fatal error that blocks gameplay. Shows blocking modal. */
export function reportFatalError(error: unknown): void {
  logError(error);
  fatalError = normalizeError(error);
  // Mark the last entry as fatal
  if (errorLog.length > 0) {
    errorLog[errorLog.length - 1].isFatal = true;
  }
  for (const listener of fatalListeners) {
    listener();
  }
}

/** Get the error log (read-only). */
export function getErrorLog(): readonly ErrorLogEntry[] {
  return errorLog;
}

/** Subscribe to error log changes. Returns unsubscribe function. */
export function subscribeErrors(listener: () => void): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

/** Clear the error log. */
export function clearErrorLog(): void {
  errorLog.length = 0;
  for (const listener of errorListeners) {
    listener();
  }
}

/** Get the current fatal error, if any. */
export function getFatalError(): Error | null {
  return fatalError;
}

/** Subscribe to fatal error changes. Returns unsubscribe function. */
export function subscribeFatalError(listener: () => void): () => void {
  fatalListeners.add(listener);
  return () => fatalListeners.delete(listener);
}

/** Clear the fatal error (e.g., after user dismisses the modal). */
export function clearFatalError(): void {
  fatalError = null;
  for (const listener of fatalListeners) {
    listener();
  }
}

// --- Global error handlers ---

/** Install global error handlers that route to the error log. */
export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    logError(event.error ?? new Error(event.message));
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason ?? new Error('Unhandled promise rejection'));
  });
}
