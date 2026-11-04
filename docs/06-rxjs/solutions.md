# 06 · RxJS — Solutions

All solutions were compiled and rendered in a TestBed with Angular 22 / RxJS 7.8 before being written here.
Paths assume `src/app/sandbox/` (shared helpers imported from `'../shared/...'`).

---

## Solution 1 ⭐ — Your first Observable and pipe

```ts
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, filter, interval, map, take } from 'rxjs';
import { EventLog } from '../shared/event-log';
import { LogPanel } from '../shared/log-panel/log-panel';

@Component({
  selector: 'app-first-pipeline',
  imports: [LogPanel],
  template: `
    <button type="button" (click)="start()">Start</button>
    <app-log-panel [entries]="log.entries()" (cleared)="log.clear()" />
  `,
})
export class FirstPipeline {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly log = new EventLog();

  /** Hand-written cold Observable: the producer runs once per subscriber. */
  private readonly countdown$ = new Observable<number>((subscriber) => {
    this.log.add('producer started');
    let n = 3;
    const id = setInterval(() => {
      subscriber.next(n--);
      if (n < 0) subscriber.complete();
    }, 500);
    return () => {
      clearInterval(id);
      this.log.add('teardown');
    };
  });

  start(): void {
    this.countdown$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (v) => this.log.add(`countdown: ${v}`),
      complete: () => this.log.add('countdown complete', 'success'),
    });
    interval(200)
      .pipe(
        filter((i) => i % 2 === 0),
        map((i) => i * 10),
        take(5),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (v) => this.log.add(`even×10: ${v}`),
        complete: () => this.log.add('interval pipeline complete', 'success'),
      });
  }
}
```

**Why:** the function passed to `new Observable()` is the **producer**; it only runs on `subscribe()`
(Observables are lazy — [rxjs.dev](https://rxjs.dev/guide/observable)), so `producer started` appears only
after the click, and once **per** subscription (cold). The returned function is the **teardown**: it runs on
complete, error, or unsubscribe — here it runs after `complete()`, and would also run if the component were
destroyed (`takeUntilDestroyed` unsubscribes). In a click handler there's no injection context, hence the
explicit `DestroyRef` ([docs](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)).
`take(5)` completes the interval pipeline by itself.

---

## Solution 2 ⭐ — BehaviorSubject store → signal store

```ts
import { Service, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, map } from 'rxjs';

export interface CartItem {
  readonly id: number;
  readonly name: string;
  readonly price: number;
}

/** Legacy style (still very common in existing code bases). */
@Service()
export class CartStoreRx {
  private readonly items$$ = new BehaviorSubject<readonly CartItem[]>([]);
  readonly items$: Observable<readonly CartItem[]> = this.items$$.asObservable();
  readonly total$ = this.items$.pipe(map((items) => items.reduce((sum, i) => sum + i.price, 0)));

  add(item: CartItem): void {
    this.items$$.next([...this.items$$.value, item]);
  }

  remove(id: number): void {
    this.items$$.next(this.items$$.value.filter((i) => i.id !== id));
  }
}

/** Signal style: same API surface, no subscription to manage. */
@Service()
export class CartStore {
  private readonly _items = signal<readonly CartItem[]>([]);
  readonly items = this._items.asReadonly();
  readonly total = computed(() => this._items().reduce((sum, i) => sum + i.price, 0));
  /** For RxJS consumers that still need a stream. */
  readonly items$ = toObservable(this._items);

  add(item: CartItem): void {
    this._items.update((list) => [...list, item]);
  }

  remove(id: number): void {
    this._items.update((list) => list.filter((i) => i.id !== id));
  }
}
```

Template usage: `@for (i of rx.items$ | async; track i.id)` / `{{ rx.total$ | async }}` vs
`@for (i of store.items(); track i.id)` / `{{ store.total() }}`.

**Why:** `BehaviorSubject` always holds a current value (`.value`) and replays it to new subscribers — the
classic state container ([rxjs.dev](https://rxjs.dev/guide/subject)). Exposing `asObservable()` prevents
outside `next()` calls. The signal version gives the same guarantees (current value, read-only exposure via
`asReadonly()`, derived state via `computed`) **without subscriptions** and with fine-grained change
detection. `toObservable()` bridges back to RxJS when needed
([docs](https://angular.dev/ecosystem/rxjs-interop#create-an-rxjs-observable-from-a-signal-with-toobservable)).

---

## Solution 3 ⭐⭐ — A robust search box

```ts
import { Component, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, debounceTime, distinctUntilChanged, filter, map, of, delay, switchMap, throwError } from 'rxjs';

interface Country {
  readonly code: string;
  readonly name: string;
}

const COUNTRIES: readonly Country[] = [
  { code: 'CA', name: 'Canada' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'MX', name: 'Mexico' },
];

function searchCountries(term: string): Observable<readonly Country[]> {
  if (term === 'xx') return throwError(() => new Error('Backend down')).pipe(delay(200));
  return of(COUNTRIES.filter((c) => c.name.toLowerCase().includes(term))).pipe(delay(300 + Math.random() * 500));
}

type Result = { readonly kind: 'ok'; readonly countries: readonly Country[] } | { readonly kind: 'error'; readonly message: string };

@Component({
  selector: 'app-country-search',
  template: `
    <input type="search" (input)="onInput($event)" aria-label="Country" />
    @switch (result().kind) {
      @case ('error') { <p class="error">{{ errorMessage() }}</p> }
      @default {
        <ul>
          @for (c of countries(); track c.code) { <li>{{ c.name }}</li> }
        </ul>
      }
    }
  `,
})
export class CountrySearch {
  private readonly term = signal('');

  protected readonly result = toSignal(
    toObservable(this.term).pipe(
      map((t) => t.trim().toLowerCase()),
      debounceTime(250),
      distinctUntilChanged(),
      filter((t) => t.length >= 2),
      switchMap((t) =>
        searchCountries(t).pipe(
          map((countries): Result => ({ kind: 'ok', countries })),
          catchError((e: Error) => of<Result>({ kind: 'error', message: e.message })),
        ),
      ),
    ),
    { initialValue: { kind: 'ok', countries: [] } as Result },
  );

  protected countries(): readonly Country[] {
    const r = this.result();
    return r.kind === 'ok' ? r.countries : [];
  }

  protected errorMessage(): string {
    const r = this.result();
    return r.kind === 'error' ? r.message : '';
  }

  protected onInput(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
  }
}
```

**Why:**
- `debounceTime` + `distinctUntilChanged` + `filter` cut useless requests.
- `switchMap` unsubscribes the previous search when a new term arrives, so a slow old response can never
  overwrite a newer one ([rxjs.dev](https://rxjs.dev/api/operators/switchMap)).
- `catchError` is **inside** `switchMap`: only the failing inner search is replaced by an error result; the
  outer stream (the input) survives. On the outer stream, the first error would complete everything.
- A discriminated union (`kind: 'ok' | 'error'`) keeps the template type-safe.
- `toSignal` subscribes once and unsubscribes on destroy
  ([docs](https://angular.dev/ecosystem/rxjs-interop#create-a-signal-from-an-rxjs-observable-with-tosignal)).

---

## Solution 4 ⭐⭐ — Pick the right flattening operator

```ts
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, concatMap, exhaustMap, map, timer } from 'rxjs';
import { EventLog } from '../shared/event-log';
import { LogPanel } from '../shared/log-panel/log-panel';

function fakeSave(payload: string): Observable<string> {
  return timer(1000).pipe(map(() => `saved "${payload}"`));
}

@Component({
  selector: 'app-save-buttons',
  imports: [LogPanel],
  template: `
    <button type="button" (click)="submit$.next('form')">Submit (exhaustMap)</button>
    <button type="button" (click)="autosave()">Autosave v{{ version() + 1 }} (concatMap)</button>
    <app-log-panel [entries]="log.entries()" (cleared)="log.clear()" />
  `,
})
export class SaveButtons {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly log = new EventLog();
  protected readonly submit$ = new Subject<string>();
  private readonly autosave$ = new Subject<string>();
  protected readonly version = signal(0);

  constructor() {
    // Double-clicks while a submit is in flight are ignored.
    this.submit$
      .pipe(exhaustMap(fakeSave), takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => this.log.add(`submit: ${r}`, 'success'));
    // Every version is saved, in order, one at a time.
    this.autosave$
      .pipe(concatMap(fakeSave), takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => this.log.add(`autosave: ${r}`, 'success'));
  }

  autosave(): void {
    this.version.update((v) => v + 1);
    this.autosave$.next(`v${this.version()}`);
  }
}
```

**Why:**
- **Submit → `exhaustMap`**: while a save is running, new clicks are **ignored**
  ([rxjs.dev](https://rxjs.dev/api/operators/exhaustMap)) — no duplicate orders.
- **Autosave → `concatMap`**: each version is **queued** and saved after the previous one completes, so the
  server ends with the latest version and never receives two concurrent writes
  ([rxjs.dev](https://rxjs.dev/api/operators/concatMap)).
- `switchMap` would *cancel* client-side a save the server may already have applied (unknown outcome);
  `mergeMap` could apply v2 after v3 if responses race.

---

## Solution 5 ⭐⭐⭐ — Live dashboard

```ts
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, startWith, switchMap, timer } from 'rxjs';

interface Price {
  readonly symbol: string;
  readonly value: number;
}

@Component({
  selector: 'app-price-board',
  template: `
    <p>Rate CAD→EUR: {{ rate() }}</p>
    <ul>
      @for (p of converted(); track p.symbol) {
        <li>{{ p.symbol }}: {{ p.value.toFixed(2) }} €</li>
      }
    </ul>
    <p>Refreshes: {{ refreshes() }}</p>
  `,
})
export class PriceBoard {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly refreshes = signal(0);

  // Poll every 2s; switchMap cancels a slow previous "request" if the next tick arrives first.
  private readonly prices$ = timer(0, 2000).pipe(
    switchMap(() =>
      timer(300).pipe(
        map((): Price[] => [
          { symbol: 'NG', value: 100 + Math.random() * 10 },
          { symbol: 'RX', value: 50 + Math.random() * 5 },
        ]),
      ),
    ),
  );
  private readonly rate$ = timer(0, 5000).pipe(map(() => 0.65 + Math.random() * 0.02));

  protected readonly rate = toSignal(this.rate$.pipe(map((r) => r.toFixed(4))), { initialValue: '…' });

  protected readonly converted = toSignal(
    combineLatest([this.prices$, this.rate$]).pipe(
      map(([prices, rate]) => prices.map((p) => ({ symbol: p.symbol, value: p.value * rate }))),
      startWith([] as { symbol: string; value: number }[]),
    ),
    { requireSync: true },
  );

  constructor() {
    this.prices$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshes.update((n) => n + 1));
  }
}
```

**Why:**
- `timer(0, 2000)` polls immediately then every 2 s; `switchMap` drops a poll that's still pending when
  the next tick arrives.
- `combineLatest` emits whenever **either** source emits, once both have emitted
  ([rxjs.dev](https://rxjs.dev/api/index/function/combineLatest)).
- `requireSync: true` makes `toSignal` throw if no value is emitted synchronously on subscribe, and in
  exchange the signal type has no `undefined`; `startWith([])` satisfies it
  ([docs](https://angular.dev/ecosystem/rxjs-interop#the-requiresync-option)).
- ⚠️ Note: `prices$` is cold and subscribed **twice** (in `combineLatest` and for the counter) → two polling
  loops. In real code, share it: `prices$ = …pipe(shareReplay({ bufferSize: 1, refCount: true }))`
  ([rxjs.dev](https://rxjs.dev/api/operators/shareReplay)). Good thing to mention in an interview.

---

## Solution 6 🎤 — Spot the bugs

Problems:
1. `takeUntilDestroyed()` **without argument in `ngOnInit`** → NG0203 (not an injection context)
   ([docs](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)).
2. It's also **first** in the pipe: operators after it (the inner HTTP requests of `mergeMap`) aren't covered.
   Put it last.
3. `mergeMap` for a search → out-of-order responses can show stale results. Use `switchMap`.
4. No `distinctUntilChanged`/length filter → useless requests.
5. `catchError` on the **outer** stream → after the first error, the stream completes and the search dies.
6. **Nested subscribe** for the audit call → unmanaged, uncancellable, errors unhandled. Chain it with an
   operator (`concatMap`/`mergeMap`) or move it to the server.
7. `this.users = users` mutates a plain field: components are **OnPush by default in v22** and apps are
   **zoneless**, so the view may never refresh. Use a signal (or `toSignal`).
8. The term isn't URL-encoded: use `params: { q: t }`.

Rewrite:

```ts
@Component({ selector: 'app-user-search', template: `…` })
export class UserSearch {
  private readonly http = inject(HttpClient);
  readonly term = signal('');

  readonly users = toSignal(
    toObservable(this.term).pipe(
      debounceTime(300),
      map((t) => t.trim()),
      distinctUntilChanged(),
      filter((t) => t.length >= 2),
      switchMap((q) =>
        this.http.get<User[]>('/api/users', { params: { q } }).pipe(
          concatMap((users) => this.http.post('/api/audit', { count: users.length }).pipe(map(() => users))),
          catchError(() => of<User[]>([])),
        ),
      ),
    ),
    { initialValue: [] },
  );
}
```

`toSignal` in a field initializer handles subscription **and** cleanup, and a signal read in the template
schedules change detection in a zoneless OnPush app ([docs](https://angular.dev/guide/zoneless)).
