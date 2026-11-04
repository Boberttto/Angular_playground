# 09 · HTTP & resources — Exercises

Work in [`src/app/sandbox/`](../../src/app/sandbox/) (route `/sandbox`). Mock data is served from
[`public/mock/`](../../public/mock/) at `/mock/...` (e.g. `/mock/products.json`, `/mock/users/1.json`).
Solutions: [solutions.md](./solutions.md).

---

## Exercise 1 ⭐ — Typed GET from a service

**Goal:** the standard "service + component" HTTP setup.

**Requirements**
- [ ] `interface Product { id; name; price }` and a `ProductApi` service (`@Service()`) with `list(): Observable<Product[]>` calling `/mock/products.json`.
- [ ] A `ProductList` component displays the products — **without** calling `subscribe()` yourself.
- [ ] Show "Loading…" until the data arrives.
- [ ] Open the `/http` page's log or the browser Network tab: confirm exactly **one** request.

<details><summary>Hints</summary>

- `toSignal(obs$, { initialValue: [] })` in a field initializer, and `@for … @empty`.
- No `provideHttpClient()` needed just to inject `HttpClient` (v21+).
</details>

---

## Exercise 2 ⭐⭐ — Global loading indicator & error interceptor

**Goal:** write functional interceptors with DI and `HttpContext`.

**Requirements**
- [ ] A root `LoadingState` with a pending-request counter and an `isLoading` computed signal.
- [ ] `loadingInterceptor` increments on request start and decrements when the request **ends for any reason** (success, error, cancellation).
- [ ] A `SILENT` `HttpContextToken<boolean>` (default `false`) lets a request opt out of the spinner.
- [ ] `errorInterceptor` stores a readable message in `LoadingState.lastError` (`'Network error'` for status 0) and **rethrows**.
- [ ] Register them for a sandbox route only (route `providers` + `withRequestsMadeViaParent()`), or in a TestBed.

<details><summary>Hints</summary>

- `finalize()` runs on complete, error and unsubscribe.
- `inject()` works inside an interceptor.
</details>

---

## Exercise 3 ⭐⭐ — A reactive user viewer with `httpResource`

**Goal:** status-driven UI with signals.

**Requirements**
- [ ] `userId = signal(1)` and buttons for ids 1, 2, 3 and 42 (42 doesn't exist).
- [ ] ``user = httpResource<UserDetails>(() => `/mock/users/${userId()}.json`)``.
- [ ] Use `@switch (user.status())` to show *loading*, *error (with `statusCode()`)*, and the user.
- [ ] A `computed` title in upper case that never throws, even in error state.
- [ ] A **Reload** button.

<details><summary>Hints</summary>

- Reading `value()` in `'error'` throws → guard with `hasValue()`.
</details>

---

## Exercise 4 ⭐⭐⭐ — Smart retry + test it

**Goal:** retry only what makes sense, and prove it with `HttpTestingController`.

**Requirements**
- [ ] `QuoteApi.random()` GETs `/api/quote`.
- [ ] Retry **only** network errors (status 0) and 5xx, up to 3 times, with exponential backoff (200, 400, 800 ms).
- [ ] 4xx errors are not retried; after giving up, fall back to `{ text: 'Keep calm and retry later.' }`.
- [ ] Write a spec: (a) 503 → 500 → 200 succeeds after 2 retries; (b) 404 is not retried and returns the fallback.

<details><summary>Hints</summary>

- `retry({ count, delay: (err, retryCount) => … })` — return `timer(ms)` to retry, `throwError(() => err)` to stop.
- `vi.useFakeTimers()` + `await vi.advanceTimersByTimeAsync(ms)` between `expectOne()` calls.
</details>

---

## Exercise 5 ⭐⭐⭐ — Migrate a legacy HTTP setup

**Goal:** know both worlds.

Given:

```ts
@NgModule({
  imports: [BrowserModule, HttpClientModule],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true }],
  bootstrap: [AppComponent],
})
export class AppModule {}

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${this.auth.token}` } }));
  }
}
```

**Requirements**
- [ ] Step 1: standalone bootstrap that keeps the class interceptor working unchanged.
- [ ] Step 2: convert it to a functional interceptor and remove the legacy pieces.
- [ ] Explain what changes regarding the HTTP backend (XHR vs fetch) between `HttpClientModule` and `provideHttpClient()`.

---

## Exercise 6 🎤 — Interview: explain out loud

Answer in ≤ 2 minutes each, then check with the theory:

- [ ] "Walk me through what happens, step by step, when a component calls `this.api.getUsers().subscribe()` in this project" (interceptor chain, backend, events, completion).
- [ ] "A user types fast in a search box and sometimes sees results for an older query. Why, and how do you fix it — with RxJS and with `httpResource`?"
- [ ] "Why shouldn't you use `httpResource` for a POST?"
- [ ] Debug: *"After a 500 error, our auto-refreshing dashboard stops updating forever."* Code: `timer(0, 5000).pipe(switchMap(() => http.get(url)), catchError(() => of(null)))`.
