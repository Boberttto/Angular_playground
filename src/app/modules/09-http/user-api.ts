import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, retry, throwError, timer } from 'rxjs';
import { SKIP_LOGGING } from './http-context';
import { NewUser, User, UserDetails } from './user';

/**
 * Data-access service: components never build URLs or handle raw HTTP themselves.
 * HttpClient is injectable by default since v21 (provideHttpClient() is only needed to configure features).
 * Docs: https://angular.dev/guide/http/making-requests#best-practices
 */
@Service()
export class UserApi {
  private readonly http = inject(HttpClient);

  /** Typed GET. `<User[]>` is a type ASSERTION: HttpClient does not validate the JSON. */
  // Docs: https://angular.dev/guide/http/making-requests#fetching-json-data
  getUsers(options: { skipLogging?: boolean } = {}): Observable<User[]> {
    return this.http.get<User[]>('/mock/users.json', {
      context: new HttpContext().set(SKIP_LOGGING, options.skipLogging ?? false),
    });
  }

  getUser(id: number): Observable<UserDetails> {
    return this.http.get<UserDetails>(`/mock/users/${id}.json`);
  }

  /** POST: answered by the fake backend interceptor (a static file server can't handle POST). */
  // Docs: https://angular.dev/guide/http/making-requests#mutating-server-state
  createUser(user: NewUser): Observable<User> {
    return this.http.post<User>('/api/users', user);
  }

  /** Fails twice (503) then succeeds: retry with a delay recovers. */
  // Docs: https://angular.dev/guide/http/making-requests#handling-request-failure
  getFlaky(): Observable<{ message: string }> {
    return this.http.get<{ message: string }>('/api/flaky').pipe(
      // RxJS 7 config form: max 2 RE-tries (3 attempts total), waiting 300 ms between them.
      retry({ count: 2, delay: () => timer(300) }),
    );
  }

  /** Always 500: map the HttpErrorResponse to a user-friendly Error. */
  getBroken(): Observable<never> {
    return this.http.get<never>('/api/error').pipe(catchError((err: HttpErrorResponse) => throwError(() => toUserError(err))));
  }

  /** A URL that doesn't exist on the dev server. */
  getMissing(): Observable<unknown> {
    return this.http.get('/mock/does-not-exist.json').pipe(catchError((err: HttpErrorResponse) => throwError(() => toUserError(err))));
  }
}

/** status 0 = network error/timeout/CORS (no response); otherwise the backend answered with an error code. */
export function toUserError(err: HttpErrorResponse): Error {
  if (err.status === 0) {
    return new Error(`Network error: ${err.message}`);
  }
  return new Error(`Server returned ${err.status} ${err.statusText}`);
}
