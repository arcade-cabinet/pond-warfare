declare const __APP_VERSION__: string | undefined;
declare const __BUILD_COMMIT__: string | undefined;

export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : '0.0.0-dev';
export const BUILD_COMMIT =
  typeof __BUILD_COMMIT__ !== 'undefined' && __BUILD_COMMIT__ ? __BUILD_COMMIT__ : 'dev';

export const APP_VERSION_LABEL = `v${APP_VERSION}`;
export const BUILD_STAMP_LABEL = `${APP_VERSION_LABEL} · ${BUILD_COMMIT}`;
