# 09 · HTTP & resources

`HttpClient` is Angular's Observable-based HTTP API; it brings typed responses, interceptors (middleware),
testing utilities and XSRF protection. Since v19–22 Angular adds **signal-based** async primitives:
`resource()`, `rxResource()` and `httpResource()` — all stable (`@publicApi 22.0`) in the installed version.

Live demos: [`src/app/modules/09-http/`](../../src/app/modules/09-http/) (route `/http`). Every request made by
the page is logged on screen by a real functional interceptor.

## Table of contents

1. [Setup: `provideHttpClient` and its features](#1-setup-providehttpclient-and-its-features)
2. [Making requests: typed GET, POST](#2-making-requests-typed-get-post)
3. [HttpClient Observables: cold, cancellable, completing](#3-httpclient-observables)
4. [Error handling: `HttpErrorResponse`, `catchError`, `retry`, `timeout`](#4-error-handling)
5. [Functional interceptors](#5-functional-interceptors)
6. [`HttpContext` tokens](#6-httpcontext-tokens)
7. [Route-level HttpClient configuration (`withRequestsMadeViaParent`)](#7-route-level-httpclient-configuration)
8. [`resource()`](#8-resource)
9. [`httpResource()`](#9-httpresource)
10. [`rxResource()` and choosing between the three](#10-rxresource-and-choosing)
11. [Testing HTTP](#11-testing-http)
12. [Legacy: `HttpClientModule`, class interceptors, `HTTP_INTERCEPTORS`](#12-legacy-apis-interviews-still-ask)
13. [🎯 Likely interview questions](#-likely-interview-questions)
14. [📚 References](#-references)

---

## 1. Setup: `provideHttpClient` and its features

**Since v21, `HttpClient` is injectable by default** — no setup needed to just make requests
([docs](https://angular.dev/guide/http/setup)). You call `provideHttpClient(...features)` in
`ApplicationConfig.providers` only to **configure** it:

```ts
// src/app/app.config.ts (this project)
providers: [provideHttpClient(withInterceptors([loggingInterceptor]))]
```

| Feature | Purpose |
| --- | --- |
| `withInterceptors([...fns])` | functional interceptors (recommended) ([docs](https://angular.dev/guide/http/setup#withinterceptors)) |
| `withInterceptorsFromDi()` | include legacy class interceptors registered with `HTTP_INTERCEPTORS` ([docs](https://angular.dev/guide/http/setup#withinterceptorsfromdi)) |
| `withXhr()` | use `XMLHttpRequest` instead of the default **fetch** backend (e.g. for upload progress) ([docs](https://angular.dev/guide/http/setup#withxhr)) |
| `withRequestsMadeViaParent()` | child config forwards to the parent `HttpClient` (see §7) |
| `withXsrfConfiguration()` / `withNoXsrfProtection()` | XSRF cookie/header names, or disable it |
| `withJsonpSupport()` | **deprecated** in 22.1 (XSS risk) ([docs](https://angular.dev/guide/http/setup#withjsonpsupport)) |

> ⚠️ **Pitfall (v22 change):** `withFetch()` is **deprecated** — fetch is now the **default** backend
> ([API](https://angular.dev/api/common/http/withFetch)); `withXhr()` opts back into XHR. The v22 changelog
> says `withFetch` "can be safely removed" ([CHANGELOG](https://github.com/angular/angular/blob/main/CHANGELOG.md)).
> Older tutorials (v17–v21) recommend adding `withFetch()`; don't repeat that in an interview about v22.

> ⚠️ **Pitfall:** the fetch backend doesn't produce **upload** progress events
> ([docs](https://angular.dev/guide/http/setup#withxhr)); use `withXhr()` if you need them.

## 2. Making requests: typed GET, POST

Put HTTP in an injectable service; components consume it
([docs](https://angular.dev/guide/http/making-requests#best-practices)):

```ts
@Service()
export class UserApi {
  private readonly http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/mock/users.json');
  }

  createUser(user: NewUser): Observable<User> {
    return this.http.post<User>('/api/users', user); // body serialized as JSON
  }
}
```

- `get<T>()` — **`T` is a type assertion**: "HttpClient does not verify that the actual return data matches
  this type" ([docs](https://angular.dev/guide/http/making-requests#fetching-json-data)). Validate at runtime
  if the backend isn't trusted (`httpResource`'s `parse` option, §9).
- Other response types: `responseType: 'text' | 'blob' | 'arraybuffer'`; full response with
  `observe: 'response'`; events with `observe: 'events'`
  ([docs](https://angular.dev/guide/http/making-requests#fetching-other-types-of-data)).
- Mutations: `post`, `put`, `patch`, `delete` ([docs](https://angular.dev/guide/http/making-requests#mutating-server-state)).
- Query params: `{ params: { q, page: 2 } }` or `HttpParams` (immutable); headers: `{ headers: {...} }` or
  `HttpHeaders` (immutable) ([docs](https://angular.dev/guide/http/making-requests#setting-url-parameters)).

**How the POST is simulated here.** The dev server only serves static files from `public/` — a POST cannot
create anything (checked on this project: `POST /mock/users.json` just returns `200` with the file, and an
unknown `/api/...` URL gets the SPA's `index.html`). So
[`fake-backend.interceptor.ts`](../../src/app/modules/09-http/fake-backend.interceptor.ts) answers `/api/*`
itself with a synthetic `HttpResponse` (status 201 + created user) after a delay — interceptors are allowed
to not call `next()` ([docs](https://angular.dev/guide/http/interceptors#synthetic-responses)). This is a
common technique for prototypes; in real projects you'd use a mock server.

Demo: [`typed-requests.ts`](../../src/app/modules/09-http/typed-requests/typed-requests.ts),
[`user-api.ts`](../../src/app/modules/09-http/user-api.ts), data in [`public/mock/`](../../public/mock/).

## 3. HttpClient Observables

From the docs ([docs](https://angular.dev/guide/http/making-requests#http-observables)):

- They're **cold**: no request until `subscribe()`; each subscription sends a new request.
- **Unsubscribing aborts** the in-flight request (useful with `switchMap`, the `async` pipe, route changes).
- They usually **complete** after the response, so forgetting to unsubscribe rarely leaks — but the callback
  can still run after the component is destroyed; clean up anyway (async pipe, `toSignal`,
  `takeUntilDestroyed`).

> ⚠️ **Pitfall:** "My request isn't sent!" → you never subscribed. "It's sent twice!" → you subscribed twice
> (two `| async`, or `subscribe` + `async`).

## 4. Error handling

A request fails in three ways: network error, timeout (`timeout` option), or an error status from the
backend. All arrive on the **error channel** as an `HttpErrorResponse`: network and timeout errors have
**`status === 0`**; backend errors carry the HTTP status and the response body in `error`
([docs](https://angular.dev/guide/http/making-requests#handling-request-failure),
[API](https://angular.dev/api/common/http/HttpErrorResponse)).

```ts
getFlaky() {
  return this.http.get<Msg>('/api/flaky').pipe(
    retry({ count: 2, delay: () => timer(300) }), // re-subscribe = re-send, up to 2 times
  );
}
getBroken() {
  return this.http.get('/api/error').pipe(
    catchError((err: HttpErrorResponse) =>
      throwError(() => new Error(err.status === 0 ? 'Network error' : `Server returned ${err.status}`)),
    ),
  );
}
```

- `retry` re-subscribes → because the Observable is cold, the request **and the interceptor chain** run
  again (watch the HTTP log: 503, 503, 200).
- `catchError` either recovers (`of(fallback)`) or rethrows a domain error.
- `timeout: 3000` in the options aborts slow requests; it only covers the backend call, not interceptor
  delays ([docs](https://angular.dev/guide/http/making-requests#timeouts)).

Observed on this dev server: `GET /mock/does-not-exist.json` → `404` (HTML body) → `HttpErrorResponse` with
`status 404`.

Demo: [`error-handling.ts`](../../src/app/modules/09-http/error-handling/error-handling.ts).

> ⚠️ **Pitfall:** retrying non-idempotent requests (POST) can create duplicates. Retry GETs; for POST use an
> idempotency key or don't retry.

> 💡 **Interview tip:** global error handling (toast, redirect to `/login` on 401) belongs in an
> **interceptor**; per-call fallbacks belong in `catchError` in the service/component.

## 5. Functional interceptors

An interceptor is a function `(req, next) => Observable<HttpEvent<unknown>>` (`HttpInterceptorFn`). Multiple
interceptors form a chain in the order listed in `withInterceptors([...])`
([docs](https://angular.dev/guide/http/interceptors#configuring-interceptors)).

This project's real interceptor ([`logging.interceptor.ts`](../../src/app/modules/09-http/logging.interceptor.ts)):

```ts
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const log = inject(HttpLog).log;               // ✅ interceptors run in an injection context
  if (req.context.get(SKIP_LOGGING)) return next(req);
  const started = performance.now();
  log.addDeferred(`→ ${req.method} ${req.urlWithParams}`);
  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) { /* ← status + duration */ }
      },
      error: (err: unknown) => { /* ✖ status + duration */ },
    }),
    finalize(() => { /* not settled → ⊘ cancelled */ }),
  );
};
```

Key facts:

- **DI**: interceptors run in the injection context of the injector that registered them → `inject()` works
  ([docs](https://angular.dev/guide/http/interceptors#dependency-injection-in-interceptors)).
- **Response stream**: `next(req)` emits **all** `HttpEvent`s (`Sent`, progress…); check
  `event.type === HttpEventType.Response` for the final response
  ([docs](https://angular.dev/guide/http/interceptors#intercepting-response-events)).
- **Immutability**: `HttpRequest`/`HttpResponse` are immutable → `req.clone({...})`. The body is *not* deeply
  protected ([docs](https://angular.dev/guide/http/interceptors#modifying-requests)).
- **Short-circuit**: an interceptor may return a response without calling `next` (cache, fake backend)
  ([docs](https://angular.dev/guide/http/interceptors#synthetic-responses)).
- `finalize` also runs on **unsubscribe** — that's how the log shows `⊘ cancelled` when a resource's params
  change mid-request.

### Example: auth header interceptor (docs-only example)

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token(); // e.g. a signal
  // Only attach the token to OUR API, never to third-party URLs.
  if (!token || !req.url.startsWith('/api/')) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

// app.config.ts — order matters: auth runs before logging here
provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor]));
```

The docs' version uses `req.headers.append('X-Authentication-Token', token)`
([docs](https://angular.dev/guide/http/interceptors#dependency-injection-in-interceptors)); `setHeaders` is a
`clone()` shortcut ([API](https://angular.dev/api/common/http/HttpRequest)).

A 401 handler typically adds `catchError` on `next(req)`: if `err.status === 401`, redirect to login (or
refresh the token and retry once with `switchMap`).

> ⚠️ **Pitfall:** injecting `HttpClient` inside an interceptor and making requests through it re-enters the
> same interceptor chain (possible infinite loop). Use an `HttpContext` flag to skip, or a separate
> `HttpBackend`-based client.
> ⚠️ Not confirmed by official docs / opinion: common community advice; the guide doesn't cover it.

## 6. HttpContext tokens

Per-request **metadata for interceptors**, never sent to the server
([docs](https://angular.dev/guide/http/interceptors#request-and-response-metadata)):

```ts
export const SKIP_LOGGING = new HttpContextToken<boolean>(() => false); // factory = default value

http.get('/mock/users.json', { context: new HttpContext().set(SKIP_LOGGING, true) });
// in the interceptor:
if (req.context.get(SKIP_LOGGING)) return next(req);
```

Unlike the request, the `HttpContext` is **mutable** and survives retries — useful for counting attempts
([docs](https://angular.dev/guide/http/interceptors#the-request-context-is-mutable)). Demo: the second GET
button (*"with HttpContext SKIP_LOGGING"*) doesn't appear in the log; `SIMULATED_LATENCY_MS` configures the
fake backend per request ([`http-context.ts`](../../src/app/modules/09-http/http-context.ts)).

## 7. Route-level HttpClient configuration

`provideHttpClient()` in a **child injector** (e.g. a lazy route's `providers`) **overrides** the parent
configuration. Add `withRequestsMadeViaParent()` to instead forward requests (after the local interceptors)
to the parent's `HttpClient`, so they also go through the root interceptors
([docs](https://angular.dev/guide/http/setup#withrequestsmadeviaparent)).

This module uses it ([`http.routes.ts`](../../src/app/modules/09-http/http.routes.ts)):

```ts
{
  path: '',
  loadComponent: () => import('./http-page'),
  providers: [provideHttpClient(withInterceptors([fakeBackendInterceptor]), withRequestsMadeViaParent())],
}
```

Chain for a request from this page: `fakeBackendInterceptor` (route) → *if not `/api/*`* → root
`loggingInterceptor` → fetch backend. `/api/*` requests are answered by the fake backend and never reach the
root chain — that's why they're logged with 🧪 instead of →/←.

## 8. `resource()`

A `Resource` brings **async data into signal-based code** ([docs](https://angular.dev/guide/signals/resource)):

```ts
userResource = resource({
  params: () => this.userId(),               // reactive; undefined → status 'idle', loader not called
  loader: async ({ params: id, abortSignal }) => {
    const res = await fetch(`/mock/users/${id}.json`, { signal: abortSignal });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return (await res.json()) as UserDetails;
  },
});
```

- The loader receives `{ params, abortSignal, previous }` ([docs](https://angular.dev/guide/signals/resource#resource-loaders)).
  (`params` was called `request` in early experimental versions; v22 uses `params`.)
- If `params` changes while loading, the resource **aborts** the outstanding load; pass `abortSignal` to
  `fetch` to really cancel it ([docs](https://angular.dev/guide/signals/resource#aborting-requests)).
- Signals: `value`, `status`, `error`, `isLoading`, `hasValue()`, `snapshot`; methods `reload()`, `set()`,
  `update()` (→ status `'local'`), `destroy()` (checked in `@angular/core` typings).
- Statuses: `'idle' | 'loading' | 'reloading' | 'resolved' | 'error' | 'local'`; **reading `value()` in
  `'error'` throws** → guard with `hasValue()` ([docs](https://angular.dev/guide/signals/resource#resource-status)).
- `defaultValue` replaces `undefined` while idle/loading; `params: ({ chain }) => chain(other)` chains
  resources ([docs](https://angular.dev/guide/signals/resource#chaining-resources)).

> ⚠️ **Pitfall:** a `resource()` using native `fetch` **bypasses HttpClient** — no interceptors (auth headers,
> logging), no `HttpTestingController`. In the demo, the `resource() + fetch` card produces no →/← lines.
> Prefer `httpResource` or `rxResource` + `HttpClient` in Angular apps.

## 9. `httpResource()`

"A reactive wrapper around `HttpClient` that gives you the request status and response as signals", and it
supports interceptors ([docs](https://angular.dev/guide/http/http-resource)):

```ts
user = httpResource<UserDetails>(() => {
  const id = this.userId();
  return id === undefined ? undefined : `/mock/users/${id}.json`; // undefined → no request ('idle')
});
// or a request object: httpResource(() => ({ url, method, params, headers, context, ... }))
```

- **Eager**: the request starts when the resource is created/params change, unlike `HttpClient` which waits
  for `subscribe()`; a pending request is **cancelled** when the reactive URL changes
  ([docs](https://angular.dev/guide/http/http-resource#using-httpresource)).
- Extra signals on `HttpResourceRef`: `headers`, `statusCode`, `progress` (with `reportProgress: true`)
  (checked in `@angular/common/http` typings).
- Variants: `httpResource.text()`, `.blob()`, `.arrayBuffer()`
  ([docs](https://angular.dev/guide/http/http-resource#response-types)).
- `parse` option to **validate** the response at runtime (e.g. Zod), which also types `value`
  ([docs](https://angular.dev/guide/http/http-resource#response-parsing-and-validation)).
- **Don't use it for mutations** (POST/PUT): "prefer directly using the underlying HttpClient APIs"
  ([docs](https://angular.dev/guide/http/http-resource#using-httpresource)).
- Must be created in an injection context (or pass `injector`).

## 10. `rxResource()` and choosing

`rxResource({ params, stream })` — like `resource`, but `stream` returns an **Observable**; ideal to reuse an
existing `HttpClient`-based service ([docs](https://angular.dev/ecosystem/rxjs-interop#using-rxresource-for-async-data)).
The Observable must emit a value or an error before completing (else NG0991,
[docs](https://angular.dev/errors/NG0991)).

```ts
user = rxResource({ params: () => this.userId(), stream: ({ params: id }) => this.api.getUser(id) });
```

| Use | When |
| --- | --- |
| `httpResource` | declarative GET bound to signals; you want interceptors and the least code |
| `rxResource` | you already have Observable services, or need RxJS operators in the loader |
| `resource` | non-HTTP async (IndexedDB, Web APIs, third-party Promise SDKs) |
| plain `HttpClient` | **mutations**, imperative one-off calls, fine control (events, progress) |

Demo: the three side by side, same `userId` signal —
[`resource-trio.ts`](../../src/app/modules/09-http/resources/resource-trio.ts). Click quickly between users to see
cancellations (`⊘` lines from the interceptor; *"loader … aborted"* for `resource()`).

## 11. Testing HTTP

```ts
TestBed.configureTestingModule({
  providers: [provideHttpClient(withInterceptors([loggingInterceptor])), provideHttpClientTesting()],
});
const httpTesting = TestBed.inject(HttpTestingController);

const promise = firstValueFrom(api.getUsers());    // subscribe → request is "sent"
const req = httpTesting.expectOne('/mock/users.json');
expect(req.request.method).toBe('GET');
req.flush(users);                                   // respond
expect(await promise).toEqual(users);
httpTesting.verify();                               // no unexpected requests (afterEach)
```

- `provideHttpClientTesting()` swaps the backend for a test one and provides `HttpTestingController`.
  **Provide `provideHttpClient(...)` before it** ([docs](https://angular.dev/guide/http/testing#configuring-httpclient-in-tests)).
- `expectOne(urlOrMatcher)`, `match()`, `expectNone()`; `flush(body, { status, statusText })` for backend
  errors; `req.error(new ProgressEvent('error'))` for network errors
  ([docs](https://angular.dev/guide/http/testing)).
- `httpResource` is tested the same way (it's built on `HttpClient`)
  ([docs](https://angular.dev/guide/http/http-resource#testing-an-httpresource)).

This module's spec: [`user-api.spec.ts`](../../src/app/modules/09-http/user-api.spec.ts) — typed GET, POST body,
`retry` with fake timers, error mapping, interceptor + `HttpContext`.

## 12. Legacy APIs (interviews still ask)

```ts
// Legacy syntax (still supported) — NgModule setup
@NgModule({ imports: [HttpClientModule] })  // @deprecated: use provideHttpClient(withInterceptorsFromDi())
export class AppModule {}

// Legacy syntax (still supported) — class-based interceptor
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req.clone({ setHeaders: { Authorization: 'Bearer …' } }));
  }
}
// registered as a MULTI provider:
providers: [
  provideHttpClient(withInterceptorsFromDi()),
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
]
```

- `HttpClientModule` is **deprecated** ("use `provideHttpClient(withInterceptorsFromDi())` as providers
  instead" — [API](https://angular.dev/api/common/http/HttpClientModule)). The setup guide maps it to
  `provideHttpClient(withInterceptorsFromDi(), withXhr())` because the module used XHR
  ([docs](https://angular.dev/guide/http/setup#httpclientmodule-based-configuration)).
- `HTTP_INTERCEPTORS` is a **multi-provider token** ([API](https://angular.dev/api/common/http/HTTP_INTERCEPTORS));
  class interceptors call `next.handle(req)` instead of `next(req)`.
- The docs recommend functional interceptors: "more predictable ordering", and `withInterceptorsFromDi`
  support "may be phased out in a later release"
  ([docs](https://angular.dev/guide/http/setup#withinterceptorsfromdi),
  [API](https://angular.dev/api/common/http/withInterceptorsFromDi)).
- Bridge: `withInterceptorsFromDi()` lets both kinds coexist during a migration.

---

## 🎯 Likely interview questions

1. **Do you need `provideHttpClient()` in Angular 22?**
   <details><summary>Answer</summary>Not to inject <code>HttpClient</code> (available by default since v21); yes to configure features like interceptors, XHR, XSRF. <code>withFetch()</code> is deprecated because fetch is the default. (<a href="https://angular.dev/guide/http/setup">docs</a>)</details>

2. **Functional vs class-based interceptors?**
   <details><summary>Answer</summary>Functions registered with <code>withInterceptors([...])</code> (predictable order, <code>inject()</code> inside) vs classes implementing <code>HttpInterceptor</code> registered via the multi token <code>HTTP_INTERCEPTORS</code> + <code>withInterceptorsFromDi()</code>. Functional is recommended. (<a href="https://angular.dev/guide/http/interceptors">docs</a>)</details>

3. **Why `req.clone()` in an interceptor?**
   <details><summary>Answer</summary><code>HttpRequest</code> is immutable, which keeps interceptors idempotent when a request is retried. (<a href="https://angular.dev/guide/http/interceptors#modifying-requests">docs</a>)</details>

4. **What's `status 0` in an `HttpErrorResponse`?**
   <details><summary>Answer</summary>No response from the server: network error, CORS failure or timeout. (<a href="https://angular.dev/guide/http/making-requests#handling-request-failure">docs</a>)</details>

5. **How do you cancel an HTTP request?**
   <details><summary>Answer</summary>Unsubscribe (directly, via <code>switchMap</code>, async pipe, <code>takeUntilDestroyed</code>); resources cancel automatically when params change. (<a href="https://angular.dev/guide/http/making-requests#http-observables">docs</a>)</details>

6. **`httpResource` vs `HttpClient`?**
   <details><summary>Answer</summary><code>httpResource</code> is eager, reactive (signals in, signals out), cancels on param change — for reads. <code>HttpClient</code> is lazy (subscribe) and should be used for mutations. (<a href="https://angular.dev/guide/http/http-resource">docs</a>)</details>

7. **What does `HttpContext` do?**
   <details><summary>Answer</summary>Typed per-request metadata (keys = <code>HttpContextToken</code> with a default factory) read by interceptors, never sent to the server. (<a href="https://angular.dev/guide/http/interceptors#request-and-response-metadata">docs</a>)</details>

8. **How do you test a service using HttpClient?**
   <details><summary>Answer</summary><code>provideHttpClient()</code> then <code>provideHttpClientTesting()</code>; trigger the call; <code>expectOne()</code>; <code>flush()</code>; <code>verify()</code>. (<a href="https://angular.dev/guide/http/testing">docs</a>)</details>

9. **What happens when a resource's params change during a load? When are params `undefined`?**
   <details><summary>Answer</summary>The in-flight load is aborted (abortSignal) and a new one starts; <code>undefined</code> params → status <code>'idle'</code>, no load. (<a href="https://angular.dev/guide/signals/resource#aborting-requests">docs</a>)</details>

10. **`HttpClientModule` — what replaced it?**
    <details><summary>Answer</summary><code>provideHttpClient()</code> with feature functions; the exact equivalent is <code>provideHttpClient(withInterceptorsFromDi(), withXhr())</code>. (<a href="https://angular.dev/guide/http/setup#httpclientmodule-based-configuration">docs</a>)</details>

## 📚 References

- https://angular.dev/guide/http
- https://angular.dev/guide/http/setup
- https://angular.dev/guide/http/making-requests
- https://angular.dev/guide/http/interceptors
- https://angular.dev/guide/http/testing
- https://angular.dev/guide/http/http-resource
- https://angular.dev/guide/signals/resource
- https://angular.dev/ecosystem/rxjs-interop#using-rxresource-for-async-data
- https://angular.dev/api/common/http/withFetch
- https://angular.dev/api/common/http/HttpErrorResponse
- https://angular.dev/api/common/http/HttpRequest
- https://angular.dev/api/common/http/HttpClientModule
- https://angular.dev/api/common/http/HTTP_INTERCEPTORS
- https://angular.dev/api/common/http/withInterceptorsFromDi
- https://angular.dev/errors/NG0991
- https://github.com/angular/angular/blob/main/CHANGELOG.md
