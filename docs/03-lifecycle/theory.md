# 03 · Lifecycle hooks

A component's lifecycle is the sequence of steps between its creation and its destruction. Angular lets you
run code at each step through **lifecycle hook methods** (`ngOnInit`, …) and **render callbacks**
(`afterNextRender`, `afterEveryRender`). This is one of the most asked topics in Angular interviews: know the
**order**, **what is available** at each step, and **how hooks interact with change detection**
(OnPush is the default since v22, apps are zoneless by default since v21).

Demo: [`src/app/modules/03-lifecycle/`](../../src/app/modules/03-lifecycle/) — and an executable proof of
every ordering claim below: [`lifecycle.spec.ts`](../../src/app/modules/03-lifecycle/lifecycle.spec.ts)
(`npx ng test --include 'src/app/modules/03-lifecycle/**/*.spec.ts'`).

## Table of contents

1. [The big picture](#1-the-big-picture)
2. [Order table](#2-order-table)
3. [Hook by hook](#3-hook-by-hook)
4. [What is available where?](#4-what-is-available-where)
5. [ngOnChanges in depth (and signal inputs)](#5-ngonchanges-in-depth-and-signal-inputs)
6. [AfterView hooks vs afterNextRender / afterEveryRender](#6-afterview-hooks-vs-afternextrender--aftereveryrender)
7. [ngOnDestroy vs DestroyRef](#7-ngondestroy-vs-destroyref)
8. [Hooks, OnPush and zoneless](#8-hooks-onpush-and-zoneless)
9. [Directives: same hooks](#9-directives-same-hooks)
10. [Lifecycle of a service](#10-lifecycle-of-a-service)
11. [Logging from hooks without infinite loops (how the demo works)](#11-logging-from-hooks-without-infinite-loops-how-the-demo-works)
12. [🎯 Likely interview questions](#-likely-interview-questions)
13. [📚 References](#-references)

---

## 1. The big picture

Angular walks the component tree **top to bottom**, checking template bindings; lifecycle hooks run during
this traversal, and the traversal visits each component exactly once, so you should avoid making further state
changes in the middle of it ([docs](https://angular.dev/guide/components/lifecycle)).

The official summary groups them in phases ([docs](https://angular.dev/guide/components/lifecycle#summary)):

| Phase | Method | Summary (official wording, abridged) |
| --- | --- | --- |
| Creation | `constructor` | Standard JS constructor. Runs when Angular instantiates the component. |
| Change detection | `ngOnInit` | Once, after Angular has initialized all the component's inputs. |
| | `ngOnChanges` | Every time the component's inputs have changed. |
| | `ngDoCheck` | Every time this component is checked for changes. |
| | `ngAfterContentInit` | Once, after the component's content has been initialized. |
| | `ngAfterContentChecked` | Every time the content has been checked for changes. |
| | `ngAfterViewInit` | Once, after the component's view has been initialized. |
| | `ngAfterViewChecked` | Every time the component's view has been checked for changes. |
| Rendering | `afterNextRender` | Once, the next time **all** components have been rendered to the DOM. |
| | `afterEveryRender` | Every time all components have been rendered to the DOM. |
| Destruction | `ngOnDestroy` | Once, before the component is destroyed. |

Hook **methods** are tied to one instance. Render callbacks are **functions** registered from an injection
context (usually the constructor) and are **application-wide**: they run after the whole app rendered, not
after "this" component ([docs](https://angular.dev/guide/components/lifecycle#aftereveryrender-and-afternextrender)).

Each method has an optional TypeScript interface with the same name minus `ng` (`OnInit`, `AfterViewInit`…).
Implementing them is optional but catches typos
([docs](https://angular.dev/guide/components/lifecycle#lifecycle-interfaces)).

> 💡 **Interview tip:** "The constructor is not a lifecycle hook." It is plain JavaScript, called by the
> injector. Angular has not bound any input yet. Use it (or field initializers) for `inject()`, signals,
> `effect()`, `afterNextRender()` registration — not for logic that depends on inputs.

## 2. Order table

### First check (creation)

Verified by [`lifecycle.spec.ts`](../../src/app/modules/03-lifecycle/lifecycle.spec.ts), test
_"calls component hooks in the documented order on creation"_, consistent with the official diagram
([docs](https://angular.dev/guide/components/lifecycle#during-initialization)):

| # | Hook | Runs | Notes |
| --- | --- | --- | --- |
| 1 | `constructor` | once | inputs hold their **default** values |
| 2 | `ngOnChanges` | if ≥1 input is bound | first call has `firstChange: true`; **before** `ngOnInit` |
| 3 | `ngOnInit` | once | inputs are set |
| 4 | `ngDoCheck` | every check | first one right after `ngOnInit` |
| 5 | `ngAfterContentInit` | once | content queries resolved |
| 6 | `ngAfterContentChecked` | every check | |
| 7 | `ngAfterViewInit` | once | view queries resolved, child components initialized |
| 8 | `ngAfterViewChecked` | every check | |
| 9 | `afterNextRender` phases | once | after the **whole app** rendered, browser only |
| 10 | `afterEveryRender` phases | every render | after the **whole app** rendered, browser only |

> ⚠️ **Pitfall:** `ngOnChanges` is called only if the component has at least one input set from a template
> binding. A component with no bound inputs starts directly with `ngOnInit`
> ([docs](https://angular.dev/guide/components/lifecycle#ngonchanges): "During initialization, the first
> ngOnChanges runs before ngOnInit").

### Subsequent checks

`ngOnChanges` (only if a bound input changed) → `ngDoCheck` → `ngAfterContentChecked` → `ngAfterViewChecked`
→ `afterEveryRender` ([docs](https://angular.dev/guide/components/lifecycle#subsequent-updates)).

### Render-callback phases

Both `afterNextRender` and `afterEveryRender` accept either a single callback (runs in the `mixedReadWrite`
phase) or an object with phases, executed in this order: **`earlyRead` → `write` → `mixedReadWrite` → `read`**.
Each phase receives the return value of the previous phase of the same spec
([docs](https://angular.dev/guide/components/lifecycle#afterrender-phases),
[API](https://angular.dev/api/core/afterNextRender)).
The ordering is **phase-major across all registered callbacks**: every `earlyRead` callback of the app runs, then
every `write`, and so on ("Callbacks in the same phase run in the order they are registered" —
[API](https://angular.dev/api/core/afterNextRender)). The spec shows `afterNextRender › earlyRead`,
`afterEveryRender › earlyRead`, `afterNextRender › write`, `afterEveryRender › write`, …

Why phases? To avoid **layout thrashing**: group DOM writes before DOM reads instead of interleaving them.
Prefer `write` and `read`; `earlyRead` and `mixedReadWrite` are the "avoid if possible" phases.

### Parent / child ordering

The traversal is top-down. For a parent `P` whose template contains a child `C`, the spec
(_"interleaves parent and child hooks top-down"_) observes:

```
P.ngOnInit → P.ngAfterContentInit → C.ngOnInit → C.ngAfterContentInit → C.ngAfterViewInit → P.ngAfterViewInit
```

The parent's content is ready before its view is processed; the parent's **view** is only "initialized" once
all its children's views are, so `P.ngAfterViewInit` comes **last**.

> ⚠️ Not confirmed by official docs / opinion: angular.dev documents the per-component order and the top-down
> traversal but gives no explicit parent/child interleaving table. The sequence above is observed (Angular 22.2);
> don't build logic on fine-grained cross-component ordering.

When a component and directives sit on the same element, Angular does **not** guarantee the relative order of
the same hook between them ([docs](https://angular.dev/guide/components/lifecycle#ordering-with-directives)).

## 3. Hook by hook

### `ngOnChanges(changes: SimpleChanges)`
Runs after any **bound** input changed, before the template is checked. `SimpleChanges` maps each input
(class property name, **not** alias) to `{ previousValue, currentValue, firstChange }`. You can pass
the class as generic for typed access: `SimpleChanges<UserProfile>`
([docs](https://angular.dev/guide/components/lifecycle#inspecting-changes)). More in [§5](#5-ngonchanges-in-depth-and-signal-inputs).

### `ngOnInit()`
Runs once, after Angular has set the initial input values, **before** the component's own template is
initialized ([docs](https://angular.dev/guide/components/lifecycle#ngoninit)). Classic place for logic that
depends on inputs (e.g. kick off a load with an `id` input). Inputs are guaranteed to be available from
`ngOnInit` onwards ([NG0950](https://angular.dev/errors/NG0950)).

### `ngDoCheck()`
Runs **before every check of the component's template** — very often. Meant for custom change detection
that Angular cannot see (e.g. deep-diffing a mutated object). The docs say to avoid defining it whenever
possible because of its performance cost ([docs](https://angular.dev/guide/components/lifecycle#ngdocheck)).

> 💡 **Interview tip:** "Why is `ngDoCheck` expensive?" It runs on every change detection pass that reaches
> the parent — even for an OnPush child that ends up being skipped (see [§8](#8-hooks-onpush-and-zoneless)) —
> so any work there multiplies by the number of CD runs. Signals/`computed` make it almost never necessary.

### `ngAfterContentInit()` / `ngAfterContentChecked()`
"Content" = what the **parent** projects between the component tags (`<ng-content>`). `ngAfterContentInit`
runs once when that content is initialized: read **content query** results here
(`contentChild()`, `@ContentChild`). `ngAfterContentChecked` runs after every check of that content
([docs](https://angular.dev/guide/components/lifecycle#ngaftercontentinit)).

### `ngAfterViewInit()` / `ngAfterViewChecked()`
"View" = the component's **own template** and its child components. `ngAfterViewInit` runs once when the view
(and children) is initialized: the classic place to read **view query** results
([docs](https://angular.dev/guide/components/lifecycle#ngafterviewinit)).

> ⚠️ **Pitfall:** in `ngAfterContent*` and `ngAfterView*`, avoid changing **non-signal** state that an
> ancestor's (or this) template already rendered: it causes `ExpressionChangedAfterItHasBeenCheckedError`
> (NG0100) in dev mode ([docs](https://angular.dev/guide/components/lifecycle#ngafterviewinit),
> [NG0100](https://angular.dev/errors/NG0100)). The NG0100 page suggests moving initial values to the
> constructor/`ngOnInit`.

### `ngOnDestroy()`
Runs once just before destruction — e.g. when `@if` removes the component or on navigation
([docs](https://angular.dev/guide/components/lifecycle#ngondestroy)). Unsubscribe, clear timers, detach
listeners. See [§7](#7-ngondestroy-vs-destroyref).

### `afterNextRender()` / `afterEveryRender()`
Functions, not methods; must be called in an **injection context** (constructor/field initializer) or with an
`injector` option. They return an `AfterRenderRef` (`.destroy()`), and are auto-cleaned when the component is
destroyed. They **never run on the server** (SSR/prerender)
([docs](https://angular.dev/guide/components/lifecycle#aftereveryrender-and-afternextrender)).
`afterRender` was renamed to `afterEveryRender`; both functions are stable since v20
([API](https://angular.dev/api/core/afterEveryRender)).

## 4. What is available where?

| | constructor | ngOnChanges (1st) | ngOnInit | ngAfterContentInit | ngAfterViewInit | afterNextRender |
| --- | --- | --- | --- | --- | --- | --- |
| `inject()` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ (callback is not an injection context) |
| Input values (bound) | ❌ default only | ✅ | ✅ | ✅ | ✅ | ✅ |
| `input.required()` read | 💥 NG0950 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `@ViewChild({static: true})` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `@ViewChild` (dynamic, default) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `@ContentChild` (dynamic) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `viewChild()` signal (non-conditional target) | ❌ `undefined` | ? | ✅ (observed) | ✅ | ✅ | ✅ |
| `contentChild()` signal (non-conditional) | ❌ | ? | ✅ (observed) | ✅ | ✅ | ✅ |
| DOM fully rendered & laid out | ❌ | ❌ | ❌ | ❌ | ⚠️ not guaranteed | ✅ |

Sources:
- `inject()` only works in an injection context: constructor, field initializers, factory functions
  ([docs](https://angular.dev/guide/di/dependency-injection-context)).
- Inputs guaranteed from `ngOnInit`; reading a required input during construction throws
  ([NG0950](https://angular.dev/errors/NG0950)).
- Decorator queries: dynamic view results "become available in the ngAfterViewInit lifecycle method", content
  results in `ngAfterContentInit`; `static: true` makes them available in `ngOnInit` and they never update
  afterwards; `static` does not exist for `@ViewChildren`/`@ContentChildren`
  ([docs](https://angular.dev/guide/components/queries#static-queries)).
- Signal queries have **no** `static` option: they are signals "that reflect the most up-to-date results"
  ([docs](https://angular.dev/guide/components/queries)). The spec observes that, for an element not inside
  `@if`/`@for`, `viewChild()` and `contentChild()` already return the element in `ngOnInit`, and `undefined`
  in the constructor.

> ⚠️ Not confirmed by official docs / opinion: angular.dev does not state when signal query results first become
> available. Observed behaviour (Angular 22.2, see spec) is "as soon as the view/content is created, i.e. from
> `ngOnInit`" for non-conditional targets. Treat them as possibly `undefined` and read them in a reactive
> context (`computed`, `effect`, template), which is the documented recommendation.

- Never touch the DOM in other hooks: "Angular does not guarantee that a component's DOM is fully rendered at
  any point other than in render callbacks" ([docs](https://angular.dev/guide/components/dom-apis)).

> 💡 **Interview tip:** "Can I use `@ViewChild` in `ngOnInit`?" — Only with `{ static: true }` and only if the
> element is not inside a conditional/loop. Otherwise wait for `ngAfterViewInit`, or use a `viewChild()` signal
> and read it in a `computed`/`effect`.

## 5. ngOnChanges in depth (and signal inputs)

**When it fires**
- When an input bound in a **template** gets a new value (compared by reference, `Object.is`-like semantics:
  mutating an object keeps the same reference → no call).
- When an input is set through `ComponentRef.setInput()` — the API "will also assure that the OnChanges
  lifecycle hook runs" ([API](https://angular.dev/api/core/ComponentRef)). Also covered by the spec.
- For **signal inputs** (`input()`, `model()`) too: the hook receives them in `SimpleChanges` (the
  `SimpleChanges<T>` type even unwraps the signal's value type). Verified in the spec
  (_"ngOnChanges fires for a SIGNAL input…"_).

**When it does NOT fire**
- When you assign the property directly from TypeScript (`child.legacyCount = 999` via a `@ViewChild`
  reference). Angular does not see it, and an OnPush child isn't refreshed either
  ([docs](https://angular.dev/best-practices/skipping-subtrees#edge-cases)). Demo button
  _"Set legacyCount directly (TS)"_ — the child keeps showing the old value.
- Signal inputs are **read-only** ([docs](https://angular.dev/guide/components/inputs)) so you can't even do
  that with `input()`.
- When the parent mutates an object passed as input (same reference).

**Signal inputs: you usually don't need ngOnChanges at all**
```ts
// Modern: derive with computed, react with effect
readonly userId = input.required<number>();
readonly title = computed(() => `User #${this.userId()}`);
constructor() {
  effect(() => console.log('userId is now', this.userId())); // side effect only
}

// Legacy syntax (still supported)
@Input() userId!: number;
ngOnChanges(changes: SimpleChanges) {
  if (changes['userId']) this.title = `User #${changes['userId'].currentValue}`;
}
```
The inputs guide shows the `computed` pattern for derived values
([docs](https://angular.dev/guide/components/inputs)); effects are for side effects only
([docs](https://angular.dev/guide/signals/effect#use-cases-for-effects)).

> 💡 **Interview tip:** "Does `ngOnChanges` work with signal inputs?" — Yes, it is still called, but idiomatic code
> uses `computed()` (derived state), `linkedSignal()` (derived but overridable) or `effect()` (side effects),
> and gets the previous value with `linkedSignal`'s `previous` if needed.

## 6. AfterView hooks vs afterNextRender / afterEveryRender

| | `ngAfterViewInit` / `ngAfterViewChecked` | `afterNextRender` / `afterEveryRender` |
| --- | --- | --- |
| Kind | instance method | function registered in injection context |
| Scope | this component's view checked | **whole app** rendered to the DOM |
| Runs on server (SSR)? | yes | **no** — browser only |
| DOM guaranteed rendered? | no | yes |
| Phases for read/write batching | no | yes (`earlyRead`, `write`, `mixedReadWrite`, `read`) |
| Typical use | read view query results | init a 3rd-party DOM lib, measure, focus, canvas |

Sources: [lifecycle guide](https://angular.dev/guide/components/lifecycle#aftereveryrender-and-afternextrender),
[DOM APIs guide](https://angular.dev/guide/components/dom-apis).

```ts
constructor() {
  const el = inject(ElementRef).nativeElement as HTMLElement;
  // SSR-safe: never runs on the server, so `window`/layout APIs are fine here.
  afterNextRender({
    write: () => { el.style.minHeight = '100px'; },
    read: () => console.log(el.getBoundingClientRect().height),
  });
}
```

> ⚠️ **Pitfall:** `afterEveryRender` runs after **every** application render, even when the component that
> registered it was not refreshed (spec: _"afterEveryRender runs after ANY app render…"_). Keep it cheap, and
> never write a signal from it unconditionally (it would schedule a new render → loop).

> 💡 **Interview tip:** For DOM work that should re-run when **signals** change, use `afterRenderEffect()`:
> like `effect` but runs after rendering, with the same phases
> ([docs](https://angular.dev/guide/signals/effect#side-effects-on-dom-elements)). Also prefer
> `ResizeObserver`/`MutationObserver`/`IntersectionObserver` when they fit.

Hydration caveat: "Components are not guaranteed to be hydrated before the callback runs"
([API](https://angular.dev/api/core/afterNextRender)).

## 7. ngOnDestroy vs DestroyRef

```ts
// Modern: keep cleanup next to setup, usable from ANY injection context (functions, services, directives)
constructor() {
  const id = setInterval(() => this.tick(), 1000);
  inject(DestroyRef).onDestroy(() => clearInterval(id));
}
// RxJS: obs$.pipe(takeUntilDestroyed()).subscribe(...)   // uses DestroyRef under the hood
```

- `DestroyRef.onDestroy(cb)` registers a callback and **returns an unregister function**; `destroyRef.destroyed`
  tells whether the scope is already destroyed (avoid `NG0911: View has already been destroyed`)
  ([API](https://angular.dev/api/core/DestroyRef), [docs](https://angular.dev/guide/components/lifecycle#destroyref)).
- Scope depends on where it's injected: component/directive → that instance; otherwise the corresponding
  **injector** (e.g. root = app) ([API](https://angular.dev/api/core/DestroyRef)).
- Advantages: composable (pass it to helper functions), no need to implement an interface, setup and teardown
  co-located. `takeUntilDestroyed()` builds on it
  ([API](https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed)).
- Effects, `afterNextRender`/`afterEveryRender`, `toSignal` subscriptions created in a component are cleaned up
  automatically with it.

**Order:** the spec observes `ngOnDestroy` **before** the `DestroyRef` callbacks, for components, directives and
services.

> ⚠️ Not confirmed by official docs / opinion: the relative order of `ngOnDestroy` and `DestroyRef` callbacks is
> not documented. Do not depend on it.

## 8. Hooks, OnPush and zoneless

Angular 22 defaults: **OnPush** for every component that doesn't say `ChangeDetectionStrategy.Eager`
([docs](https://angular.dev/best-practices/skipping-subtrees#using-onpush)), and **zoneless** (no zone.js)
since v21 ([docs](https://angular.dev/guide/zoneless#enabling-zoneless-in-an-application)). Consequences:

1. **What schedules a check at all?** Without zone.js, `setTimeout`/`fetch`/promises no longer trigger change
   detection. Notifications are: `markForCheck()` (also called by `AsyncPipe`), `ComponentRef.setInput`,
   updating a signal read in a template, bound host/template listener callbacks, attaching a view marked dirty
   ([docs](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility)). So hooks only run when
   one of these happened. In the demo, _"Event that changes nothing"_ still produces a full round of
   `ngDoCheck` + Checked hooks: the template listener alone is a notification.
2. **OnPush child, parent checked:** the child's `ngDoCheck`, `ngAfterContentChecked` and `ngAfterViewChecked`
   still run (they are invoked as part of the **parent's** check), but its template is **not** re-rendered
   unless it is dirty (new input reference, event inside it, signal it reads changed, `markForCheck`). Verified
   in the spec (_"setting an input property directly… OnPush child stays stale"_).

   > ⚠️ Not confirmed by official docs / opinion: angular.dev doesn't spell this out explicitly; it is observed
   > behaviour (spec) and the classic reason `ngDoCheck` can be used to call `markForCheck()` manually.
3. **Signal-only updates are targeted:** when only a signal read by component X changes, Angular refreshes X
   without re-running its ancestors' templates (and thus without calling their/siblings' hooks). The
   demo depends on that (see [§11](#11-logging-from-hooks-without-infinite-loops-how-the-demo-works)).
4. **`ngDoCheck` is no longer a "free" CD trigger:** in zoneless, mutating a field in `ngDoCheck` does not
   schedule anything; use signals or `markForCheck()`.
5. **NgZone.onStable / onMicrotaskEmpty never emit** in zoneless; replace "wait for render" patterns with
   `afterNextRender` / `afterEveryRender` ([docs](https://angular.dev/guide/zoneless#remove-ngzoneonmicrotaskempty-ngzoneonunstable-ngzoneisstable-or-ngzoneonstable)).

More in [10 · Change detection](../10-change-detection/theory.md).

## 9. Directives: same hooks

A component **is** a directive with a template, so directives get the same hooks: `ngOnChanges`, `ngOnInit`,
`ngDoCheck`, `ngAfterContentInit/Checked`, `ngAfterViewInit/Checked`, `ngOnDestroy`, plus `DestroyRef` and render
callbacks. The `OnDestroy` API explicitly lists "directive, pipe, or service"
([API](https://angular.dev/api/core/OnDestroy)). The spec verifies a directive receives all of them, in the
same order (_"a directive gets the same hooks (including the view hooks)"_); demo:
[`hook-spy.ts`](../../src/app/modules/03-lifecycle/directive-hooks/hook-spy.ts).

**Pipes**: a pipe instance can implement `ngOnDestroy` (e.g. `AsyncPipe` unsubscribes there)
([API](https://angular.dev/api/core/OnDestroy)).

## 10. Lifecycle of a service

### Only one hook: `ngOnDestroy`
Services do **not** get `ngOnInit`, `ngOnChanges`, `ngDoCheck`, `ngAfterView*`… Even if you write those
methods, Angular never calls them. The only hook is `ngOnDestroy` ("invoked immediately before a directive,
pipe, or service instance is destroyed" — [API](https://angular.dev/api/core/OnDestroy)). `inject(DestroyRef)`
also works in a service. Demo: [`scoped-service.ts`](../../src/app/modules/03-lifecycle/service-hooks/scoped-service.ts)
(spec: _"a service never gets ngOnInit / ngDoCheck / ngAfterViewInit"_).

### The constructor is not a hook
It runs when the injector **first** creates the instance — lazily, on the first `inject()` of that token in that
injector (not at bootstrap, unless something injects it).

### Initialization patterns
| Need | Pattern |
| --- | --- |
| Simple setup | constructor / field initializers with `inject()` |
| Block app start until async work is done (load config, auth) | `provideAppInitializer(() => …)` — runs in an injection context; if it returns a Promise/Observable, bootstrap waits ([API](https://angular.dev/api/core/provideAppInitializer)). Replaces the deprecated `APP_INITIALIZER` token. |
| Run code when an environment injector is created (app or lazy route), e.g. eagerly instantiate a service | `provideEnvironmentInitializer(() => inject(MyService))` ([API](https://angular.dev/api/core/provideEnvironmentInitializer)). Replaces the deprecated `ENVIRONMENT_INITIALIZER`. |
| Lazy async state | expose a `resource()` / signal from the service instead of an "init" method |

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(ConfigService).load()), // returns a Promise
    provideEnvironmentInitializer(() => inject(AnalyticsService)), // force eager creation
  ],
};
```

### When is a service destroyed?
| Where it is provided | Instance lives… | Destroyed when |
| --- | --- | --- |
| `providedIn: 'root'` / `@Service()` / `ApplicationConfig.providers` | singleton in the root environment injector | the **application** is destroyed (`ApplicationRef.destroy()`) — i.e. practically never in a SPA |
| `@Component({ providers })` / `viewProviders` / directive `providers` | one per component instance (`ElementInjector`) | **with that component** ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection), [docs](https://angular.dev/guide/di/defining-dependency-providers)) |
| Route `providers: [...]` | in the route's child **environment injector** | **not** when you navigate away by default; only if the router is configured with `withAutoCleanupInjectors()` (public API 22.2) and the `RouteReuseStrategy.shouldDestroyInjector()` returns `true` ([API](https://angular.dev/api/router/withAutoCleanupInjectors)) |
| `createEnvironmentInjector(...)` | that injector | when you call `injector.destroy()` ([API](https://angular.dev/api/core/EnvironmentInjector)) |

Sources for the component case: "When the component instance is destroyed, so is that service instance"
([docs](https://angular.dev/guide/di/hierarchical-dependency-injection)).
`@Service()` is the new (v22) shorthand for `@Injectable({ providedIn: 'root' })`, `autoProvided: false` to
provide it manually ([docs](https://angular.dev/guide/di/creating-and-using-services), [API](https://angular.dev/api/core/Service)).

> 💡 **Interview tip:** "My route-level service keeps its state after leaving the route, why?" — Route injectors
> are kept by default (lazy route configs and their injectors are cached). In 22.2 you can opt in to destroying
> unused ones with `provideRouter(routes, withAutoCleanupInjectors())`. The default `BaseRouteReuseStrategy`
> returns `true` from `shouldDestroyInjector` (checked in `@angular/router` sources).

> ⚠️ Not confirmed by official docs / opinion: "kept forever by default" is inferred from the
> `withAutoCleanupInjectors` description ("Enables automatic destruction… This feature is opt-in") and the
> router source code, not from an explicit guide sentence.

Effects created in a root service are "root effects" and are destroyed with the application; effects created
in a component-provided service are "view effects" destroyed with the component
([docs](https://angular.dev/guide/signals/effect#destroying-effects)).

## 11. Logging from hooks without infinite loops (how the demo works)

What happens when you write state from a hook? Verified in the "pitfalls" block of
[`lifecycle.spec.ts`](../../src/app/modules/03-lifecycle/lifecycle.spec.ts) (Angular 22.2, zoneless):

| Scenario | Result |
| --- | --- |
| Child `ngAfterViewChecked` writes a **signal read by the parent's template** | 💥 `NG0103: Infinite change detection` — the parent is re-checked, which re-runs the child's hook, which writes again… |
| `afterEveryRender` writes a signal read in any template | 💥 `NG0103` — every render triggers another render |
| Child `ngAfterViewInit` mutates a **plain field** the parent already rendered | 💥 `NG0100: ExpressionChangedAfterItHasBeenChecked` (dev mode) |
| Component writes a signal read by **its own** template in its `ngAfterViewChecked` | ✅ its view is re-rendered once, no loop (its view hooks are invoked by the **parent's** check, which isn't repeated) |

> ⚠️ Not confirmed by official docs / opinion: the last row's explanation is inferred from the observed behaviour and
> from the fact that signal-driven refreshes are targeted; the docs only say to avoid state changes during the
> traversal ([docs](https://angular.dev/guide/components/lifecycle)).

So the demo needs a design that is safe whatever the tree looks like. Its
[`HookTrace`](../../src/app/modules/03-lifecycle/hook-trace/hook-trace.ts):
1. Hooks call `trace.record()`, which pushes to a **plain array** (no signal → no notification, no NG0100 since
   no template reads it).
2. A user action calls `trace.begin(label)` to open a 150 ms **recording window**; outside it, `record()` is a
   no-op.
3. When the window closes (a `setTimeout`, i.e. outside change detection), the buffer is **flushed** into an
   `EventLog` signal.
4. Only [`HookTraceView`](../../src/app/modules/03-lifecycle/hook-trace/hook-trace-view.ts) reads that signal,
   so the flush refreshes only that component — the observed parent/child are not re-checked, and the hooks that
   still fire (`afterEveryRender` runs after *every* render) are outside the window → ignored.

`EventLog.addDeferred()` (a `queueMicrotask` write) moves the write out of the current check, which avoids NG0100,
but a write from an "every check" hook still schedules another check, which calls the hook again: fine from
once-only hooks (`ngOnInit`, `ngAfterViewInit`, `ngOnDestroy`), not from `ngDoCheck`/`*Checked`/`afterEveryRender`.

---

## 🎯 Likely interview questions

1. **Give the order of lifecycle hooks on creation.**
   <details><summary>Answer</summary>constructor → ngOnChanges (if bound inputs) → ngOnInit → ngDoCheck → ngAfterContentInit → ngAfterContentChecked → ngAfterViewInit → ngAfterViewChecked → afterNextRender/afterEveryRender. (<a href="https://angular.dev/guide/components/lifecycle#execution-order">docs</a>)</details>
2. **Why not put input-dependent logic in the constructor?**
   <details><summary>Answer</summary>Inputs are not set yet (default value; required inputs throw NG0950). Use ngOnInit, or better a computed/effect reading the signal input. (<a href="https://angular.dev/errors/NG0950">docs</a>)</details>
3. **When is ngOnChanges NOT called?**
   <details><summary>Answer</summary>When no input is bound, when the property is set directly in TS, or when an object input is mutated (same reference). It IS called for template bindings and ComponentRef.setInput. (<a href="https://angular.dev/api/core/ComponentRef">docs</a>)</details>
4. **Can you read a @ViewChild in ngOnInit?**
   <details><summary>Answer</summary>Only with <code>{static: true}</code> for a non-conditional element; otherwise in ngAfterViewInit. Signal queries are signals: read them in computed/effect/template. (<a href="https://angular.dev/guide/components/queries#static-queries">docs</a>)</details>
5. **ngAfterViewInit vs afterNextRender?**
   <details><summary>Answer</summary>ngAfterViewInit: this component's view initialized, runs on the server too, DOM not guaranteed laid out. afterNextRender: after the whole app rendered, browser only (SSR-safe DOM access), supports read/write phases. (<a href="https://angular.dev/guide/components/dom-apis">docs</a>)</details>
6. **What hooks does a service get?**
   <details><summary>Answer</summary>Only ngOnDestroy (plus DestroyRef callbacks). Root services are destroyed with the app, component-provided ones with their component. (<a href="https://angular.dev/api/core/OnDestroy">docs</a>)</details>
7. **DestroyRef vs ngOnDestroy?**
   <details><summary>Answer</summary>Same moment, but DestroyRef is injectable anywhere in an injection context, returns an unregister function, exposes <code>destroyed</code>, and powers takeUntilDestroyed. (<a href="https://angular.dev/api/core/DestroyRef">docs</a>)</details>
8. **Why is ngDoCheck discouraged?**
   <details><summary>Answer</summary>It runs before every check of the component (very frequently), so any work there hurts performance. Signals/computed replace most uses. (<a href="https://angular.dev/guide/components/lifecycle#ngdocheck">docs</a>)</details>
9. **Why can changing state in ngAfterViewInit throw NG0100?**
   <details><summary>Answer</summary>The view was already checked; changing a non-signal value it rendered makes the dev-mode second check see a different value. Set it earlier (constructor/ngOnInit) or use signals. (<a href="https://angular.dev/errors/NG0100">docs</a>)</details>
10. **How do you run initialization before the app starts?**
    <details><summary>Answer</summary><code>provideAppInitializer(fn)</code>: runs in injection context; bootstrap waits for a returned Promise/Observable. (<a href="https://angular.dev/api/core/provideAppInitializer">docs</a>)</details>

## 📚 References

- https://angular.dev/guide/components/lifecycle
- https://angular.dev/guide/components/dom-apis
- https://angular.dev/guide/components/queries
- https://angular.dev/guide/components/inputs
- https://angular.dev/errors/NG0950
- https://angular.dev/errors/NG0100
- https://angular.dev/api/core/afterNextRender
- https://angular.dev/api/core/afterEveryRender
- https://angular.dev/api/core/DestroyRef
- https://angular.dev/api/core/OnDestroy
- https://angular.dev/api/core/ComponentRef
- https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed
- https://angular.dev/api/core/provideAppInitializer
- https://angular.dev/api/core/provideEnvironmentInitializer
- https://angular.dev/api/core/EnvironmentInjector
- https://angular.dev/api/core/Service
- https://angular.dev/api/router/withAutoCleanupInjectors
- https://angular.dev/guide/signals/effect
- https://angular.dev/guide/zoneless
- https://angular.dev/best-practices/skipping-subtrees
- https://angular.dev/guide/di/dependency-injection-context
- https://angular.dev/guide/di/hierarchical-dependency-injection
- https://angular.dev/guide/di/defining-dependency-providers
- https://angular.dev/guide/di/creating-and-using-services
