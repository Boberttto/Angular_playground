import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, mergeMap, of, throwError, timer } from 'rxjs';
import { SIMULATED_LATENCY_MS } from './http-context';
import { HttpLog } from './http-log';
import { NewUser, User } from './user';

let flakyAttempts = 0;
let nextUserId = 100;

/**
 * Fake backend for the `/api/*` URLs (a static dev server can't answer POST or simulate failures).
 * An interceptor does NOT have to call next(): it can build a synthetic HttpResponse.
 * Docs: https://angular.dev/guide/http/interceptors#synthetic-responses
 *
 * Registered at ROUTE level (see http.routes.ts) with withRequestsMadeViaParent(): every other
 * request continues to the root HttpClient (and its loggingInterceptor).
 */
export const fakeBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  const log = inject(HttpLog).log;
  const latency = req.context.get(SIMULATED_LATENCY_MS);
  const reply = <T>(status: number, body: T): Observable<HttpResponse<T>> => {
    log.addDeferred(`🧪 fake backend: ${req.method} ${req.urlWithParams} → ${status}`, 'success');
    return timer(latency).pipe(mergeMap(() => of(new HttpResponse({ status, body, url: req.url }))));
  };
  const fail = (status: number, statusText: string): Observable<never> => {
    log.addDeferred(`🧪 fake backend: ${req.method} ${req.urlWithParams} → ${status}`, 'error');
    return timer(latency).pipe(
      mergeMap(() =>
        throwError(
          () => new HttpErrorResponse({ status, statusText, url: req.url, error: { message: `${statusText} (simulated)` } }),
        ),
      ),
    );
  };

  if (req.method === 'POST' && req.url === '/api/users') {
    const body = req.body as NewUser;
    const created: User = { id: nextUserId++, name: body.name, email: body.email, role: 'viewer' };
    return reply(201, created);
  }
  if (req.method === 'GET' && req.url === '/api/flaky') {
    // Fails twice, succeeds on the 3rd attempt, then starts over.
    flakyAttempts++;
    if (flakyAttempts < 3) return fail(503, 'Service Unavailable');
    flakyAttempts = 0;
    return reply(200, { message: 'Succeeded on attempt #3' });
  }
  if (req.method === 'GET' && req.url === '/api/error') {
    return fail(500, 'Internal Server Error');
  }
  return fail(404, 'Not Found');
};
