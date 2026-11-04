# 09 · HTTP & resources — Solutions

All code below was compiled and run (TestBed / `HttpTestingController`) with Angular 22 before being written
here. Paths assume `src/app/sandbox/`.

---

## Solution 1 ⭐ — Typed GET from a service

```ts
// src/app/sandbox/product-list.ts
import { HttpClient } from '@angular/common/http';
import { Component, Service, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
}

@Service()
export class ProductApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Product[]> {
    return this.http.get<Product[]>('/mock/products.json');
  }
}

@Component({
  selector: 'app-product-list',
  template: `
    <ul>
      @for (p of products(); track p.id) {
        <li>{{ p.name }} — {{ p.price }} $</li>
      } @empty {
        <li>Loading…</li>
      }
    </ul>
  `,
})
export class ProductList {
  protected readonly products = toSignal(inject(ProductApi).list(), { initialValue: [] });
}
```

**Why:** `HttpClient` is injectable without setup since v21 ([docs](https://angular.dev/guide/http/setup)).
The service hides URLs and types ([docs](https://angular.dev/guide/http/making-requests#best-practices)).
`toSignal` subscribes **once** (one request — HttpClient Observables are cold), keeps the result in a signal
(OnPush/zoneless friendly) and unsubscribes on destroy
([docs](https://angular.dev/ecosystem/rxjs-interop#create-a-signal-from-an-rxjs-observable-with-tosignal)).
Remember `<Product[]>` is only a type assertion: nothing validates the JSON.

---

## Solution 2 ⭐⭐ — Global loading indicator & error interceptor

```ts
// src/app/sandbox/http-interceptors.ts
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { catchError, finalize, throwError } from 'rxjs';

/** Opt-out for background requests (polling) that shouldn't show the spinner. */
export const SILENT = new HttpContextToken<boolean>(() => false);

@Service()
export class LoadingState {
  private readonly pending = signal(0);
  readonly isLoading = computed(() => this.pending() > 0);
  readonly lastError = signal<string | null>(null);

  start(): void {
    this.pending.update((n) => n + 1);
  }

  stop(): void {
    this.pending.update((n) => n - 1);
  }
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SILENT)) return next(req);
  const state = inject(LoadingState);
  state.start();
  // finalize: runs on success, error AND cancellation → the counter can't get stuck.
  return next(req).pipe(finalize(() => state.stop()));
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const state = inject(LoadingState);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        state.lastError.set(err.status === 0 ? 'Network error' : `${err.status} on ${req.url}`);
      }
      return throwError(() => err); // still let the caller handle it
    }),
  );
};
```

Registration for a sandbox route:

```ts
{
  path: 'sandbox',
  loadComponent: () => import('./sandbox/sandbox'),
  providers: [
    provideHttpClient(withInterceptors([loadingInterceptor, errorInterceptor]), withRequestsMadeViaParent()),
  ],
}
```

**Why:**
- `finalize` covers success, error **and cancellation** (e.g. `switchMap`, a resource whose params changed);
  decrementing in `tap({ next, error })` would leave the counter stuck after a cancellation.
- Interceptors run in an injection context → `inject(LoadingState)`
  ([docs](https://angular.dev/guide/http/interceptors#dependency-injection-in-interceptors)).
- `HttpContextToken` with a default factory = typed opt-out flag
  ([docs](https://angular.dev/guide/http/interceptors#request-and-response-metadata)).
- The error interceptor **rethrows** so that callers' `catchError` still runs; it only adds a side effect.
- `withRequestsMadeViaParent()` keeps the root interceptors in the chain
  ([docs](https://angular.dev/guide/http/setup#withrequestsmadeviaparent)).

---

## Solution 3 ⭐⭐ — A reactive user viewer with `httpResource`

```ts
// src/app/sandbox/user-viewer.ts
import { httpResource } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';

interface UserDetails {
  readonly id: number;
  readonly name: string;
  readonly bio: string;
}

@Component({
  selector: 'app-user-viewer',
  template: `
    @for (id of [1, 2, 3, 42]; track id) {
      <button type="button" (click)="userId.set(id)">{{ id }}</button>
    }
    <button type="button" (click)="user.reload()">Reload</button>
    @switch (user.status()) {
      @case ('loading') { <p>Loading…</p> }
      @case ('error') { <p class="error">Could not load user {{ userId() }} ({{ user.statusCode() }})</p> }
      @default {
        @if (user.hasValue()) {
          <p>{{ title() }} — {{ user.value().bio }}</p>
        }
      }
    }
  `,
})
export class UserViewer {
  readonly userId = signal(1);
  readonly user = httpResource<UserDetails>(() => `/mock/users/${this.userId()}.json`);
  protected readonly title = computed(() => (this.user.hasValue() ? this.user.value().name.toUpperCase() : ''));
}
```

**Why:** the URL function reads `userId()`, so changing the id issues a new request and cancels a pending
one ([docs](https://angular.dev/guide/http/http-resource#using-httpresource)). `status()` drives the UI.
`value()` **throws in `'error'` state** ([docs](https://angular.dev/guide/signals/resource#resource-status)), so
both the template and the `computed` guard with `hasValue()` (which also narrows away `undefined`).
`statusCode()` is an `HttpResourceRef` extra. User 42 → the dev server answers 404 → status `'error'`.

---

## Solution 4 ⭐⭐⭐ — Smart retry + test it

```ts
// src/app/sandbox/quote-api.ts
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, of, retry, throwError, timer } from 'rxjs';

export interface Quote {
  readonly text: string;
}

@Service()
export class QuoteApi {
  private readonly http = inject(HttpClient);

  /** Retries only transient errors (network/5xx) with exponential backoff, then falls back. */
  random(): Observable<Quote> {
    return this.http.get<Quote>('/api/quote').pipe(
      retry({
        count: 3,
        delay: (err: unknown, retryCount: number) => {
          const transient = err instanceof HttpErrorResponse && (err.status === 0 || err.status >= 500);
          // Throwing from `delay` stops retrying and propagates the error.
          return transient ? timer(2 ** (retryCount - 1) * 200) : throwError(() => err);
        },
      }),
      catchError(() => of({ text: 'Keep calm and retry later.' })),
    );
  }
}
```

```ts
// src/app/sandbox/quote-api.spec.ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { QuoteApi } from './quote-api';

describe('QuoteApi', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('retries 5xx with backoff then succeeds', async () => {
    const p = firstValueFrom(TestBed.inject(QuoteApi).random());
    http.expectOne('/api/quote').flush(null, { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(200); // 1st backoff
    http.expectOne('/api/quote').flush(null, { status: 500, statusText: 'Error' });
    await vi.advanceTimersByTimeAsync(400); // 2nd backoff
    http.expectOne('/api/quote').flush({ text: 'Hi' });
    expect(await p).toEqual({ text: 'Hi' });
  });

  it('does not retry a 404 and falls back', async () => {
    const p = firstValueFrom(TestBed.inject(QuoteApi).random());
    http.expectOne('/api/quote').flush(null, { status: 404, statusText: 'Not Found' });
    expect(await p).toEqual({ text: 'Keep calm and retry later.' });
    // verify() in afterEach proves no 2nd request was sent.
  });
});
```

**Why:**
- `retry`'s `delay` callback gets `(error, retryCount)`; returning a timer retries after it emits, throwing
  stops retrying ([rxjs.dev](https://rxjs.dev/api/operators/retry)). 4xx are client errors — retrying won't
  help.
- Each retry **re-subscribes** → a brand-new request, which is why the test calls `expectOne()` once per attempt.
- `catchError` after `retry` provides the final fallback.
- Fake timers make backoff deterministic; `verify()` proves no unexpected extra request
  ([docs](https://angular.dev/guide/http/testing)).

---

## Solution 5 ⭐⭐⭐ — Migrate a legacy HTTP setup

**Step 1 — standalone, class interceptor unchanged:**

```ts
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptorsFromDi(), withXhr()), // exact HttpClientModule equivalent
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
  ],
});
```

**Step 2 — functional interceptor:**

```ts
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${auth.token}` } }));
};

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([tokenInterceptor]))],
});
```

**Backend:** `HttpClientModule` used the XHR backend; the setup guide's equivalence table maps it to
`provideHttpClient(withInterceptorsFromDi(), withXhr())`
([docs](https://angular.dev/guide/http/setup#httpclientmodule-based-configuration)). In v22, `provideHttpClient()`
uses **fetch** by default (`withFetch()` is deprecated) — keep `withXhr()` only if you need upload progress
events ([docs](https://angular.dev/guide/http/setup#withxhr)). `HttpClientModule` itself is deprecated
([API](https://angular.dev/api/common/http/HttpClientModule)). Also: `any` → `unknown`, constructor injection
→ `inject()`, `next.handle(req)` → `next(req)`.

---

## Solution 6 🎤 — Talking points

1. **`getUsers().subscribe()` in this project:** `subscribe` triggers the cold Observable → the request goes
   through the **route-level** `HttpClient` (configured in `http.routes.ts`): `fakeBackendInterceptor` sees
   it's not `/api/*` and calls `next(req)` → `withRequestsMadeViaParent()` forwards to the **root**
   `HttpClient` → `loggingInterceptor` logs `→`, calls `next` → fetch backend → the response flows back as
   `HttpEvent`s (`Sent`, then `Response`) through the interceptors in reverse (`←` logged) → the body is
   delivered to `subscribe`, then the Observable completes
   ([docs](https://angular.dev/guide/http/interceptors), [docs](https://angular.dev/guide/http/setup#withrequestsmadeviaparent)).
2. **Out-of-order results:** concurrent requests (`mergeMap`, or nested subscriptions) resolve in any order.
   RxJS: `debounceTime` + `distinctUntilChanged` + **`switchMap`** (cancels the previous request).
   Signals: ``httpResource(() => `/api/search?q=${term()}`)`` — a pending request is cancelled when the
   URL changes ([docs](https://angular.dev/guide/http/http-resource#using-httpresource)).
3. **POST with `httpResource`:** it's eager and reactive — it fires when created and **again whenever its
   signals change**, and cancels in-flight requests on change; that's dangerous for writes. The docs say to
   use `HttpClient` for mutations ([docs](https://angular.dev/guide/http/http-resource#using-httpresource)).
4. **Dashboard dies after a 500:** `catchError` is on the **outer** stream: on the first error it replaces
   the whole `timer` stream with `of(null)`, which completes → polling stops. Move it inside:
   `switchMap(() => http.get(url).pipe(catchError(() => of(null))))`
   ([rxjs.dev](https://rxjs.dev/api/operators/catchError)).
