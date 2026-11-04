# 🪤 Trick & nuanced interview questions

These questions are designed to catch a memorized answer. Each one has **the trap** (the tempting
wrong or incomplete answer) and **the strong answer** (what a senior candidate says), with a source.
Targets Angular 22. See also the [Q&A](./questions-answers.md) and the [lifecycle cheat sheet](./lifecycle-cheatsheet.md).

## Contents

1. [Is there another way to destroy a service other than `ngOnDestroy`?](#1-is-there-another-way-to-destroy-a-service-other-than-ngondestroy)
2. [Which lifecycle hook comes first in a service?](#2-which-lifecycle-hook-comes-first-in-a-service)
3. [Is the constructor a lifecycle hook?](#3-is-the-constructor-a-lifecycle-hook)
4. [Does `ngOnChanges` fire for signal inputs? For programmatic changes?](#4-does-ngonchanges-fire-for-signal-inputs-for-programmatic-changes)
5. [Is `ngOnChanges` always called before `ngOnInit`?](#5-is-ngonchanges-always-called-before-ngoninit)
6. [Does an OnPush component still get checked when an event happens?](#6-does-an-onpush-component-still-get-checked-when-an-event-happens)
7. [Does `ngDoCheck` run on an OnPush component that is skipped?](#7-does-ngdocheck-run-on-an-onpush-component-that-is-skipped)
8. [Is `Default` still the default change detection strategy?](#8-is-default-still-the-default-change-detection-strategy)
9. [Is Angular still using zone.js?](#9-is-angular-still-using-zonejs)
10. [Can I call `inject()` in `ngOnInit`?](#10-can-i-call-inject-in-ngoninit)
11. [`Subject` vs `BehaviorSubject`: what does a new subscriber get first?](#11-subject-vs-behaviorsubject-what-does-a-new-subscriber-get-first)
12. [Does `switchMap` really cancel the HTTP request?](#12-does-switchmap-really-cancel-the-http-request)
13. [I use `obs$ | async` twice in the template. How many HTTP calls?](#13-i-use-obs--async-twice-in-the-template-how-many-http-calls)
14. [Do I need to unsubscribe from `http.get()`?](#14-do-i-need-to-unsubscribe-from-httpget)
15. [My pure pipe doesn't update after `items.push(x)`. Why?](#15-my-pure-pipe-doesnt-update-after-itemspushx-why)
16. [A `providedIn: 'root'` service used only in a lazy route: how many instances?](#16-a-providedin-root-service-used-only-in-a-lazy-route-how-many-instances)
17. [The same service is provided in two places. Which instance do I get?](#17-the-same-service-is-provided-in-two-places-which-instance-do-i-get)
18. [Why is `track` mandatory in `@for`? Is `track $index` fine?](#18-why-is-track-mandatory-in-for-is-track-index-fine)
19. [`effect` vs `computed`: can I set a signal inside an effect?](#19-effect-vs-computed-can-i-set-a-signal-inside-an-effect)
20. [Does a `computed` run if nobody reads it?](#20-does-a-computed-run-if-nobody-reads-it)
21. [`count.set(count())`: does it notify consumers?](#21-countsetcount-does-it-notify-consumers)
22. [Can a component write to its own `input()`?](#22-can-a-component-write-to-its-own-input)
23. [Does everything inside `@defer` get lazy-loaded?](#23-does-everything-inside-defer-get-lazy-loaded)
24. [Do I need `provideHttpClient()` to inject `HttpClient`?](#24-do-i-need-providehttpclient-to-inject-httpclient)
25. [Are class-based guards deprecated?](#25-are-class-based-guards-deprecated)
26. [Does `ngOnDestroy` run when the user closes the tab?](#26-does-ngondestroy-run-when-the-user-closes-the-tab)
27. [Is a route-level `providers` service destroyed when I navigate away?](#27-is-a-route-level-providers-service-destroyed-when-i-navigate-away)
28. [`ngIf` is deprecated. Does my app break?](#28-ngif-is-deprecated-does-my-app-break)

---

### 1. Is there another way to destroy a service other than `ngOnDestroy`?

**The trap:** "Yes, call `service.ngOnDestroy()`", or "No, `ngOnDestroy` is the only way."

**The strong answer:** You don't destroy a service directly. **Its injector does**, and that is when its cleanup runs.
So the question splits into two parts:

1. **How to run cleanup code**. There are three equivalent hooks, all triggered by the injector's destruction:
   - `ngOnDestroy()` on the service class (the `OnDestroy` hook applies to *"a directive, pipe, or service"*);
   - `inject(DestroyRef).onDestroy(() => …)` in the service. Outside a component or directive, *"the callbacks run when a corresponding injector is destroyed"*;
   - `takeUntilDestroyed()` on its Observables, which is built on `DestroyRef`.
2. **How to control *when* that happens**, by choosing the scope where it is provided:

   | Provided in… | Destroyed when… |
   |---|---|
   | `providedIn: 'root'` / `@Service()` | the application is destroyed: `ApplicationRef.destroy()` *"will destroy the associated environment injectors"* |
   | a component's or directive's `providers` | that component or directive is destroyed (e.g. `@if` goes false) |
   | a route's `providers` | the route's `EnvironmentInjector` is destroyed. By default it stays alive after navigating away; with `withAutoCleanupInjectors()` (stable in 22.2) the router destroys unused route injectors |
   | an injector you created with `createEnvironmentInjector(...)` or `Injector.create(...)` | you call `injector.destroy()` (*"Also calls the OnDestroy lifecycle hooks of every instance that was created"*) |

```ts
@Injectable()
export class PollingService {
  constructor() {
    const id = setInterval(() => this.poll(), 5000);
    inject(DestroyRef).onDestroy(() => clearInterval(id)); // same effect as ngOnDestroy
  }
  poll() {}
}
// Manual scope:
const child = createEnvironmentInjector([PollingService], inject(EnvironmentInjector));
child.get(PollingService);
child.destroy(); // → cleanup callbacks run
```

Sources: [OnDestroy](https://angular.dev/api/core/OnDestroy) · [DestroyRef](https://angular.dev/api/core/DestroyRef) · [EnvironmentInjector](https://angular.dev/api/core/EnvironmentInjector) · [createEnvironmentInjector](https://angular.dev/api/core/createEnvironmentInjector) · [ApplicationRef](https://angular.dev/api/core/ApplicationRef) · [withAutoCleanupInjectors](https://angular.dev/api/router/withAutoCleanupInjectors) · [Hierarchical injectors](https://angular.dev/guide/di/hierarchical-dependency-injection)

---

### 2. Which lifecycle hook comes first in a service?

**The trap:** "`ngOnInit`", or "`ngOnChanges` then `ngOnInit`, like components."

**The strong answer:** Services have **no** `ngOnInit` or `ngOnChanges`. Those hooks are called by change detection on
components and directives, and services aren't part of the view tree. If you add `ngOnInit` to a service, it **silently never runs**.
The **only** lifecycle hook a service gets is `ngOnDestroy` (or the `DestroyRef` equivalent).

Initialization goes in the **constructor** or in **field initializers with `inject()`**. These run **lazily**, at the
**first injection** of the service, not at app start. If you need code to run at startup, use:

- `provideAppInitializer(() => inject(ConfigService).load())`: runs during bootstrap, which waits for a returned Promise/Observable;
- `provideEnvironmentInitializer(() => …)`: runs when the environment injector is created (e.g. a lazy route's injector).

Both replace the `APP_INITIALIZER` / `ENVIRONMENT_INITIALIZER` tokens, which are deprecated since v19.

Sources: [OnDestroy](https://angular.dev/api/core/OnDestroy) · [Lifecycle guide](https://angular.dev/guide/components/lifecycle) · [provideAppInitializer](https://angular.dev/api/core/provideAppInitializer) · [provideEnvironmentInitializer](https://angular.dev/api/core/provideEnvironmentInitializer) · [Creating and using services](https://angular.dev/guide/di/creating-and-using-services)

---

### 3. Is the constructor a lifecycle hook?

**The trap:** "Yes, it's the first hook", or "No, it has nothing to do with the lifecycle."

**The strong answer:** It is a **plain JavaScript constructor**, not an Angular hook: there is no interface for it, and Angular
doesn't "call a hook" there. It *is* part of the lifecycle, though: the official guide lists it as the "Creation" phase.
What makes it special in Angular is that it is an **injection context**: `inject()`, `effect()`,
`afterNextRender()`, `toSignal()` and `takeUntilDestroyed()` with no argument all work there. Inputs are not set yet.

Source: [Lifecycle guide](https://angular.dev/guide/components/lifecycle) · [Injection context](https://angular.dev/guide/di/dependency-injection-context)

---

### 4. Does `ngOnChanges` fire for signal inputs? For programmatic changes?

**The trap:** "Signal inputs don't trigger `ngOnChanges`", or "any change to an input property triggers it."

**The strong answer:**

- **Signal inputs: yes**, `ngOnChanges` still fires for `input()` values set through bindings. The API docs say to *prefer
  `computed` and `effect`* with signal inputs, but the hook works, and the lifecycle guide's example uses `input()`.
- **Template bindings and `ComponentRef.setInput()`: yes.** `setInput` *"will also assure that the OnChanges lifecycle hook runs"*.
- **Assigning the property from TypeScript (`child.value = 3` via `@ViewChild`): no.** No `ngOnChanges`, and for OnPush no refresh either.
  Signal inputs are read-only, so you can't even do it with them.
- **Mutating an object passed as input: no.** Only a new reference counts.

Sources: [OnChanges](https://angular.dev/api/core/OnChanges) · [ComponentRef](https://angular.dev/api/core/ComponentRef) · [Skipping component subtrees](https://angular.dev/best-practices/skipping-subtrees)

---

### 5. Is `ngOnChanges` always called before `ngOnInit`?

**The trap:** "Yes, it's always the first hook."

**The strong answer:** Only if the component has **bound inputs**. During initialization, *"the first ngOnChanges runs before
ngOnInit"*. But `ngOnChanges` is only invoked when at least one data-bound input changed, so a component with no
inputs (or with none bound) never gets it, and `ngOnInit` is then the first hook.

Sources: [Lifecycle guide](https://angular.dev/guide/components/lifecycle) · [OnChanges](https://angular.dev/api/core/OnChanges)

---

### 6. Does an OnPush component still get checked when an event happens?

**The trap:** "No, OnPush only reacts to input changes."

**The strong answer:** Yes. An event handled in the component **or any of its children** (event binding, output binding,
`@HostListener`) marks it, **and its ancestors**, for check. The other triggers are: a new input reference via a template binding,
`markForCheck()` (including through the `async` pipe), and a signal read in its template changing.
What OnPush ignores is **mutations** and **events outside its subtree**.

Source: [Skipping component subtrees](https://angular.dev/best-practices/skipping-subtrees)

---

### 7. Does `ngDoCheck` run on an OnPush component that is skipped?

**The trap:** "No. If the component is skipped, none of its hooks run."

**The strong answer:** Yes, it does. `ngDoCheck` is called as part of checking the **parent's** template. The API docs say it is
*"invoked even when the directive's own change detection is skipped (e.g., with the OnPush change detection strategy)"*.
That is why `ngDoCheck` + `markForCheck()` was the classic way to implement custom change tracking for mutable inputs.

Source: [DoCheck](https://angular.dev/api/core/DoCheck)

---

### 8. Is `Default` still the default change detection strategy?

**The trap:** "Yes, you need to opt into OnPush."

**The strong answer:** Not since **v22**. A component without a `changeDetection` property is now **OnPush**. The old behavior is
`ChangeDetectionStrategy.Eager`, and `ChangeDetectionStrategy.Default` remains as a **deprecated alias of `Eager`** (both equal `1` in the typings).
`ng update` adds `Eager` to existing components so that their behavior doesn't change.

Sources: [Skipping component subtrees](https://angular.dev/best-practices/skipping-subtrees) · [ChangeDetectionStrategy](https://angular.dev/api/core/ChangeDetectionStrategy) · [v22 changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2200-2026-06-03)

---

### 9. Is Angular still using zone.js?

**The trap:** "Yes, that's how change detection works", or "No, zone.js was removed."

**The strong answer:** **Zoneless is the default since v21**. New apps don't include zone.js, and change detection is
scheduled by notifications: signals read in templates, `markForCheck` (also called by the `async` pipe), `setInput`, template and host listeners,
and attaching dirty views. zone.js is **still supported**: you opt in with `provideZoneChangeDetection()` plus the zone.js polyfill.
`NgZone` still exists, and `run`/`runOutsideAngular` are compatible with zoneless, but `onStable`/`onMicrotaskEmpty` never emit.
Timeline: experimental in v18, developer preview in v20, stable in 20.2, default in v21. `TestBed` is zoneless by default too.

Sources: [Zoneless guide](https://angular.dev/guide/zoneless) · [provideZoneChangeDetection](https://angular.dev/api/core/provideZoneChangeDetection) · [v20.2 changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2020-2025-08-20) · [CLI v21 changelog](https://github.com/angular/angular-cli/blob/main/CHANGELOG.md#2100-2025-11-19)

---

### 10. Can I call `inject()` in `ngOnInit`?

**The trap:** "Sure, it's inside the component."

**The strong answer:** No. `ngOnInit` is **not an injection context**, so you get **NG0203**. The same applies to `effect()`, `toSignal()`,
`afterNextRender()` and `takeUntilDestroyed()` with no argument. Call them in a field initializer or the constructor,
or pass an `injector` / `DestroyRef` option, or wrap the call in `runInInjectionContext(this.injector, …)`.

Sources: [Injection context](https://angular.dev/guide/di/dependency-injection-context) · [NG0203](https://angular.dev/errors/NG0203)

---

### 11. `Subject` vs `BehaviorSubject`: what does a new subscriber get first?

**The trap:** "Both give the last value."

**The strong answer:**

- `Subject`: **nothing** until the next `next()`. Past values are lost.
- `BehaviorSubject`: immediately the **current value** (the initial one if nothing has been emitted). After `complete()`, a new subscriber gets only the completion.
- `ReplaySubject(n)`: the last `n` values, and no initial value.

This is why a `BehaviorSubject` works with `toSignal(..., { requireSync: true })` and a `Subject` doesn't.

Sources: [RxJS Subjects](https://rxjs.dev/guide/subject) · [BehaviorSubject](https://rxjs.dev/api/index/class/BehaviorSubject) · [toSignal](https://angular.dev/api/core/rxjs-interop/toSignal)

---

### 12. Does `switchMap` really cancel the HTTP request?

**The trap:** "No, it just ignores the old response", or "Yes, always, for any Observable."

**The strong answer:** `switchMap` **unsubscribes** from the previous inner Observable. For `HttpClient`, *"unsubscribing will
abort the in-progress request"*, so the request really is cancelled in the browser (it shows as cancelled in DevTools).
The server may still have processed it, though, so this isn't a substitute for idempotency. For a non-cancellable source,
like a Promise wrapped with `from()`, the work continues and only the result is dropped.
Use `exhaustMap` for "ignore new clicks while saving" and `concatMap` for ordered writes.

Sources: [Making requests](https://angular.dev/guide/http/making-requests) · [switchMap](https://rxjs.dev/api/operators/switchMap)

---

### 13. I use `obs$ | async` twice in the template. How many HTTP calls?

**The trap:** "One, it's the same Observable."

**The strong answer:** **Two.** `HttpClient` Observables are cold, and *"subscribing to the same Observable multiple times will trigger
multiple backend requests"*. Fixes:

- `@if (obs$ | async; as data)` once, then use `data`;
- `shareReplay({ bufferSize: 1, refCount: true })`;
- `toSignal()` once in the class;
- `httpResource`.

Sources: [Making requests](https://angular.dev/guide/http/making-requests) · [shareReplay](https://rxjs.dev/api/operators/shareReplay)

---

### 14. Do I need to unsubscribe from `http.get()`?

**The trap:** "Always, otherwise it leaks", or "Never."

**The strong answer:** It doesn't **leak**, because the Observable completes after the response. But unsubscribing (via `async`, `toSignal` or
`takeUntilDestroyed`) still **cancels the request** if the component is destroyed first, and prevents the callback from
running against a destroyed component. Long-lived streams (`interval`, `valueChanges`, store selectors) **must** be cleaned up.

Sources: [Making requests](https://angular.dev/guide/http/making-requests) · [takeUntilDestroyed](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)

---

### 15. My pure pipe doesn't update after `items.push(x)`. Why?

**The trap:** "It's a bug, so make the pipe impure."

**The strong answer:** A pure pipe re-runs only when an argument changes **by reference** (or primitive value). `push` mutates the
same array, so the pipe returns its cached result. The fix is an **immutable update** (`items = [...items, x]`, or
`signal.update(list => [...list, x])`). `pure: false` works but runs on every change detection, so it is the last resort.

Source: [Pipes](https://angular.dev/guide/templates/pipes)

---

### 16. A `providedIn: 'root'` service used only in a lazy route: how many instances?

**The trap:** "One per lazy module", or "it gets bundled into main."

**The strong answer:** **One app-wide singleton**, registered in the root injector, even if the first injection happens in lazy code.
Thanks to tree-shaking, its code can still end up in the lazy chunk if only that chunk uses it. You get a **separate**
instance only if you also list the class in that route's `providers` (or in a lazily loaded NgModule's `providers`, in legacy apps),
which creates a child environment injector.

Sources: [Hierarchical injectors](https://angular.dev/guide/di/hierarchical-dependency-injection) · [Creating and using services](https://angular.dev/guide/di/creating-and-using-services)

> ⚠️ Which chunk the code ends up in depends on the bundler's analysis. The docs confirm the tree-shaking, not the exact chunk placement.

---

### 17. The same service is provided in two places. Which instance do I get?

**The trap:** "Angular throws a duplicate provider error", or "always the root one."

**The strong answer:** **The nearest one** up the injector tree from where you inject. Resolution walks the element injectors
(component/directive `providers`) and then the environment injectors (route → root → platform). So there are **two
instances**, and a component under the scoped provider never sees the root one, unless you use `inject(X, { skipSelf: true })`.
`viewProviders` are visible to the view but **not** to projected content.
If the same token is registered twice in **one** injector, the last registration wins (or the values are collected with `multi: true`).

Source: [Hierarchical injectors](https://angular.dev/guide/di/hierarchical-dependency-injection)

---

### 18. Why is `track` mandatory in `@for`? Is `track $index` fine?

**The trap:** "It's just for performance, so `$index` is always fine."

**The strong answer:** `track` gives each item an **identity**, so Angular can move, insert and remove DOM nodes instead of
recreating them. That keeps **component state, focus, input values and animations** attached to the right item.
`track $index` is fine only for **static** lists. With reordering, insertion or deletion, state sticks to the position instead of the item.
`track item` (object identity) on data that is refetched recreates the whole list (warning **NG0956**).
Best: `track item.id`. Duplicate keys raise **NG0955**.

Sources: [Control flow](https://angular.dev/guide/templates/control-flow) · [NG0956](https://angular.dev/errors/NG0956) · [NG0955](https://angular.dev/errors/NG0955)

---

### 19. `effect` vs `computed`: can I set a signal inside an effect?

**The trap:** "No, it throws", or "Yes, it's the normal way to sync state."

**The strong answer:** It's **allowed**: since v19, `allowSignalWrites` is a no-op and writes are permitted by default. But it is
**discouraged** for propagating state. The docs say to *"avoid using effects for propagation of state changes"*, because it can cause
NG0100, infinite loops and extra change detection cycles. Use `computed` for derived values and `linkedSignal` for
"derived but overridable". Effects are for **side effects**: logging, storage, DOM, non-signal APIs.

Sources: [Effects guide](https://angular.dev/guide/signals/effect) · [v19 changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#1900-2024-11-19)

---

### 20. Does a `computed` run if nobody reads it?

**The trap:** "Yes, whenever its dependencies change."

**The strong answer:** No. Computed signals are *"both lazily evaluated and memoized"*. The function runs on the first read,
then again only when a dependency changed **and** someone reads it. An `effect` is eager: it is scheduled whenever its dependencies change.

Source: [Signals guide](https://angular.dev/guide/signals)

---

### 21. `count.set(count())`: does it notify consumers?

**The trap:** "Yes, `set` always notifies."

**The strong answer:** No. By default signals compare values with `Object.is`, so setting an equal value is a no-op.
The flip side: `items.update(a => { a.push(x); return a; })` returns the **same reference**, so nothing updates. Return a new array instead,
or provide a custom `equal` function.

Source: [Signals guide](https://angular.dev/guide/signals)

---

### 22. Can a component write to its own `input()`?

**The trap:** "Yes, `this.value.set(…)`."

**The strong answer:** No. `InputSignal` is **read-only**, because inputs are owned by the parent. Options:

- `model()` if the value should flow back to the parent (two-way binding);
- `linkedSignal(() => this.value())` for a local, overridable copy that resets when the input changes;
- `computed` for a derived value.

Sources: [Inputs](https://angular.dev/guide/components/inputs) · [model](https://angular.dev/api/core/model) · [linkedSignal](https://angular.dev/guide/signals/linked-signal)

---

### 23. Does everything inside `@defer` get lazy-loaded?

**The trap:** "Yes, the whole block is a separate chunk."

**The strong answer:** Only dependencies that are **standalone** and **not referenced outside the `@defer` block in the same file**
(including `viewChild` queries) are deferred. Everything else is loaded eagerly. The dependencies of `@placeholder`, `@loading` and `@error` blocks are
**eager**. Bonus: while HMR is active in dev, all `@defer` chunks are fetched eagerly, so test triggers with `--no-hmr`.

Source: [Deferred loading with @defer](https://angular.dev/guide/templates/defer)

---

### 24. Do I need `provideHttpClient()` to inject `HttpClient`?

**The trap:** "Yes, otherwise `NullInjectorError`", which was true for years.

**The strong answer:** Not since v21: *"HttpClient is available for injection by default in Angular v21 and later."*
`provideHttpClient(...)` is now only needed to **configure** it: `withInterceptors`, `withXhr`, XSRF options… Also, since v22 the default
backend is **fetch**. `withFetch()` is deprecated, and `withXhr()` restores XMLHttpRequest, for example for upload progress.

Sources: [Setting up HttpClient](https://angular.dev/guide/http/setup) · [withFetch](https://angular.dev/api/common/http/withFetch) · [v22 changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2200-2026-06-03)

---

### 25. Are class-based guards deprecated?

**The trap:** "Yes, you must use functional guards."

**The strong answer:** Functional guards (`CanActivateFn`, `CanMatchFn`…) are the **recommended** style, and the docs use them.
But in Angular 22's typings the `CanActivate` interface carries **no `@deprecated` tag**, so class guards still work.
Know both: legacy code is full of `implements CanActivate`.

Sources: [Route guards](https://angular.dev/guide/routing/route-guards) · [CanActivate](https://angular.dev/api/router/CanActivate)

> ⚠️ Not re-verified with an official source: class guards were briefly marked deprecated around v15.2, and that deprecation was later reverted.
> What is verified is the current state: no `@deprecated` tag in the v22.2 typings (`node_modules/@angular/router/types`).

---

### 26. Does `ngOnDestroy` run when the user closes the tab?

**The trap:** "Yes, it always runs."

**The strong answer:** Don't count on it. `ngOnDestroy` runs when **Angular** destroys the view or injector (navigation, `@if`,
`appRef.destroy()`). Closing or reloading the tab just tears down the page, and Angular doesn't run its destroy logic.
For "save before leaving", use the browser's `pagehide`/`visibilitychange`/`beforeunload` events, or a `canDeactivate` guard for in-app navigation.

> ⚠️ Not stated explicitly in the Angular docs. This follows from how browsers unload pages.

Source: [Lifecycle guide](https://angular.dev/guide/components/lifecycle) · [CanDeactivateFn](https://angular.dev/api/router/CanDeactivateFn)

---

### 27. Is a route-level `providers` service destroyed when I navigate away?

**The trap:** "Yes, like a component-level provider."

**The strong answer:** **Not by default.** Route `providers` live in an `EnvironmentInjector` created for that route, and it is kept
after you leave. Since **22.2**, `provideRouter(routes, withAutoCleanupInjectors())` makes the router destroy
injectors of routes that are no longer active (or stored by the `RouteReuseStrategy`), which runs their services' `ngOnDestroy` / `DestroyRef` callbacks.
If you need "destroyed when the page goes away" semantics without that feature, provide the service in the routed **component's** `providers`.

Sources: [withAutoCleanupInjectors](https://angular.dev/api/router/withAutoCleanupInjectors) · [RouteReuseStrategy](https://angular.dev/api/router/RouteReuseStrategy) · [v22.2 changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2220-2026-09-23)

---

### 28. `ngIf` is deprecated. Does my app break?

**The trap:** "Yes, it was removed", or "No, it's still the recommended way."

**The strong answer:** `NgIf`, `NgFor`/`NgForOf` and `NgSwitch` have been **deprecated since v20** in favor of `@if`/`@for`/`@switch`, and
the docs say *"intent to remove in a future major release"*. They still work in v22. Migrate with
`ng generate @angular/core:control-flow`. Interviewers like to ask the difference: structural directives with a
`*` desugar into `<ng-template>`, while control flow blocks are compiled into the template directly, with no import, better type narrowing and a mandatory `track`.

Sources: [NgIf](https://angular.dev/api/common/NgIf) · [Control flow migration](https://angular.dev/reference/migrations/control-flow) · [v20 changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2000-2025-05-28)

## 📚 References

All links above. Main pages:
https://angular.dev/guide/components/lifecycle ·
https://angular.dev/guide/di/hierarchical-dependency-injection ·
https://angular.dev/best-practices/skipping-subtrees ·
https://angular.dev/guide/zoneless ·
https://angular.dev/guide/http/making-requests ·
https://angular.dev/guide/signals ·
https://rxjs.dev/guide/subject
