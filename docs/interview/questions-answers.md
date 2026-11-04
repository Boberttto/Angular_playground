# 🎤 Angular interview questions & answers

88 questions grouped by topic, each tagged with a level:

- 🟢 **junior**: you must know this.
- 🟡 **intermediate**: expected from someone with 2+ years of Angular.
- 🔴 **senior**: architecture, internals and trade-offs.

The answers target **Angular 22**, but interviewers still ask about legacy APIs
(NgModules, zone.js, `@Input`, `*ngIf`, class guards, `HttpClientModule`), so both are covered.
Every answer links to an official source. When something is opinion or isn't confirmed by the docs, it says so with ⚠️.

> 💡 Tip: open each `<details>` only **after** you have answered out loud.

See also: [lifecycle cheat sheet](./lifecycle-cheatsheet.md) · [trick questions](./trick-questions.md) · [what's new v17 → v22](./whats-new-angular-17-22.md)

## Table of contents

1. [TypeScript & JavaScript fundamentals](#1-typescript--javascript-fundamentals) (Q1–Q5)
2. [Basics & templates](#2-basics--templates) (Q6–Q10)
3. [Components](#3-components) (Q11–Q16)
4. [Lifecycle](#4-lifecycle) (Q17–Q21)
5. [Signals](#5-signals) (Q22–Q28)
6. [Dependency injection & services](#6-dependency-injection--services) (Q29–Q35)
7. [RxJS](#7-rxjs) (Q36–Q41)
8. [Routing](#8-routing) (Q42–Q47)
9. [Forms](#9-forms) (Q48–Q53)
10. [HTTP](#10-http) (Q54–Q58)
11. [Change detection](#11-change-detection) (Q59–Q64)
12. [Directives & pipes](#12-directives--pipes) (Q65–Q69)
13. [Advanced: @defer, SSR, dynamic components](#13-advanced-defer-ssr-dynamic-components) (Q70–Q74)
14. [Architecture & state management](#14-architecture--state-management) (Q75–Q78)
15. [Performance](#15-performance) (Q79–Q81)
16. [Testing](#16-testing) (Q82–Q85)
17. [Tooling & CLI](#17-tooling--cli) (Q86–Q88)

---

## 1. TypeScript & JavaScript fundamentals

### Q1. What is the difference between `interface` and `type` in TypeScript?
🟢 junior

<details><summary>Answer</summary>

Both describe the shape of an object. Differences that matter in practice:

- An `interface` can be **re-opened** (declaration merging) and `extends` other interfaces.
- A `type` alias can name **any** type, including unions (`'idle' | 'loading'`), tuples, mapped and conditional types.

In Angular code the convention is: `interface` for data models, `type` for unions and computed types.

Source: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
</details>

### Q2. What are generics and where does Angular use them?
🟡 intermediate

<details><summary>Answer</summary>

Generics let a function or class work with a type that the caller chooses, while keeping type safety.
Angular uses them everywhere: `signal<User | null>(null)`, `input<number>()`, `InjectionToken<Config>`,
`http.get<User[]>(url)`, `FormControl<string>`, `EventEmitter<T>`.

```ts
function first<T>(items: T[]): T | undefined { return items[0]; }
```

Note that `http.get<User[]>()` is only a **type assertion**: nothing checks the JSON at runtime.

Source: https://www.typescriptlang.org/docs/handbook/2/generics.html
</details>

### Q3. What is type narrowing? Give two examples.
🟡 intermediate

<details><summary>Answer</summary>

Narrowing means TypeScript refines a union type after a check: `typeof x === 'string'`, `x instanceof Date`,
`'kind' in x`, truthiness checks, or a **discriminated union** (`switch (state.status)`).
In Angular templates, `@if (user(); as u)` narrows to non-null, and since v22 the compiler also narrows
correctly through safe navigation (`?.`) ([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2200-2026-06-03)).

Source: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
</details>

### Q4. Explain the JavaScript event loop: microtasks vs macrotasks.
🟡 intermediate

<details><summary>Answer</summary>

JavaScript runs one task at a time. After each task (a macrotask: `setTimeout`, a DOM event, I/O…), the engine
empties the **microtask queue** (Promise callbacks, `queueMicrotask`) before taking the next task.
So `Promise.resolve().then(a)` always runs before `setTimeout(b, 0)`.

Why it matters for Angular: zone.js used to patch these async APIs to know *when* to run change detection.
Zoneless Angular schedules change detection itself instead (see Q61).

Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop
</details>

### Q5. What do `?.` and `??` do, and why is `??` safer than `||` for defaults?
🟢 junior

<details><summary>Answer</summary>

- `a?.b` returns `undefined` instead of throwing when `a` is `null`/`undefined`.
- `a ?? b` returns `b` only when `a` is `null` or `undefined`. `a || b` also replaces `0`, `''` and `false`,
  which is often a bug (`count || 10` turns a real `0` into `10`).

Angular trivia: since v22, `?.` in templates returns `undefined` like TypeScript. Before, it returned `null`
([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#2200-2026-06-03)).

Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing
</details>

---

## 2. Basics & templates

Deep dive: [01 · Basics](../01-basics/theory.md)

### Q6. What are the four kinds of data binding in Angular?
🟢 junior

<details><summary>Answer</summary>

| Syntax | Direction | Example |
|---|---|---|
| `{{ expr }}` | component → DOM (text) | `{{ user().name }}` |
| `[prop]="expr"` | component → DOM property / input | `[disabled]="busy()"` |
| `(event)="handler($event)"` | DOM / output → component | `(click)="save()"` |
| `[(prop)]="value"` | two-way ("banana in a box") | `[(ngModel)]="name"` or with `model()` |

Attributes, classes and styles have their own forms: `[attr.aria-label]`, `[class.active]`, `[style.width.px]`.

Source: https://angular.dev/guide/templates/binding
</details>

### Q7. What is the built-in control flow (`@if`, `@for`, `@switch`) and how does it differ from `*ngIf`/`*ngFor`?
🟢 junior

<details><summary>Answer</summary>

Built-in control flow (since v17) is part of the template syntax, so you don't import anything.
It has better type narrowing, an `@empty` block for `@for`, `@else if`, and it is faster.
`@for` **requires** a `track` expression.

```html
@if (user(); as u) { <p>{{ u.name }}</p> } @else { <p>Guest</p> }
@for (item of items(); track item.id) { <li>{{ item.label }}</li> } @empty { <li>No items</li> }
```

`*ngIf`, `*ngFor` and `*ngSwitch` are **structural directives** from `CommonModule`. They have been deprecated since v20
and there is an automatic migration: `ng generate @angular/core:control-flow`.

Source: https://angular.dev/guide/templates/control-flow
</details>

### Q8. Why does `@for` require `track`, and what should you track by?
🟡 intermediate

<details><summary>Answer</summary>

Angular uses `track` to match items between renders. It can then move the existing DOM nodes instead of
destroying and re-creating them, which keeps focus, component state and animations.
Track by a **stable unique id** (`track item.id`). Use `$index` only for static lists, and for primitives use `track item`.
Tracking by object identity on data that is refetched re-creates every row (warning NG0956).
Duplicate keys trigger NG0955.

Legacy equivalent: `*ngFor="let i of items; trackBy: trackById"`.

Source: https://angular.dev/guide/templates/control-flow
</details>

### Q9. What is `@let`?
🟢 junior

<details><summary>Answer</summary>

`@let` declares a read-only local variable in a template. It is re-evaluated on each change detection and is
scoped to the current view.

```html
@let total = price() * qty();
<p>Total: {{ total }}</p>
```

It was added in 18.1 and became stable in 19.0 ([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#1900-2024-11-19)).

Source: https://angular.dev/guide/templates/variables
</details>

### Q10. What is the difference between `<ng-template>`, `<ng-container>` and `<ng-content>`?
🟡 intermediate

<details><summary>Answer</summary>

- `<ng-template>`: a template **fragment** that is not rendered until someone instantiates it (`ngTemplateOutlet`, `ViewContainerRef.createEmbeddedView`, structural directives).
- `<ng-container>`: a grouping element that produces **no DOM node**. It is handy for applying a directive without an extra `<div>`.
- `<ng-content>`: a **slot** where the parent's projected content goes (content projection).

Source: https://angular.dev/guide/templates/ng-template
</details>

---

## 3. Components

Deep dive: [02 · Components](../02-components/theory.md)

### Q11. What is a standalone component? Do we still need NgModules?
🟢 junior

<details><summary>Answer</summary>

A standalone component declares its own template dependencies in `imports: [...]` instead of belonging
to an NgModule's `declarations`. Standalone has been the **default** since v19, so you no longer write `standalone: true`
([changelog](https://github.com/angular/angular/blob/main/CHANGELOG.md#1900-2024-11-19)).
The app is bootstrapped with `bootstrapApplication(App, appConfig)` and configured with `provide*()` functions.

NgModules still exist and are supported (legacy apps, some libraries). The migration is `ng generate @angular/core:standalone`.

Source: https://angular.dev/reference/migrations/standalone
</details>

### Q12. `input()` vs `@Input()`: what changes?
🟢 junior

<details><summary>Answer</summary>

`input()` (stable since v19) returns a **read-only signal** (`InputSignal`). You read it with `this.name()`.
You can derive state from it with `computed()`, mark it required with `input.required<T>()`, and add a `transform` and an `alias`.

```ts
name = input.required<string>();
size = input(16, { transform: numberAttribute });
// Legacy syntax (still supported)
@Input({ required: true }) legacyName!: string;
```

With signal inputs you usually no longer need `ngOnChanges` or setters, because a `computed` reacts on its own.

Source: https://angular.dev/guide/components/inputs
</details>

### Q13. How do you emit events from a child? `output()` vs `@Output()`.
🟢 junior

<details><summary>Answer</summary>

`output<T>()` returns an `OutputEmitterRef<T>`; call `.emit(value)`. It is **not** an RxJS Observable.
The legacy `@Output() x = new EventEmitter<T>()` extends RxJS `Subject`.
If you need one from the other, use `outputFromObservable()` / `outputToObservable()` from `@angular/core/rxjs-interop`.

```ts
saved = output<User>();
save() { this.saved.emit(this.user()); }
```

Source: https://angular.dev/guide/components/outputs
</details>

### Q14. What is `model()` and when do you use it?
🟡 intermediate

<details><summary>Answer</summary>

`model()` creates a **writable** input that also has an implicit `<name>Change` output, so the parent can
use two-way binding: `<app-rating [(value)]="score" />`. The child calls `this.value.set(4)`.
The parent can bind a writable signal or a plain property. Use it for custom form-like widgets
(toggles, pickers). For one-way data, use `input()` instead.

Source: https://angular.dev/api/core/model
</details>

### Q15. How does content projection work? Can you have several slots?
🟡 intermediate

<details><summary>Answer</summary>

`<ng-content>` projects the child elements written between the component's tags. For several slots, use
`select` with a CSS selector, for example `<ng-content select="[card-title]" />`, plus an `<ng-content />` without `select` for the rest.
Since v18 `<ng-content>` can contain **fallback content**, shown when nothing is projected.
Projected content is created by the **parent**, even when the child never displays it, so use
`<ng-template>` + `ngTemplateOutlet` if you need to render it conditionally or lazily.

Source: https://angular.dev/guide/components/content-projection
</details>

### Q16. How does view encapsulation work and what are the modes?
🟡 intermediate

<details><summary>Answer</summary>

- `ViewEncapsulation.Emulated` (default): Angular rewrites selectors with generated attributes (`_ngcontent-xxx`), so styles stay scoped to the component.
- `ShadowDom`: the browser's native Shadow DOM.
- `None`: the styles are global.

`:host` styles the host element. The docs strongly discourage new uses of `::ng-deep` and keep it only for backwards compatibility.

Source: https://angular.dev/guide/components/styling
</details>

---

## 4. Lifecycle

Deep dive: [03 · Lifecycle](../03-lifecycle/theory.md) · [cheat sheet](./lifecycle-cheatsheet.md)

### Q17. List the lifecycle hooks in order.
🟢 junior

<details><summary>Answer</summary>

`constructor` (plain JS, not a hook) → `ngOnChanges` (only if the component has inputs) → `ngOnInit` → `ngDoCheck` →
`ngAfterContentInit` → `ngAfterContentChecked` → `ngAfterViewInit` → `ngAfterViewChecked` →
render callbacks (`afterNextRender` / `afterEveryRender`) → … → `ngOnDestroy`.
On later change detection runs: `ngOnChanges` (if inputs changed) → `ngDoCheck` → `ngAfterContentChecked` → `ngAfterViewChecked` → `afterEveryRender`.

Source: https://angular.dev/guide/components/lifecycle
</details>

### Q18. Constructor vs `ngOnInit`: what goes where?
🟢 junior

<details><summary>Answer</summary>

- **Constructor / field initializers**: dependency injection (`inject()`), creating signals, `computed`, `effect`, and registering `DestroyRef` callbacks. These need an injection context.
- **`ngOnInit`**: logic that needs the **initial input values**, because inputs aren't set yet in the constructor.

With signal inputs, a `computed(() => this.id())` often replaces `ngOnInit` entirely.

Source: https://angular.dev/guide/components/lifecycle
</details>

### Q19. When are `@ViewChild` / `viewChild()` results available?
🟡 intermediate

<details><summary>Answer</summary>

- Decorator queries: from `ngAfterViewInit`. `{ static: true }` makes them available in `ngOnInit` when the element is not inside a conditional block.
- Signal queries (`viewChild()`, `contentChild()`): they are signals, so you read them in a `computed`/`effect` or after render. They return `undefined` until the element exists. `viewChild.required()` throws if it is read too early.

Content queries (`@ContentChild`) are available from `ngAfterContentInit`.

Source: https://angular.dev/guide/components/queries
</details>

### Q20. What are `afterNextRender` and `afterEveryRender`?
🟡 intermediate

<details><summary>Answer</summary>

These functions register callbacks that run after Angular has rendered **the whole application** to the DOM.
They are not tied to a single component's check, and they **don't run on the server** (SSR/prerender).
Use them for manual DOM work: measuring elements, or third-party libraries such as charts.
Phases: `earlyRead` → `write` → `mixedReadWrite` (the default) → `read`, to avoid layout thrashing.
You must call them in an injection context.
`afterRender` was renamed `afterEveryRender` in v20.

```ts
constructor() {
  afterNextRender({ read: () => this.height = this.el.nativeElement.offsetHeight });
}
```

Source: https://angular.dev/api/core/afterNextRender
</details>

### Q21. What is `DestroyRef` and why prefer it over `ngOnDestroy`?
🟡 intermediate

<details><summary>Answer</summary>

`inject(DestroyRef).onDestroy(cb)` registers a cleanup callback for the current **component, directive or injector**.
Benefits:

- The setup and cleanup code sit next to each other.
- You can do it from reusable functions (`useInterval()`-style helpers).
- `destroyRef.destroyed` tells you whether it already happened (this avoids NG0911).

`takeUntilDestroyed()` is built on it.

Source: https://angular.dev/api/core/DestroyRef
</details>

---

## 5. Signals

Deep dive: [04 · Signals](../04-signals/theory.md)

### Q22. What is a signal?
🟢 junior

<details><summary>Answer</summary>

A signal wraps a value and **notifies consumers when it changes**.
`signal(0)` is writable (`set`, `update`). You read it by calling it: `count()`.
Reading a signal inside a template, `computed` or `effect` registers a dependency, so Angular knows exactly
what needs to update. That makes fine-grained change detection possible without zone.js.

Source: https://angular.dev/guide/signals
</details>

### Q23. `computed` vs `effect`: when do you use each?
🟢 junior

<details><summary>Answer</summary>

- `computed(() => …)`: **derives** a value. It is pure, **lazy**, memoized, read-only, and its dependencies are tracked automatically.
- `effect(() => …)`: runs a **side effect** (logging, localStorage, manual DOM, calling a non-signal API) whenever the signals it reads change.

Rule: if you are tempted to `set()` a signal inside an `effect` to keep two states in sync, use `computed` or `linkedSignal` instead.

Source: https://angular.dev/guide/signals/effect
</details>

### Q24. What is `linkedSignal`?
🟡 intermediate

<details><summary>Answer</summary>

`linkedSignal` is a **writable** signal whose value is **reset from a source** each time the source changes,
but which the user can also override locally. Typical case: "selected option" that resets when the list of options changes.

```ts
options = input.required<string[]>();
selected = linkedSignal(() => this.options()[0]);
```

Stable since v20.

Source: https://angular.dev/guide/signals/linked-signal
</details>

### Q25. What are `resource()`, `rxResource()` and `httpResource()`?
🟡 intermediate

<details><summary>Answer</summary>

They are signal-based wrappers for **async data**. You give them a reactive `params` function and a `loader`
(Promise-based for `resource`, Observable-based for `rxResource`). `httpResource` takes a URL/request
function and uses `HttpClient` internally.
They expose `value()`, `status()`, `error()`, `isLoading()`, `hasValue()` and `reload()`.
When `params` changes, the previous request is aborted (`abortSignal`).
All three are **stable since v22**.

```ts
userId = input.required<number>();
user = httpResource<User>(() => `/api/users/${this.userId()}`);
```

Source: https://angular.dev/guide/signals/resource
</details>

### Q26. How do you read a signal without creating a dependency?
🟡 intermediate

<details><summary>Answer</summary>

Wrap the read in `untracked(() => other())`. This is useful inside an `effect` that should react to `a` but only read `b`.

Source: https://angular.dev/api/core/untracked
</details>

### Q27. How do signals interoperate with RxJS?
🟡 intermediate

<details><summary>Answer</summary>

Use `toSignal(obs$, { initialValue })` and `toObservable(sig)` from `@angular/core/rxjs-interop`.
`toSignal` subscribes immediately and unsubscribes when the injection context is destroyed, so you must call it in an injection context
or pass an `injector`. `{ requireSync: true }` is for observables that emit synchronously, such as a `BehaviorSubject`.

Source: https://angular.dev/ecosystem/rxjs-interop
</details>

### Q28. Are signals a replacement for RxJS?
🔴 senior

<details><summary>Answer</summary>

Not entirely. Signals model **state** (a value at all times, synchronous, glitch-free).
RxJS models **events over time** (streams, cancellation, debouncing, combining sources).
The modern pattern is: RxJS for event orchestration (or `resource`/`httpResource` for fetching), and signals for
state exposed to templates, with `toSignal`/`toObservable` at the boundary.
> ⚠️ Opinion: this split is the community consensus. The Angular docs don't prescribe it as a rule.

Source: https://angular.dev/ecosystem/rxjs-interop
</details>

---

## 6. Dependency injection & services

Deep dive: [05 · DI & services](../05-di-services/theory.md)

### Q29. What does `providedIn: 'root'` do?
🟢 junior

<details><summary>Answer</summary>

It registers the service in the **root environment injector**, so the app gets **one instance** that is created lazily the first
time someone injects it. It is also **tree-shakable**: if no one injects it, it is removed from the bundle.
Since v22, `@Service()` is a shorthand for an auto-provided root service (dependencies via `inject()`).

Source: https://angular.dev/guide/di/creating-and-using-services
</details>

### Q30. `inject()` vs constructor injection?
🟢 junior

<details><summary>Answer</summary>

`private http = inject(HttpClient)` works in field initializers, constructors, factory functions and functional
guards/interceptors, which are all **injection contexts**. It plays well with inheritance, doesn't need decorators
for tokens, and is required for functional APIs. Calling it outside an injection context throws **NG0203**.
Constructor injection (`constructor(private http: HttpClient)`) is legacy but still supported. A migration exists: `ng g @angular/core:inject`.

Source: https://angular.dev/guide/di/dependency-injection-context
</details>

### Q31. Explain the injector hierarchy.
🟡 intermediate

<details><summary>Answer</summary>

There are two trees:

1. The **element injector** tree, from `providers` / `viewProviders` on components and directives.
2. The **environment injector** tree: platform → root → lazy route injectors (route `providers` or a lazily loaded `loadChildren`).

Resolution walks up the element injectors first, then the environment injectors, then throws `NullInjectorError`, unless `optional: true` is set.
Modifiers: `self`, `skipSelf`, `host`, `optional` (as `inject()` options, or as `@Self()`-style decorators).

Source: https://angular.dev/guide/di/hierarchical-dependency-injection
</details>

### Q32. What provider types exist?
🟡 intermediate

<details><summary>Answer</summary>

- `useClass`: instantiate this class.
- `useValue`: a constant.
- `useFactory`: compute the value; you can call `inject()` inside it.
- `useExisting`: an alias to another token.

Add `multi: true` to collect several values under one token (e.g. `HTTP_INTERCEPTORS`).
Use `InjectionToken<T>` for non-class dependencies such as config objects.

Source: https://angular.dev/guide/di/defining-dependency-providers
</details>

### Q33. What happens if a service is in `providers` of a component?
🟡 intermediate

<details><summary>Answer</summary>

Each instance of that component gets **its own** service instance, shared by its children (element injector).
That service is **destroyed with the component**, and its `ngOnDestroy` / `DestroyRef` callbacks run.
This is a common way to get component-scoped state such as a form store or a wizard state.

Source: https://angular.dev/guide/di/hierarchical-dependency-injection
</details>

### Q34. How do you run code at application startup?
🟡 intermediate

<details><summary>Answer</summary>

Use `provideAppInitializer(() => inject(ConfigService).load())`. If the function returns a Promise or Observable,
bootstrap waits for it. `provideEnvironmentInitializer()` runs when an environment injector is created.
Legacy: the `APP_INITIALIZER` / `ENVIRONMENT_INITIALIZER` multi-tokens, deprecated since v19.

Source: https://angular.dev/api/core/provideAppInitializer
</details>

### Q35. What is the injection context, and how do you get one outside a constructor?
🔴 senior

<details><summary>Answer</summary>

It is the period during which the current injector is known: class construction (constructor/fields) of
DI-created classes, `useFactory`, `InjectionToken` factories, functional guards/resolvers/interceptors, and
`runInInjectionContext(injector, fn)`. In an async callback (after an `await`), the context is lost.
Capture `inject(Injector)` early and use `runInInjectionContext` later. Library helpers call
`assertInInjectionContext()` to give clear errors.

Source: https://angular.dev/guide/di/dependency-injection-context
</details>

---

## 7. RxJS

Deep dive: [06 · RxJS](../06-rxjs/theory.md)

### Q36. Observable vs Promise?
🟢 junior

<details><summary>Answer</summary>

| Promise | Observable |
|---|---|
| eager: runs at creation | lazy: runs on `subscribe` |
| exactly one value | 0..n values over time |
| not cancellable | cancellable (`unsubscribe`) |
| no operators | operators (`map`, `switchMap`, `debounceTime`…) |

Use `firstValueFrom(obs$)` to convert one to the other.

Source: https://rxjs.dev/guide/observable
</details>

### Q37. `Subject` vs `BehaviorSubject` vs `ReplaySubject`?
🟢 junior

<details><summary>Answer</summary>

- `Subject`: multicast, **no initial value**. Late subscribers miss past values.
- `BehaviorSubject(initial)`: always has a **current value** (`.value`) and emits it immediately to new subscribers.
- `ReplaySubject(n)`: replays the last `n` values to new subscribers. There is no initial value.

Source: https://rxjs.dev/guide/subject
</details>

### Q38. `switchMap` vs `mergeMap` vs `concatMap` vs `exhaustMap`?
🟡 intermediate

<details><summary>Answer</summary>

All four map each value to an inner Observable. The difference is concurrency:

- `switchMap`: **cancels** the previous inner observable. Good for search-as-you-type and route params.
- `mergeMap`: runs all of them in parallel. Good for independent writes.
- `concatMap`: queues them in order. Good for ordered saves.
- `exhaustMap`: **ignores** new values while one is running. Good for a submit button or login.

Source: https://rxjs.dev/api/operators/switchMap
</details>

### Q39. How do you avoid memory leaks with subscriptions?
🟢 junior

<details><summary>Answer</summary>

Prefer not subscribing manually:

- the `async` pipe or `toSignal()` (both unsubscribe automatically);
- `takeUntilDestroyed()` (in an injection context, or pass a `DestroyRef`);
- finite operators (`take(1)`, `first()`).

Legacy pattern: a `destroy$` Subject plus `takeUntil(this.destroy$)`, completed in `ngOnDestroy`.
`HttpClient` observables complete after one response, so they don't leak.

Source: https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed
</details>

### Q40. Cold vs hot observables, and what does `shareReplay` do?
🔴 senior

<details><summary>Answer</summary>

A **cold** observable starts a new producer per subscriber, so each subscription to `http.get()` sends a new request.
A **hot** one shares a producer (Subjects, DOM events).
`shareReplay({ bufferSize: 1, refCount: true })` multicasts and caches the last value, a common way to cache an HTTP call.
With `refCount: false` (the default), the source subscription stays alive even after all subscribers leave.

Source: https://rxjs.dev/api/operators/shareReplay
</details>

### Q41. `combineLatest` vs `forkJoin`?
🟡 intermediate

<details><summary>Answer</summary>

- `forkJoin` waits for **all sources to complete**, then emits once with the last values. It is like `Promise.all`, good for parallel HTTP calls.
- `combineLatest` emits **every time any source emits**, once each has emitted at least once. Good for combining filters and state.

Source: https://rxjs.dev/api/index/function/forkJoin
</details>

---

## 8. Routing

Deep dive: [07 · Routing](../07-routing/theory.md)

### Q42. How do you lazy-load a route?
🟢 junior

<details><summary>Answer</summary>

Use `loadComponent: () => import('./admin/admin').then(m => m.Admin)` for a single component, or
`loadChildren: () => import('./admin/admin.routes')` for a set of child routes (a default export is supported).
Legacy: `loadChildren` returning an NgModule. A migration exists: `ng g @angular/core:route-lazy-loading`.

Source: https://angular.dev/guide/routing/define-routes
</details>

### Q43. Functional guards vs class guards?
🟡 intermediate

<details><summary>Answer</summary>

A modern guard is a function: `CanActivateFn`, `CanMatchFn`, `CanDeactivateFn`, `ResolveFn`. It uses
`inject()` and returns `boolean | UrlTree | RedirectCommand` (or an Observable/Promise of these).

```ts
export const authGuard: CanActivateFn = () =>
  inject(Auth).isLoggedIn() || inject(Router).createUrlTree(['/login']);
```

Class guards (`implements CanActivate`) are the legacy style and still compile.
In v22, `CanMatchFn` gets a required third `currentSnapshot` parameter, which a migration adds.

Source: https://angular.dev/guide/routing/route-guards
</details>

### Q44. `canActivate` vs `canMatch`?
🟡 intermediate

<details><summary>Answer</summary>

- `canMatch` runs **during route matching**. If it returns `false`, the router tries the **next** route with the same path, and a lazy route's code is **not downloaded**. Good for feature flags and role-based alternative routes.
- `canActivate` runs after matching. Denying cancels the navigation (or redirects).

Source: https://angular.dev/guide/routing/route-guards
</details>

### Q45. How do you read route params in a component?
🟢 junior

<details><summary>Answer</summary>

- **Modern**: enable `withComponentInputBinding()` in `provideRouter`. Params, query params, `data` and resolver results are then bound to matching `input()`s: `id = input.required<string>()`.
- **Classic**: `inject(ActivatedRoute).paramMap` (Observable), or `snapshot.paramMap` (one-shot, which goes stale if the component is reused).

Source: https://angular.dev/guide/routing/read-route-state
</details>

### Q46. What is a resolver, and is it a good idea?
🔴 senior

<details><summary>Answer</summary>

A `ResolveFn` fetches data **before** activation and puts the result in `route.data` (or binds it to inputs).
Pros: the component never sees a half-loaded state. Cons: navigation looks frozen while it waits.
Many teams prefer loading inside the component (`httpResource`) and showing skeletons.
> ⚠️ Opinion: whether resolvers are "good" is a UX trade-off, not an official recommendation.

Source: https://angular.dev/guide/routing/data-resolvers
</details>

### Q47. What changed about `paramsInheritanceStrategy` in v22?
🔴 senior

<details><summary>Answer</summary>

The default changed from `'emptyOnly'` to `'always'`. Child routes now inherit params from **all** parent routes by default.
There is no automatic migration. Set `paramsInheritanceStrategy: 'emptyOnly'` with `withRouterConfig()` to restore the old behavior.

Source: https://github.com/angular/angular/blob/main/CHANGELOG.md#2200-2026-06-03
</details>

---

## 9. Forms

Deep dive: [08 · Forms](../08-forms/theory.md)

### Q48. Template-driven vs reactive forms?
🟢 junior

<details><summary>Answer</summary>

- **Template-driven** (`FormsModule`, `ngModel`): the model is created implicitly from the template. Simple, but harder to test and to make dynamic.
- **Reactive** (`ReactiveFormsModule`, `FormGroup`/`FormControl`): the model is explicit in TypeScript, synchronous, strongly typed since v14, and easy to test and compose.

Source: https://angular.dev/guide/forms
</details>

### Q49. What are Signal Forms?
🟡 intermediate

<details><summary>Answer</summary>

Signal Forms (`@angular/forms/signals`) are the third forms API. They were experimental in v21 and are **stable in v22**.
You keep your data in a `signal`, call `form(model, schema)` to get a **field tree**, and bind
fields with the `[formField]` directive. Validation rules are functions: `required`, `email`, `min`, `pattern`, `validate`, `validateHttp`…

```ts
model = signal({ email: '', password: '' });
loginForm = form(this.model, (p) => { required(p.email); email(p.email); minLength(p.password, 8); });
```
```html
<input [formField]="loginForm.email" />
@if (loginForm.email().invalid()) { … }
```

Each field's state (`value`, `valid`, `errors`, `touched`, `dirty`, `pending`…) is a signal.

Source: https://angular.dev/guide/forms/signals/overview
</details>

### Q50. What is a `ControlValueAccessor`?
🔴 senior

<details><summary>Answer</summary>

It is the bridge interface between Angular forms (reactive or template-driven) and a custom input component:
`writeValue`, `registerOnChange`, `registerOnTouched`, and optionally `setDisabledState`. You register it with
`NG_VALUE_ACCESSOR` (`multi: true`, `useExisting: forwardRef(() => MyInput)`).
With Signal Forms you implement `FormValueControl` instead (a `value` model), which is much simpler.

Source: https://angular.dev/api/forms/ControlValueAccessor
</details>

### Q51. How do you write a custom and an async validator in reactive forms?
🟡 intermediate

<details><summary>Answer</summary>

- A validator is a function `(control: AbstractControl) => ValidationErrors | null`.
- An async validator returns `Observable<ValidationErrors | null>` or a Promise, and goes in the third argument / `asyncValidators`.
- Cross-field validators go on the `FormGroup`.

While async validators run, `status` is `'PENDING'`.

Source: https://angular.dev/guide/forms/form-validation
</details>

### Q52. What are typed forms and `NonNullableFormBuilder`?
🟡 intermediate

<details><summary>Answer</summary>

Since v14, `FormControl<string | null>` has a type parameter. By default `reset()` sets the value back to `null`,
hence `| null`. `new FormControl('', { nonNullable: true })` or `inject(NonNullableFormBuilder)` resets
to the initial value instead and removes `null` from the type. `UntypedFormControl` exists for migration.

Source: https://angular.dev/guide/forms/typed-forms
</details>

### Q53. `value` vs `getRawValue()` on a `FormGroup`?
🟡 intermediate

<details><summary>Answer</summary>

`value` **excludes disabled controls**. `getRawValue()` includes them. Forgetting this is a classic bug
when a field is disabled but must still be submitted.

Source: https://angular.dev/guide/forms/reactive-forms
</details>

---

## 10. HTTP

Deep dive: [09 · HTTP](../09-http/theory.md)

### Q54. How do you set up `HttpClient` in a standalone app?
🟢 junior

<details><summary>Answer</summary>

Since v21, `HttpClient` is **injectable by default**, so a plain `inject(HttpClient)` works with no setup.
Add `provideHttpClient(...)` to `app.config.ts` only when you need to configure features,
e.g. `provideHttpClient(withInterceptors([authInterceptor]))`.
Legacy: import `HttpClientModule` (deprecated; the replacement is `provideHttpClient(withInterceptorsFromDi())`).
Since v22 the default backend is **`FetchBackend`**, so `withFetch()` is deprecated. Use `withXhr()` if you need upload
progress events.

Source: https://angular.dev/guide/http/setup
</details>

### Q55. Write a functional interceptor that adds a token.
🟡 intermediate

<details><summary>Answer</summary>

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(Auth).token();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
```

Requests are **immutable**, hence `clone()`. Order = array order for the request and reverse order for the response.
Legacy: a class implementing `HttpInterceptor` registered with the `HTTP_INTERCEPTORS` multi-token.

Source: https://angular.dev/guide/http/interceptors
</details>

### Q56. Why does nothing happen when I call `this.http.get(url)`?
🟢 junior

<details><summary>Answer</summary>

`HttpClient` returns a **cold** Observable, and the request is sent only when something **subscribes**
(`subscribe`, `async` pipe, `toSignal`, `firstValueFrom`). Each subscription sends a new request.

Source: https://angular.dev/guide/http/making-requests
</details>

### Q57. `httpResource` vs `HttpClient`?
🟡 intermediate

<details><summary>Answer</summary>

`httpResource(() => url)` is **declarative** and signal-based, and it starts the request **eagerly** (no subscribe needed). It refetches when the signals in the URL change, cancels
stale requests, and exposes `value`/`isLoading`/`error` as signals. It is for **reading** data (GET).
For mutations (POST/PUT/DELETE), keep using `HttpClient` imperatively.

Source: https://angular.dev/guide/http/http-resource
</details>

### Q58. How do you handle HTTP errors globally?
🟡 intermediate

<details><summary>Answer</summary>

Use an interceptor with `catchError`: map 401 to a logout/redirect, show a toast, retry with `retry({ count: 2, delay })`.
Rethrow (`throwError(() => err)`) so the callers still know about the failure. Uncaught errors go to `ErrorHandler`.

Source: https://angular.dev/guide/http/interceptors
</details>

---

## 11. Change detection

Deep dive: [10 · Change detection](../10-change-detection/theory.md)

### Q59. What is change detection?
🟢 junior

<details><summary>Answer</summary>

It is the process where Angular walks the component tree **top-down**, evaluates template bindings, and updates the DOM where
values changed. It is a single pass per tick. In dev mode, a second check
detects bindings that changed during the pass (`ExpressionChangedAfterItHasBeenCheckedError`, NG0100).

Source: https://angular.dev/best-practices/runtime-performance
</details>

### Q60. What is `OnPush`, and what is the default in v22?
🟡 intermediate

<details><summary>Answer</summary>

An `OnPush` component is checked only when:

- an input received a new reference through a template binding;
- an event was handled in it or in its children;
- it was marked dirty (`markForCheck`, the `async` pipe);
- a signal read in its template changed.

**Since v22, `OnPush` is the default** for components that don't set `changeDetection`. The old behavior is now called
`ChangeDetectionStrategy.Eager`, and `Default` is a deprecated alias of it. `ng update` adds `Eager` to existing components.

Source: https://angular.dev/best-practices/skipping-subtrees
</details>

### Q61. What does "zoneless" mean?
🟡 intermediate

<details><summary>Answer</summary>

zone.js monkey-patched async browser APIs to trigger change detection after *any* async task.
Zoneless Angular instead schedules change detection when it is **notified**: `markForCheck` (also called by the `async` pipe), `ComponentRef.setInput`,
a signal read in a template changing, bound template/host listeners, or attaching a dirty view.
Timeline: experimental in v18, developer preview in v20, stable in 20.2, **default in v21+**.
`provideZoneChangeDetection()` opts back into zone.js.

Source: https://angular.dev/guide/zoneless
</details>

### Q62. `markForCheck()` vs `detectChanges()`?
🟡 intermediate

<details><summary>Answer</summary>

- `markForCheck()` marks the view **and its ancestors** dirty and schedules a check on the next tick. This is the usual choice.
- `detectChanges()` runs change detection **synchronously** on this view and its children right now.
- `detach()` / `reattach()` take a subtree out of automatic checking.

Source: https://angular.dev/api/core/ChangeDetectorRef
</details>

### Q63. What causes `ExpressionChangedAfterItHasBeenCheckedError` and how do you fix it?
🟡 intermediate

<details><summary>Answer</summary>

A binding's value changed **after** Angular checked it in the same pass. Typical cause: a child or `ngAfterViewInit` changes parent state,
or a getter returns a new object each time.
Fixes:

- move the logic earlier (`ngOnInit`) or derive it with `computed`;
- use signals (writes to signals are allowed and simply schedule another pass);
- as a last resort, defer the change.

Don't just wrap it in `setTimeout` blindly.

Source: https://angular.dev/errors/NG0100
</details>

### Q64. What does `NgZone.runOutsideAngular` do, and is it still useful?
🔴 senior

<details><summary>Answer</summary>

With zone.js, it runs code (scroll listeners, animation loops, third-party libraries) without triggering change detection,
to avoid "zone pollution". In zoneless apps there is nothing to escape, but the zoneless guide says `run` and
`runOutsideAngular` are **compatible** and don't need removing, which matters for libraries also used in zone-based apps.
`onMicrotaskEmpty`/`onStable` never emit in zoneless apps; use `afterNextRender` instead ([zoneless guide](https://angular.dev/guide/zoneless)).

Source: https://angular.dev/best-practices/zone-pollution
</details>

---

## 12. Directives & pipes

Deep dive: [11 · Directives & pipes](../11-directives-pipes/theory.md)

### Q65. Component vs attribute directive vs structural directive?
🟢 junior

<details><summary>Answer</summary>

- A **component** is a directive with a template.
- An **attribute directive** changes the look or behavior of its host element (`[appHighlight]`, `NgClass`).
- A **structural directive** adds or removes DOM through `TemplateRef` + `ViewContainerRef` (`*ngIf`, or a custom `*appHasRole`). The `*` is sugar for `<ng-template>`.

Source: https://angular.dev/guide/directives
</details>

### Q66. `host` metadata vs `@HostBinding` / `@HostListener`?
🟡 intermediate

<details><summary>Answer</summary>

Both bind to the host element. The docs say to **always prefer** the `host: { '[class.active]': 'active()', '(click)': 'toggle()' }`
property; the decorators exist only for backwards compatibility, but you will meet them in older code.

Source: https://angular.dev/guide/components/host-elements
</details>

### Q67. Pure vs impure pipes?
🟡 intermediate

<details><summary>Answer</summary>

A **pure** pipe (the default) re-runs only when an input is a new **primitive value or object reference**, so mutating an array won't update it.
An **impure** pipe (`pure: false`) runs on **every** change detection. It is expensive; `AsyncPipe` is one.
Prefer immutable updates or a `computed` signal.

Source: https://angular.dev/guide/templates/pipes
</details>

### Q68. What is the directive composition API (`hostDirectives`)?
🔴 senior

<details><summary>Answer</summary>

`hostDirectives: [{ directive: Tooltip, inputs: ['tooltipText'] }]` applies standalone directives to a component's host,
**at compile time**, and lets you re-expose chosen inputs/outputs. It is composition instead of inheritance.

Source: https://angular.dev/guide/directives/directive-composition-api
</details>

### Q69. Why use the `async` pipe instead of subscribing?
🟢 junior

<details><summary>Answer</summary>

It subscribes, returns the latest value, calls `markForCheck` (so OnPush and zoneless both work), and **unsubscribes on destroy**.
In modern code, `toSignal()` serves the same purpose for component state.

Source: https://angular.dev/api/common/AsyncPipe
</details>

---

## 13. Advanced: @defer, SSR, dynamic components

Deep dive: [12 · Advanced](../12-advanced/theory.md)

### Q70. What is `@defer`?
🟡 intermediate

<details><summary>Answer</summary>

`@defer` lazy-loads the **standalone dependencies** of a template block into a separate chunk. It loads when a trigger fires:
`on idle` (the default), `viewport`, `interaction`, `hover`, `immediate`, `timer(2s)`, or `when cond`.
Blocks: `@placeholder` (with `minimum`), `@loading` (`after`, `minimum`), and `@error`. Use `prefetch on …` to download early.

```html
@defer (on viewport; prefetch on idle) { <app-chart /> } @placeholder { <div>Chart…</div> }
```

Source: https://angular.dev/guide/templates/defer
</details>

### Q71. What is hydration, and what is incremental hydration?
🔴 senior

<details><summary>Answer</summary>

**Hydration** (`provideClientHydration()`) reuses the server-rendered DOM instead of destroying and re-creating it.
**Incremental hydration** leaves `@defer (hydrate on …)` blocks dehydrated until a trigger fires, which ships less JS upfront.
It is stable since v20 and **enabled by default with `provideClientHydration` since v22**. `withIncrementalHydration()` is deprecated, and `withNoIncrementalHydration()` opts out.
**Event replay** (`withEventReplay()`) replays clicks that happened before hydration.

Source: https://angular.dev/guide/incremental-hydration
</details>

### Q72. How do you create a component dynamically?
🟡 intermediate

<details><summary>Answer</summary>

- `viewContainerRef.createComponent(MyCmp)` returns a `ComponentRef`. Use `ref.setInput('name', v)` to set inputs; it marks OnPush dirty and triggers `ngOnChanges`.
- `ref.destroy()` removes it.
- In templates, `NgComponentOutlet` does the same.

The legacy `ComponentFactoryResolver` was **removed in v22**.

Source: https://angular.dev/guide/components/programmatic-rendering
</details>

### Q73. Which code must be guarded for SSR?
🟡 intermediate

<details><summary>Answer</summary>

Browser-only APIs such as `window`, `document`, `localStorage` or `ResizeObserver`.
Put DOM work in `afterNextRender`/`afterEveryRender`, which don't run on the server, or check `isPlatformBrowser(inject(PLATFORM_ID))`.
Inject `DOCUMENT` instead of using the global.

Source: https://angular.dev/guide/ssr
</details>

### Q74. What is `@Service()` (v22)?
🟡 intermediate

<details><summary>Answer</summary>

`@Service()` is a new decorator. By default the service is **auto-provided** (like `providedIn: 'root'`).
Pass `{ autoProvided: false }` to provide it yourself, or `factory` to provide a custom value.
Its dependencies must use `inject()`. `@Injectable` is still supported, and 22.1 added a migration from `@Injectable` to `@Service`.

Source: https://angular.dev/api/core/Service
</details>

---

## 14. Architecture & state management

### Q75. How do you share state between components?
🟡 intermediate

<details><summary>Answer</summary>

| Situation | Tool |
|---|---|
| Parent ↔ child | inputs / outputs / `model()` |
| Siblings or distant components | a service holding signals (`signal` + `computed`, exposed `asReadonly()`) |
| Scoped to a feature or component subtree | the same service, provided in the component's or route's `providers` |
| Large app, complex flows, devtools/time travel | a library such as NgRx (Store or SignalStore) |

> ⚠️ Opinion: the threshold for adopting a store library is a team choice. The Angular docs don't define one.

Source: https://angular.dev/guide/di/hierarchical-dependency-injection
</details>

### Q76. What does a "signal store service" look like?
🟡 intermediate

<details><summary>Answer</summary>

```ts
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<Item[]>([]);
  readonly items = this._items.asReadonly();
  readonly total = computed(() => this._items().reduce((s, i) => s + i.price, 0));
  add(item: Item) { this._items.update(list => [...list, item]); }
}
```

Private writable state, public read-only signals, methods for mutations, and **immutable updates**.

Source: https://angular.dev/guide/signals
</details>

### Q77. Smart (container) vs presentational components?
🟢 junior

<details><summary>Answer</summary>

- **Presentational** components get data only through inputs, emit outputs, and inject no data services. They are easy to test and reuse.
- **Containers** inject services, fetch data and orchestrate.

> ⚠️ Opinion: this is a widespread architecture pattern, not an official Angular rule.

Source: https://angular.dev/guide/components/inputs
</details>

### Q78. How would you structure a large Angular app?
🔴 senior

<details><summary>Answer</summary>

Use **feature folders** (not type folders), lazy-loaded routes per feature, standalone components,
and shared UI in a `shared/` folder with no business logic.
Scope services to features where possible (route `providers`), and enforce boundaries (lint rules, Nx).
The official style guide recommends organizing by feature areas and one concept per file.
> ⚠️ Partly opinion (Nx and boundary lint rules are ecosystem tools).

Source: https://angular.dev/style-guide
</details>

---

## 15. Performance

### Q79. Name five ways to improve Angular runtime performance.
🟡 intermediate

<details><summary>Answer</summary>

1. OnPush (the default in v22) plus signals.
2. A proper `track` in `@for`.
3. `computed`/pure pipes instead of template method calls.
4. Avoid zone pollution, or go zoneless.
5. Virtual scrolling (CDK) for long lists.

Profile with Angular DevTools and the Chrome Performance panel.

Source: https://angular.dev/best-practices/runtime-performance
</details>

### Q80. And loading performance?
🟡 intermediate

<details><summary>Answer</summary>

- Lazy routes and `@defer` blocks.
- `NgOptimizedImage` (`ngSrc`, `priority` for the LCP image).
- SSR plus (incremental) hydration.
- Bundle budgets in `angular.json`.
- Use preloading strategies (`withPreloading(PreloadAllModules)`) carefully.

Source: https://angular.dev/guide/image-optimization
</details>

### Q81. Why is calling a method in a template (`{{ total() }}` on a plain method) a performance smell, while `{{ total() }}` on a signal is fine?
🔴 senior

<details><summary>Answer</summary>

A plain method runs on **every** check of that view. A `computed` signal is **memoized**: calling it only returns the
cached value unless its dependencies changed. Same syntax, very different cost.

Source: https://angular.dev/best-practices/slow-computations
</details>

---

## 16. Testing

### Q82. What is the default test runner in new Angular projects?
🟢 junior

<details><summary>Answer</summary>

**Vitest**, since v21 (`ng new` sets up Vitest with jsdom). Karma/Jasmine is still supported, and v22 adds a
`migrate-karma-to-vitest` migration ([CLI changelog](https://github.com/angular/angular-cli/blob/main/CHANGELOG.md#2100-2025-11-19)).

Source: https://angular.dev/guide/testing
</details>

### Q83. How do you test a component with `TestBed`?
🟢 junior

<details><summary>Answer</summary>

```ts
await TestBed.configureTestingModule({ imports: [Greeting] }).compileComponents();
const fixture = TestBed.createComponent(Greeting);
fixture.componentRef.setInput('name', 'Ada');
await fixture.whenStable();
expect(fixture.nativeElement.textContent).toContain('Ada');
```

Standalone components go in `imports`. Use `setInput` for signal inputs, because you can't assign them.
In zoneless tests, prefer `await fixture.whenStable()` over manual `detectChanges()`.

Source: https://angular.dev/guide/testing/components-basics
</details>

### Q84. How do you test a service that uses `HttpClient`?
🟡 intermediate

<details><summary>Answer</summary>

Provide `provideHttpClient()` and `provideHttpClientTesting()`, inject `HttpTestingController`, call the method,
then `httpTesting.expectOne('/api/x').flush(data)` and `httpTesting.verify()` at the end.

Source: https://angular.dev/guide/http/testing
</details>

### Q85. What are component harnesses?
🔴 senior

<details><summary>Answer</summary>

Harnesses (from the CDK) are test APIs that interact with a component the way a user would, without depending on its DOM structure
(`await loader.getHarness(MatButtonHarness)`). Tests survive internal refactors, and the same harness
works in unit and e2e environments.

Source: https://angular.dev/guide/testing/component-harnesses-overview
</details>

---

## 17. Tooling & CLI

### Q86. What build system does the Angular CLI use?
🟡 intermediate

<details><summary>Answer</summary>

The **`application` builder**, based on esbuild with a Vite-powered dev server. It has been the default for new projects since v17 and supports SSR/prerendering.
The legacy webpack `browser` builder still exists. See the "Migrating to new build system" guide
([CLI changelog v17](https://github.com/angular/angular-cli/blob/main/CHANGELOG.md#1700-2023-11-08)).

Source: https://angular.dev/tools/cli/build-system-migration
</details>

### Q87. What does `ng update` do?
🟢 junior

<details><summary>Answer</summary>

It updates Angular packages **and runs migrations** (schematics) that rewrite your code for breaking changes,
e.g. adding `ChangeDetectionStrategy.Eager` when moving to v22. Update one major version at a time, and check the update guide.

Source: https://angular.dev/update-guide
</details>

### Q88. What is AOT compilation?
🟢 junior

<details><summary>Answer</summary>

Ahead-of-time compilation turns templates into JavaScript **at build time**. You get smaller bundles (no compiler shipped),
faster rendering, and template errors at build time. It is the default for both `ng build` and `ng serve`. JIT compiles in the browser
and is only used in special cases.

Source: https://angular.dev/tools/cli/aot-compiler
</details>
