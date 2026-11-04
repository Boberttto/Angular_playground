# 06 · RxJS

RxJS is the reactive-streams library Angular has used since v2: `HttpClient`, the router's events, reactive
forms' `valueChanges` all expose Observables. Signals now cover most **synchronous state**, but RxJS is still
the tool for **events over time** (debouncing, cancelling, combining, retrying). Interviews test both, and the
**interop** between them.

Installed version: `rxjs ~7.8` (see `package.json`). Live demos: [`src/app/modules/06-rxjs/`](../../src/app/modules/06-rxjs/)
(route `/rxjs`).

## Table of contents

1. [Observable vs Promise](#1-observable-vs-promise)
2. [Cold vs hot, and sharing (`share`, `shareReplay`)](#2-cold-vs-hot-and-sharing)
3. [Subjects: `Subject`, `BehaviorSubject`, `ReplaySubject`, `AsyncSubject`](#3-subjects)
4. [Everyday operators](#4-everyday-operators)
5. [Error handling: `catchError`, `retry`](#5-error-handling-catcherror-retry)
6. [Combination: `combineLatest`, `forkJoin`, `withLatestFrom`](#6-combination-combinelatest-forkjoin-withlatestfrom)
7. [Flattening: `switchMap` / `mergeMap` / `concatMap` / `exhaustMap`](#7-flattening-operators)
8. [Unsubscribing & memory leaks](#8-unsubscribing--memory-leaks)
9. [Signals interop: `toSignal`, `toObservable`, `outputFromObservable`, `rxResource`](#9-signals-interop)
10. [Signals or RxJS?](#10-signals-or-rxjs)
11. [🎯 Likely interview questions](#-likely-interview-questions)
12. [📚 References](#-references)

---

## 1. Observable vs Promise

"Observables are lazy Push collections of multiple values" ([rxjs.dev](https://rxjs.dev/guide/observable)).

| | Promise | Observable |
| --- | --- | --- |
| Values | exactly one (or a rejection) | 0…N values, then `complete` or `error` |
| Eager / lazy | **eager**: the executor runs at creation | **lazy**: nothing runs until `subscribe()` |
| Cancellation | none built-in (use `AbortController`) | `unsubscribe()` runs the teardown logic |
| Sync/async | `then` callbacks are always async (microtask) | can emit synchronously or asynchronously |
| Multicast | always shares its single result | **unicast by default** (each subscriber = new execution) |
| Composition | `then`, `Promise.all/race` | 100+ operators |

```ts
const p = new Promise((r) => { console.log('runs NOW'); r(1); });   // logs immediately
const o = new Observable((s) => { console.log('runs on subscribe'); s.next(1); s.complete(); });
o.subscribe(); o.subscribe(); // logs twice: one execution per subscriber
```

Converting: `firstValueFrom(obs$)` / `lastValueFrom(obs$)` replace the deprecated `toPromise()`
([rxjs.dev](https://rxjs.dev/deprecations/to-promise)); `from(promise)` goes the other way.

> 💡 **Interview tip:** Angular's `HttpClient` returns *cold* Observables: "no actual request happens until the
> Observable is subscribed", subscribing twice sends two requests, and **unsubscribing aborts the in-flight
> request** ([docs](https://angular.dev/guide/http/making-requests#http-observables)). A Promise can't do that.

## 2. Cold vs hot, and sharing

- **Cold**: the producer is created **inside** the subscription → each subscriber gets its own independent
  execution (HTTP calls, `timer`, `of`, `defer`).
- **Hot**: the producer exists **outside** and is shared; subscribers only see what's emitted after they
  join (DOM events, a `Subject`, a WebSocket).

To make a cold source shared ("multicast"):

- `share()` — one shared execution while there are subscribers; late subscribers miss past values
  ([rxjs.dev](https://rxjs.dev/api/operators/share)).
- `shareReplay({ bufferSize: 1, refCount })` — shares **and replays** the last N values to late
  subscribers. "A successfully completed source will stay cached … forever, but an errored source can be
  retried." By default `refCount` is **false**: the source is **not** unsubscribed when subscribers drop to
  zero ([rxjs.dev](https://rxjs.dev/api/operators/shareReplay)).

```ts
// Cache a config request for the whole app lifetime:
readonly config$ = this.http.get<Config>('/api/config').pipe(shareReplay(1));
```

Demo: *"Subscribe twice to cold$"* logs 🔥 twice; *"shared$"* logs it once and the late subscriber gets the
replayed value — [`sharing-demo.ts`](../../src/app/modules/06-rxjs/sharing-demo/sharing-demo.ts).

> ⚠️ **Pitfall:** `shareReplay(1)` on an **infinite** source (interval, store selector, WebSocket) with the
> default `refCount: false` keeps the source subscribed after every consumer is gone → leak. Use
> `shareReplay({ bufferSize: 1, refCount: true })` for infinite sources
> ([rxjs.dev](https://rxjs.dev/api/operators/shareReplay)).

> ⚠️ **Pitfall:** two `| async` on the same HTTP Observable in a template = two requests. Share it, or better,
> expose the data as a signal (`toSignal`, `httpResource`).

## 3. Subjects

A `Subject` is both an Observable and an Observer: you can `next()` into it, and it **multicasts** to all its
subscribers ([rxjs.dev](https://rxjs.dev/guide/subject)).

| Type | What a **late** subscriber receives | Typical use |
| --- | --- | --- |
| `Subject` | nothing from the past, only future values | event bus, "trigger" streams |
| `BehaviorSubject(initial)` | the **current** value immediately (needs an initial value; has `.value`/`getValue()`) | state ("current user") — now usually a `signal` |
| `ReplaySubject(n, windowMs?)` | the last *n* values (optionally within a time window) | caches, history |
| `AsyncSubject` | nothing until `complete()`, then **only the last value** | "result of a computation" (rare) |

Behaviour after `complete()` (observed in the demo, consistent with the RxJS docs): a new subscriber to a
completed `Subject` or `BehaviorSubject` only gets `complete`; a `ReplaySubject` replays its buffer then
completes; an `AsyncSubject` emits its last value then completes.

Demo: [`subjects-demo.ts`](../../src/app/modules/06-rxjs/subjects-demo/subjects-demo.ts) — subscriber A at the
start, late subscribers added with a button.

> 💡 **Interview tip:** expose subjects read-only: `private readonly _events = new Subject<E>();
> readonly events$ = this._events.asObservable();` so consumers can't call `next()`.

## 4. Everyday operators

Operators are pure functions `Observable → Observable` combined with `pipe()`
([rxjs.dev](https://rxjs.dev/guide/operators)).

| Operator | Does | Note |
| --- | --- | --- |
| `map(fn)` | transforms each value | [rxjs.dev](https://rxjs.dev/api/operators/map) |
| `filter(pred)` | drops values | [rxjs.dev](https://rxjs.dev/api/operators/filter) |
| `tap(fn)` | side effect, value unchanged | for logging/debugging, not for business logic ([rxjs.dev](https://rxjs.dev/api/operators/tap)) |
| `debounceTime(ms)` | emits a value only after `ms` of silence | typeahead ([rxjs.dev](https://rxjs.dev/api/operators/debounceTime)) |
| `distinctUntilChanged()` | drops a value equal (`===`) to the previous one | accepts a comparator ([rxjs.dev](https://rxjs.dev/api/operators/distinctUntilChanged)) |
| `takeUntil(notifier$)` | completes when the notifier emits | put it **last** in the pipe ([rxjs.dev](https://rxjs.dev/api/operators/takeUntil)) |
| `startWith(v)` | emits `v` first | loading states |
| `finalize(fn)` | runs on complete, error **or unsubscribe** | the demos use it to detect cancellation |

The canonical typeahead ([`typeahead.ts`](../../src/app/modules/06-rxjs/typeahead/typeahead.ts)):

```ts
state = toSignal(
  toObservable(this.query).pipe(
    map((q) => q.trim()),
    debounceTime(300),            // wait for the user to stop typing
    distinctUntilChanged(),       // ignore "ng " → "ng"
    filter((q) => q.length >= 2), // don't search for 1 char
    switchMap((q) =>              // cancel the previous search
      this.search(q).pipe(
        map((results) => ({ loading: false, results })),
        catchError((e) => of({ loading: false, results: [], error: e.message })), // inner catch!
        startWith({ loading: true, results: [] }),
      ),
    ),
  ),
  { initialValue: { loading: false, results: [] } },
);
```

## 5. Error handling: `catchError`, `retry`

An `error` notification **terminates** the Observable: no more values after it.

- `catchError((err, caught) => replacement$)` replaces the errored stream with another Observable (a fallback
  value with `of(...)`, `EMPTY`, or rethrow with `throwError(() => err)`) ([rxjs.dev](https://rxjs.dev/api/operators/catchError)).
- `retry(n)` / `retry({ count, delay, resetOnSuccess })` **re-subscribes** to the source on error
  ([rxjs.dev](https://rxjs.dev/api/operators/retry)). With a cold HTTP Observable, re-subscribing **re-sends
  the request** (and re-runs interceptors) — see module 09.

> ⚠️ **Pitfall (most common RxJS bug in Angular):** placing `catchError` on the **outer** stream of a
> `switchMap`. The fallback replaces the *whole* stream, which then completes → the search box stops working
> after the first error. Put `catchError` **inside** the inner Observable (as in the typeahead above; try
> typing `error` then another term in the demo).

## 6. Combination: `combineLatest`, `forkJoin`, `withLatestFrom`

| | Emits when | Completes when | Analogy |
| --- | --- | --- | --- |
| `combineLatest([a$, b$])` | **any** source emits, once **all** have emitted at least once | all complete | spreadsheet cells |
| `forkJoin([a$, b$])` / `forkJoin({…})` | **once**, with the **last** value of each, when **all complete** | right after | `Promise.all` |
| `a$.pipe(withLatestFrom(b$))` | only when **`a$`** emits (needs `b$` to have emitted) | when `a$` completes | "sample b on a" |

forkJoin details from the docs: if any source completes **without emitting**, forkJoin completes without
emitting; a source that **never completes** blocks it forever; any error errors forkJoin and unsubscribes
the others ([rxjs.dev](https://rxjs.dev/api/index/function/forkJoin)). `combineLatest` docs:
[rxjs.dev](https://rxjs.dev/api/index/function/combineLatest); `withLatestFrom`:
[rxjs.dev](https://rxjs.dev/api/operators/withLatestFrom).

Demo: buttons `a$.next()` / `b$.next()` / `forkJoin` in
[`sharing-demo.ts`](../../src/app/modules/06-rxjs/sharing-demo/sharing-demo.ts).

> ⚠️ **Pitfall:** `forkJoin` with a `Subject`, `interval`, `valueChanges` or `toObservable(signal)` never
> emits (they don't complete). Use `combineLatest`, or add `take(1)`.

> 💡 **Interview tip:** with signals, `combineLatest` of state is usually just a `computed()`.

## 7. Flattening operators

"Higher-order mapping": each outer value is mapped to an **inner Observable** (often an HTTP call) and the
operator decides what happens when a new outer value arrives while an inner one is still running.

| Operator | Policy when a new value arrives while busy | Use case |
| --- | --- | --- |
| `switchMap` | **unsubscribes (cancels) the previous** inner, switches to the new one | search/typeahead, route param → load |
| `mergeMap` (deprecated alias `flatMap`) | runs all inners **concurrently**; output order = completion order | independent fire-and-forget writes, parallel loads |
| `concatMap` | **queues**: waits for the current inner to complete, preserves order | ordered saves, sequential steps |
| `exhaustMap` | **ignores** new values until the current inner completes | login/submit button, refresh-on-pull |

References: [switchMap](https://rxjs.dev/api/operators/switchMap), [mergeMap](https://rxjs.dev/api/operators/mergeMap),
[concatMap](https://rxjs.dev/api/operators/concatMap), [exhaustMap](https://rxjs.dev/api/operators/exhaustMap).
`concatMap` is `mergeMap` with a concurrency of 1; `mergeMap(fn, n)` caps concurrency.

Timeline demo ([`flattening-timeline.ts`](../../src/app/modules/06-rxjs/flattening-timeline/flattening-timeline.ts)):
3 quick clicks, each a 1.5 s fake request. Result (verified):

```
switchMap   #1 cancelled  #2 cancelled  #3 done
mergeMap    #1 done       #2 done       #3 done        (all in parallel)
concatMap   #1 done       #2 running    #3 queued      (one after the other)
exhaustMap  #1 done       #2 ignored    #3 ignored
```

> ⚠️ **Pitfall:** `switchMap` for **writes** (POST/PUT/DELETE) can cancel a request the server already
> processed → the client never learns the result. Use `concatMap` (order matters) or `mergeMap`/`exhaustMap`.

> ⚠️ **Pitfall:** nested `subscribe()` inside `subscribe()` = no cancellation, no error propagation, leaks.
> Always flatten with one of these operators.

## 8. Unsubscribing & memory leaks

A subscription to an Observable that **never completes** (interval, `Subject`, DOM events, store selectors,
`valueChanges`) keeps its callback — and everything the callback closes over, such as your destroyed
component — alive. HttpClient Observables complete after the response, so they rarely leak, but the docs
still recommend cleaning up because the callback may otherwise run against a destroyed component
([docs](https://angular.dev/guide/http/making-requests#http-observables)).

Strategies (all demoed in [`strategy-children.ts`](../../src/app/modules/06-rxjs/unsubscribe-demo/strategy-children.ts),
with a live subscription counter):

| Strategy | How | Notes |
| --- | --- | --- |
| `async` pipe | `{{ obs$ \| async }}` | subscribes/unsubscribes with the view ([API](https://angular.dev/api/common/AsyncPipe)) |
| `toSignal(obs$)` | in an injection context | auto-unsubscribes when the component **or service** is destroyed ([docs](https://angular.dev/ecosystem/rxjs-interop#create-a-signal-from-an-rxjs-observable-with-tosignal)) |
| `takeUntilDestroyed()` | `.pipe(takeUntilDestroyed())` in an injection context, or `takeUntilDestroyed(destroyRef)` elsewhere | completes the stream on destroy ([docs](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)) |
| Manual | keep the `Subscription`, `unsubscribe()` in `ngOnDestroy` (or `DestroyRef.onDestroy`) | verbose, error-prone |
| Legacy `takeUntil(destroy$)` | a `Subject` you `next()`+`complete()` in `ngOnDestroy` | what `takeUntilDestroyed` replaced |

> ⚠️ **Pitfall:** operator order — `takeUntilDestroyed()`/`takeUntil()` should be the **last** operator;
> placed before a `switchMap`, the inner Observable keeps running after destroy.

> ⚠️ **Pitfall:** calling `takeUntilDestroyed()` without argument inside `ngOnInit` or a click handler throws
> NG0203 (not an injection context) — pass `inject(DestroyRef)` captured in a field
> ([docs](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)).

## 9. Signals interop

All in `@angular/core/rxjs-interop` ([docs](https://angular.dev/ecosystem/rxjs-interop)).

### `toSignal(obs$, options?)`

- Subscribes **immediately** (like the async pipe) and unsubscribes on destroy of the calling
  component/service. Needs an injection context (or `injector` option).
- Without `initialValue` the signal is `T | undefined` until the first emission; `requireSync: true` asserts a
  synchronous first emission (e.g. `BehaviorSubject`) and removes `undefined` from the type.
- Errors are **thrown when the signal is read**; after completion it keeps the last value.
- Don't call it repeatedly for the same Observable (each call = one subscription).
([docs](https://angular.dev/ecosystem/rxjs-interop#create-a-signal-from-an-rxjs-observable-with-tosignal))

### `toObservable(signal)`

Uses an `effect` internally: the first value may be emitted synchronously on subscribe, later ones
asynchronously, and **only after the signal stabilizes** — `set(1); set(2); set(3)` emits just `3`
([docs](https://angular.dev/ecosystem/rxjs-interop#timing-of-toobservable)). Needs an injection context.

### `outputFromObservable(obs$)` / `outputToObservable(output)`

`outputFromObservable` declares a component output driven by an Observable; it may only be called in
component/directive **property initializers**, and Angular stops forwarding values when the component is
destroyed ([docs](https://angular.dev/ecosystem/rxjs-interop/output-interop)). Demo:
[`countdown.ts`](../../src/app/modules/06-rxjs/interop-demo/countdown.ts).

### `rxResource({ params, stream })`

A `resource` whose loader (`stream`) returns an Observable. When `params` changes, the previous stream is
unsubscribed. Same API as `resource()`: `value`, `status`, `error`, `isLoading`, `hasValue()`, `reload()`
([docs](https://angular.dev/ecosystem/rxjs-interop#using-rxresource-for-async-data)). The Observable "must always
emit a value or an error before it completes" — `catchError(() => EMPTY)` triggers **NG0991**
([docs](https://angular.dev/errors/NG0991)). Demo:
[`interop-demo.ts`](../../src/app/modules/06-rxjs/interop-demo/interop-demo.ts) (book 4 → error state).
More about resources in module 09.

## 10. Signals or RxJS?

| Prefer **signals** for… | Prefer **RxJS** for… |
| --- | --- |
| component/app **state** (current value always available) | **events over time** (keystrokes, websockets, polling) |
| derived values (`computed`) | time operators: `debounceTime`, `throttleTime`, `delay`, `retry` with backoff |
| template bindings (fine-grained, zoneless-friendly) | cancellation / concurrency policies (`switchMap`, `exhaustMap`…) |
| simple async data → `resource` / `httpResource` | complex orchestration (`combineLatest` of streams, `forkJoin`, `race`) |

A common pattern: **RxJS in the middle, signals at the edges** — `toObservable(inputSignal)` → operators →
`toSignal(...)` for the template (the typeahead demo).

> ⚠️ Not confirmed by official docs / opinion: the table above is a community rule of thumb; the Angular docs
> describe the interop APIs but do not prescribe this split.

---

## 🎯 Likely interview questions

1. **Observable vs Promise?**
   <details><summary>Answer</summary>Promise: eager, single value, not cancellable. Observable: lazy, 0..N values, cancellable via unsubscribe, rich operators, unicast by default. (<a href="https://rxjs.dev/guide/observable">rxjs.dev</a>)</details>

2. **switchMap vs mergeMap vs concatMap vs exhaustMap?**
   <details><summary>Answer</summary>Cancel previous / run in parallel / queue in order / ignore while busy. Typeahead / independent writes / ordered saves / submit button. (<a href="https://rxjs.dev/api/operators/switchMap">rxjs.dev</a>)</details>

3. **BehaviorSubject vs ReplaySubject(1)?**
   <details><summary>Answer</summary>BehaviorSubject requires an initial value, always has a current value (<code>.value</code>) and emits it to new subscribers; ReplaySubject(1) has no initial value (late subscribers get nothing until the first <code>next</code>) and replays even after completion. (<a href="https://rxjs.dev/guide/subject">rxjs.dev</a>)</details>

4. **Cold vs hot Observable? How do you avoid two HTTP calls?**
   <details><summary>Answer</summary>Cold creates its producer per subscriber (HTTP); hot shares an existing one. Share with <code>shareReplay(1)</code> or convert once to a signal. (<a href="https://angular.dev/guide/http/making-requests#http-observables">docs</a>)</details>

5. **How do you avoid memory leaks with subscriptions in Angular?**
   <details><summary>Answer</summary>Prefer async pipe / <code>toSignal</code>; otherwise <code>takeUntilDestroyed()</code> (last in the pipe); manual unsubscribe as fallback. (<a href="https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed">docs</a>)</details>

6. **forkJoin vs combineLatest?**
   <details><summary>Answer</summary>forkJoin emits once when all complete (last values); combineLatest emits on every change once all have emitted. forkJoin never emits with non-completing sources. (<a href="https://rxjs.dev/api/index/function/forkJoin">rxjs.dev</a>)</details>

7. **Where do you put catchError in a switchMap pipeline, and why?**
   <details><summary>Answer</summary>Inside the inner Observable; on the outer one, the first error replaces and completes the whole stream. (<a href="https://rxjs.dev/api/operators/catchError">rxjs.dev</a>)</details>

8. **What does `toSignal` do with errors and completion?**
   <details><summary>Answer</summary>Errors are thrown when the signal is read; after completion the signal keeps its last value. (<a href="https://angular.dev/ecosystem/rxjs-interop#error-and-completion">docs</a>)</details>

9. **Why does `toObservable` emit only `3` after `set(1); set(2); set(3)`?**
   <details><summary>Answer</summary>It's backed by an effect, which runs after the signal settles — signals don't notify synchronously. (<a href="https://angular.dev/ecosystem/rxjs-interop#timing-of-toobservable">docs</a>)</details>

10. **What's `shareReplay`'s `refCount` and when does it matter?**
    <details><summary>Answer</summary>Default false: the source stays subscribed when subscribers drop to 0 (fine for completing HTTP, leak for infinite sources). Use <code>refCount: true</code> for infinite sources. (<a href="https://rxjs.dev/api/operators/shareReplay">rxjs.dev</a>)</details>

## 📚 References

- https://rxjs.dev/guide/observable
- https://rxjs.dev/guide/subject
- https://rxjs.dev/guide/operators
- https://rxjs.dev/deprecations/to-promise
- https://rxjs.dev/api/operators/share
- https://rxjs.dev/api/operators/shareReplay
- https://rxjs.dev/api/operators/map
- https://rxjs.dev/api/operators/filter
- https://rxjs.dev/api/operators/tap
- https://rxjs.dev/api/operators/debounceTime
- https://rxjs.dev/api/operators/distinctUntilChanged
- https://rxjs.dev/api/operators/takeUntil
- https://rxjs.dev/api/operators/catchError
- https://rxjs.dev/api/operators/retry
- https://rxjs.dev/api/operators/switchMap
- https://rxjs.dev/api/operators/mergeMap
- https://rxjs.dev/api/operators/concatMap
- https://rxjs.dev/api/operators/exhaustMap
- https://rxjs.dev/api/operators/withLatestFrom
- https://rxjs.dev/api/index/function/combineLatest
- https://rxjs.dev/api/index/function/forkJoin
- https://angular.dev/ecosystem/rxjs-interop
- https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed
- https://angular.dev/ecosystem/rxjs-interop/output-interop
- https://angular.dev/guide/http/making-requests#http-observables
- https://angular.dev/api/common/AsyncPipe
- https://angular.dev/errors/NG0991
