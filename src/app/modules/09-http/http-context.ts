import { HttpContextToken } from '@angular/common/http';

/**
 * HttpContextToken = typed per-request metadata for interceptors (never sent to the server).
 * The factory gives the default value for requests that don't set it.
 * Docs: https://angular.dev/guide/http/interceptors#request-and-response-metadata
 */
export const SKIP_LOGGING = new HttpContextToken<boolean>(() => false);

/** Latency (ms) applied by the fake backend; a request can override it through its context. */
export const SIMULATED_LATENCY_MS = new HttpContextToken<number>(() => 600);
