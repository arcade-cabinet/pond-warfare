// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearErrorLog,
  clearFatalError,
  getErrorLog,
  getFatalError,
  installGlobalErrorHandlers,
} from '@/errors';

describe('global error handlers', () => {
  beforeEach(() => {
    clearErrorLog();
    clearFatalError();
  });

  it('installs handlers only once and promotes uncaught window errors to fatal errors', () => {
    installGlobalErrorHandlers();
    installGlobalErrorHandlers();

    const error = new Error('boom');
    const event = new ErrorEvent('error', {
      message: error.message,
      error,
      cancelable: true,
    });

    expect(window.dispatchEvent(event)).toBe(false);

    const log = getErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0].system).toBe('window/error');
    expect(log[0].isFatal).toBe(true);
    expect(log[0].message).toBe('[window/error] boom');
    expect(getFatalError()?.message).toBe('[window/error] boom');
  });

  it('promotes unhandled promise rejections to fatal errors', () => {
    installGlobalErrorHandlers();

    const event = new Event('unhandledrejection', { cancelable: true });
    Object.defineProperty(event, 'reason', {
      value: 'db exploded',
      configurable: true,
    });

    expect(window.dispatchEvent(event)).toBe(false);

    const log = getErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0].system).toBe('window/unhandledrejection');
    expect(log[0].isFatal).toBe(true);
    expect(log[0].message).toBe('[window/unhandledrejection] db exploded');
    expect(getFatalError()?.message).toBe('[window/unhandledrejection] db exploded');
  });
});
