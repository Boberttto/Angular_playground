import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap } from 'rxjs';
import { SKIP_LOGGING } from './http-context';
import { HttpLog } from './http-log';

/**
 * Functional interceptor registered in app.config.ts:
 *   provideHttpClient(withInterceptors([loggingInterceptor]))
 * Logs method, URL, status and duration of every request to an on-screen log.
 * Docs: https://angular.dev/guide/http/interceptors
 */
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  // Interceptors run in the injection context of the injector that registered them → inject() works.
  // Docs: https://angular.dev/guide/http/interceptors#dependency-injection-in-interceptors
  const log = inject(HttpLog).log;

  // HttpContext: per-request opt-out (e.g. http.get(url, { context: new HttpContext().set(SKIP_LOGGING, true) })).
  if (req.context.get(SKIP_LOGGING)) {
    return next(req);
  }

  const started = performance.now();
  const elapsed = () => `${Math.round(performance.now() - started)} ms`;
  // Deferred: requests may be sent while Angular is rendering (e.g. httpResource), avoid writing signals mid-render.
  log.addDeferred(`→ ${req.method} ${req.urlWithParams}`);
  let settled = false;

  return next(req).pipe(
    tap({
      next: (event) => {
        // The stream carries ALL HttpEvents (Sent, progress…); the final one is the Response.
        if (event.type === HttpEventType.Response) {
          settled = true;
          log.addDeferred(`← ${event.status} ${req.method} ${req.urlWithParams} (${elapsed()})`, 'success');
        }
      },
      error: (err: unknown) => {
        settled = true;
        const status = err instanceof HttpErrorResponse ? err.status : '???';
        log.addDeferred(`✖ ${status} ${req.method} ${req.urlWithParams} (${elapsed()})`, 'error');
      },
    }),
    // finalize also runs on unsubscribe → we can see cancelled requests (switchMap, resource param change…).
    finalize(() => {
      if (!settled) log.addDeferred(`⊘ cancelled ${req.method} ${req.urlWithParams} (${elapsed()})`, 'warning');
    }),
  );
};
