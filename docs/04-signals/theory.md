# 04 · Signals

A **signal** is a wrapper around a value that notifies interested consumers when that value changes
([docs](https://angular.dev/guide/signals#what-are-signals)). Signals are Angular's reactivity primitive: templates,
`computed`, `effect`, inputs, queries, forms and resources are all built on them, and they are what makes zoneless,
fine-grained change detection possible.

Demo: [`src/app/modules/04-signals/`](../../src/app/modules/04-signals/). Every behavioural claim marked "(spec)"
is proven by [`signals.spec.ts`](../../src/app/modules/04-signals/signals.spec.ts)
(`npx ng test --include 'src/app/modules/04-signals/**/*.spec.ts'`).

## Table of contents

1. [Writable signals: signal, set, update, asReadonly](#1-writable-signals-signal-set-update-asreadonly)
2. [Equality functions](#2-equality-functions)
3. [computed: lazy, memoized, dynamic](#3-computed-lazy-memoized-dynamic)
4. [Reactive contexts and untracked](#4-reactive-contexts-and-untracked)
5. [effect](#5-effect)
6. [linkedSignal](#6-linkedsignal)
7. [Signal inputs, model inputs, signal queries](#7-signal-inputs-model-inputs-signal-queries)
8. [RxJS interop in a nutshell](#8-rxjs-interop-in-a-nutshell)
9. [Glitch-free execution (push/pull)](#9-glitch-free-execution-pushpull)
10. [Signals vs RxJS](#10-signals-vs-rxjs)
11. [🎯 Likely interview questions](#-likely-interview-questions)
12. [📚 References](#-references)

---

## 1. Writable signals: signal, set, update, asReadonly

```ts
const count = signal(0);          // WritableSignal<number>
count();                          // read: signals are getter functions
count.set(3);                     // replace
count.update((v) => v + 1);       // derive from previous value
const ro = count.asReadonly();    // Signal<number>: no set/update
```

- Reading is a function call, which lets Angular **track where the signal is used**
  ([docs](https://angular.dev/guide/signals#what-are-signals)).
- `asReadonly()` exposes a read-only view of a private writable signal — the classic "store" pattern
  ([docs](https://angular.dev/guide/signals#converting-writable-signals-to-readonly)). Demo:
  [`cart-store.ts`](../../src/app/modules/04-signals/basics/cart-store.ts).
- Reads are **synchronous**: after `set()`, reading the signal immediately returns the new value.
- `isSignal()` / `isWritableSignal()` check the kind at runtime ([docs](https://angular.dev/guide/signals#type-checking-signals)).

> ⚠️ **Pitfall:** "The readonly signals do not have any built-in mechanism that would prevent deep-mutation of
> their value" ([docs](https://angular.dev/guide/signals#converting-writable-signals-to-readonly)). Mutating an object
> or array in place and calling `set(sameRef)` notifies **nobody** (default equality is `Object.is`): computeds stay
> stale. Always update immutably: `update(list => [...list, item])`. Demo: button _"Mutate in place ⚠️"_.

## 2. Equality functions

By default signals compare with `Object.is()`. You can pass `{ equal }` to `signal()`, `computed()` and
`linkedSignal()` ([docs](https://angular.dev/guide/signals#signal-equality-functions)):

```ts
const user = signal({ id: 1, name: 'Ada' }, { equal: (a, b) => a.id === b.id });
user.set({ id: 1, name: 'Grace' }); // considered equal -> ignored
user().name;                        // still 'Ada'  (spec)
```

> ⚠️ **Pitfall:** when `equal` returns `true`, the new value is **not stored at all** (spec) — it's not "stored but
> silent". Use equality for "semantically the same", not to suppress notifications for a value you still need.

For a `computed`, a custom `equal` stops propagation: if the recomputed value is equal, downstream consumers are not
re-run ([signals README](https://github.com/angular/angular/blob/main/packages/core/primitives/signals/README.md)).

## 3. computed: lazy, memoized, dynamic

```ts
const count = signal(0);
const doubled = computed(() => count() * 2); // Signal<number>, read-only
```

- **Lazy:** the derivation does not run until the first read. **Memoized:** the value is cached and only
  recomputed after a dependency changed **and** someone reads it again
  ([docs](https://angular.dev/guide/signals#computed-signals-are-both-lazily-evaluated-and-memoized)). (spec)
  → safe for expensive derivations like filtering arrays.
- **Read-only:** `doubled.set(3)` is a compile error ([docs](https://angular.dev/guide/signals#computed-signals-are-not-writable-signals)).
- **Dynamic dependencies:** only the signals actually read during the **last** execution are tracked; dependencies
  can be added and removed between runs ([docs](https://angular.dev/guide/signals#computed-signal-dependencies-are-dynamic)). (spec)

```ts
const conditionalCount = computed(() => (showCount() ? `The count is ${count()}.` : 'Nothing to see here!'));
// while showCount() is false, changing count does NOT invalidate conditionalCount
```

> ⚠️ **Pitfall:** a computed must be pure. Writing a signal inside it throws **NG0600** ("Signal write in a disallowed
> context" — also thrown when writing during template evaluation) ([docs](https://angular.dev/errors/NG0600)). (spec)

Demo: [`computed-demo.ts`](../../src/app/modules/04-signals/computed-demo/computed-demo.ts) — uncheck "Render
doubled()" and increment: no derivation runs.

## 4. Reactive contexts and untracked

A **reactive context** is where Angular records signal reads as dependencies. Angular enters one when executing an
`effect`/`afterRenderEffect`, evaluating a `computed`/`linkedSignal`, a resource's `params`, and when rendering a
component template (including host bindings) ([docs](https://angular.dev/guide/signals#reactive-contexts)).

- `untracked(fn)` / `untracked(signal)` reads **without** creating a dependency. Use it for incidental reads and when
  calling external code that might read signals ([docs](https://angular.dev/guide/signals#reading-without-tracking-dependencies)). (spec)
- The reactive context is **synchronous only**: reads after an `await` are not tracked; read signals before the
  first `await` ([docs](https://angular.dev/guide/signals#reactive-context-and-async-operations)).
- `assertNotInReactiveContext(fn)` lets library code fail fast if called from a reactive context
  ([docs](https://angular.dev/guide/signals#asserts-the-reactive-context)).

```ts
effect(() => {
  const user = currentUser();               // tracked
  untracked(() => this.logger.log(user));   // anything read in here is NOT tracked
});
```

## 5. effect

```ts
constructor() {
  effect((onCleanup) => {
    const q = this.query();
    const id = setTimeout(() => this.search(q), 300);
    onCleanup(() => clearTimeout(id)); // before next run AND on destroy
  });
}
```

### When does an effect run? (Angular 22)
- **At least once**, then whenever a dependency read in its **latest** run changes; dependencies are dynamic like
  `computed` ([docs](https://angular.dev/guide/signals/effect)).
- **Always asynchronously, during the change detection process** ([docs](https://angular.dev/guide/signals/effect)).
  Three synchronous `set()` calls → **one** run seeing the last value (spec; demo button _"set(user) ×3"_).
- Two kinds ([docs](https://angular.dev/guide/signals/effect#execution-of-effects)):
  - **View effect**: created in a component/directive (or a service provided by a component injector) — runs
    **before its component is checked** by change detection, destroyed with the component.
  - **Root effect**: created in a root-provided service — runs **before all components are checked**, destroyed
    with the application.
  - In both cases, if a dependency changed during the effect's own execution, it re-runs before change detection
    moves on.
- The signals README says the exact timing of effects is unspecified at the primitive level; the framework
  schedules them ([README](https://github.com/angular/angular/blob/main/packages/core/primitives/signals/README.md)).

### Injection context, `injector`, `manualCleanup`, `EffectRef`
- `effect()` needs an injection context (constructor, field initializer). Elsewhere pass `{ injector }`
  ([docs](https://angular.dev/guide/signals/effect#injection-context)). Without either: `NG0203` (spec,
  [NG0203](https://angular.dev/errors/NG0203)). Demo: _"Create effect outside constructor"_.
- It returns an `EffectRef` with `destroy()`. `manualCleanup: true` disables automatic destruction with the
  `DestroyRef` ([docs](https://angular.dev/guide/signals/effect#destroying-effects), [API](https://angular.dev/api/core/EffectRef)).
- `allowSignalWrites` is **deprecated**: signal writes in effects are allowed by default (checked in the 22.2
  typings: `@deprecated no longer required, signal writes are allowed by default`).

### When (not) to use effects
"Effects should be the last API you reach for." Prefer `computed()` for derived values and `linkedSignal()` for
derived-but-writable values. **Avoid effects to propagate state** between signals: it can cause NG0100, infinite
circular updates or unnecessary CD cycles ([docs](https://angular.dev/guide/signals/effect#use-cases-for-effects)).
Good uses: logging/analytics, syncing to `localStorage`, imperative DOM/canvas/3rd-party libs.

```ts
// ❌ state propagation through an effect
effect(() => this.fullName.set(`${this.first()} ${this.last()}`));
// ✅ derivation
readonly fullName = computed(() => `${this.first()} ${this.last()}`);
```

> 💡 **Interview tip:** "There are no situations where effect is good, only situations where it is appropriate."
> — quoted from the official guide ([docs](https://angular.dev/guide/signals/effect#use-cases-for-effects)).

### DOM work: `afterRenderEffect`
`effect` runs **before** Angular updates the DOM. For DOM reads/writes reacting to signals, use
`afterRenderEffect` (runs after rendering, supports the `earlyRead/write/mixedReadWrite/read` phases, browser only)
([docs](https://angular.dev/guide/signals/effect#side-effects-on-dom-elements)).

### Async gotcha
Signals read after an `await` in an `async` effect are not tracked
([docs](https://angular.dev/guide/signals#reactive-context-and-async-operations)).

## 6. linkedSignal

A **writable** signal whose value is (re)set by a reactive computation — "derived state you can override"
([docs](https://angular.dev/guide/signals/linked-signal)). Stable since v20 (`@publicApi 20.0` in typings).

```ts
// Form 1: shorthand (computation only) -> resets every time options change
selected = linkedSignal(() => this.options()[0]);

// Form 2: source + computation(newSource, previous) -> can keep the user's choice
selected = linkedSignal<Option[], Option>({
  source: this.options,
  computation: (opts, previous) => opts.find((o) => o.id === previous?.value.id) ?? opts[0],
});
```

- `previous` has `{ source, value }`: the previous source value and the previous linkedSignal value. When you use
  `previous`, give both generic types explicitly ([docs](https://angular.dev/guide/signals/linked-signal#accounting-for-previous-state)).
- Supports `equal` ([docs](https://angular.dev/guide/signals/linked-signal#custom-equality-comparison)).
- **`set` option** (write-back): `set(value, rawSet)` lets `set()/update()` write to the source of truth instead,
  e.g. Fahrenheit ↔ Celsius, or editing a property of a parent object
  ([docs](https://angular.dev/guide/signals/linked-signal#customizing-the-set-operation)). (spec, demo)

> 💡 **Interview tip:** `computed` = derived, read-only. `linkedSignal` = derived, but the user can override it until
> the source changes. `effect` that copies a signal into another = code smell → use `linkedSignal`.

## 7. Signal inputs, model inputs, signal queries

```ts
readonly label = input.required<string>();                      // InputSignal<string>
readonly max = input(5, { transform: numberAttribute });         // accepts "7" in templates
readonly value = model(0);                                       // ModelSignal<number>, writable
// parent: <app-star-rating [(value)]="rating" />  (rating is a WritableSignal — pass the signal itself)
```

- Signal inputs are **read-only** for the component; read them in templates, `computed`, `effect`
  ([docs](https://angular.dev/guide/components/inputs)). Required inputs read too early throw NG0950
  ([docs](https://angular.dev/errors/NG0950)).
- `model()` is a writable input; calling `set`/`update` emits an implicit `<name>Change` output, which powers
  `[(value)]` two-way binding with a signal **or** a plain property. Model inputs do **not** support transforms
  ([docs](https://angular.dev/guide/components/inputs#model-inputs), [two-way binding](https://angular.dev/guide/templates/two-way-binding)).
- Signal queries (`viewChild`, `viewChildren`, `contentChild`, `contentChildren`) return signals kept up to date
  ([docs](https://angular.dev/guide/components/queries)).
- `ngOnChanges` still fires for signal inputs, but idiomatic code derives with `computed` (see module 03).

Legacy equivalents (still supported): `@Input()`, `@Input({ required: true, transform })`, `@Output() xChange =
new EventEmitter()` + `@Input() x` for two-way binding, `@ViewChild`.

Demo: [`star-rating.ts`](../../src/app/modules/04-signals/inputs-model/star-rating.ts).

## 8. RxJS interop in a nutshell

(Full coverage in [06 · RxJS](../06-rxjs/theory.md).) From `@angular/core/rxjs-interop`
([docs](https://angular.dev/ecosystem/rxjs-interop)):

- `toSignal(obs$, { initialValue })` — subscribes **immediately** (like `async` pipe), unsubscribes when the
  creating component/service is destroyed; without `initialValue` the signal is `undefined` until the first emission;
  `requireSync: true` for observables that emit synchronously (`BehaviorSubject`); errors are thrown when the signal
  is read. Needs an injection context (or `injector`).
- `toObservable(signal)` — uses an effect + `ReplaySubject`; the first value may be emitted synchronously on
  subscription, **subsequent values are asynchronous and only the settled value is emitted** (3 sync sets → only
  `3`) ([docs](https://angular.dev/ecosystem/rxjs-interop#timing-of-toobservable)). (spec)
- Typical combo: `toSignal(toObservable(query).pipe(debounceTime(300), switchMap(...)))` — time-based operators are
  where RxJS still shines. Demo: [`interop-demo.ts`](../../src/app/modules/04-signals/interop-demo/interop-demo.ts).
- Async data the signal way: `resource()` / `rxResource()` / `httpResource()` ([docs](https://angular.dev/guide/signals/resource)).

## 9. Glitch-free execution (push/pull)

A **glitch** is a consumer observing an inconsistent intermediate state (e.g. "1 is even"). Angular signals guarantee
glitch-free execution with a **push/pull** algorithm: when a producer changes, "dirtiness" is eagerly **pushed**
through the graph (no recomputation, no side effects), then values are **pulled** (recomputed lazily) when read
([signals README](https://github.com/angular/angular/blob/main/packages/core/primitives/signals/README.md)).

Consequences:
- An effect reading `n` and `isEven(n)` always sees a consistent pair (spec, demo).
- Effects/templates run **after** the synchronous writes are done → batching for free.
- Contrast with RxJS `combineLatest([n$, n$.pipe(map(isEven))])`: it emits as soon as **one** input emits, so you
  briefly get `(1, true)` — a glitch. Demo: [`glitch-free-demo.ts`](../../src/app/modules/04-signals/glitch-free/glitch-free-demo.ts).

## 10. Signals vs RxJS

| | Signals | RxJS Observables |
| --- | --- | --- |
| Model | a **value** that changes over time (always has a current value) | a **stream of events** over time |
| Read | synchronous `sig()` anywhere | subscribe (async pipe, `subscribe`) |
| Subscription management | automatic (dependency tracking, cleaned with injector) | manual (`unsubscribe`, `takeUntilDestroyed`, async pipe) |
| Derivation | `computed` (lazy, memoized, glitch-free) | operators (`map`, `combineLatest`…) — can glitch |
| Laziness | `computed` lazy; `signal` holds a value eagerly | cold observables are lazy until subscribed |
| Time / async operators | none built-in (`resource` for async data) | rich: `debounceTime`, `switchMap`, retry, … |
| Change detection | template reads mark exactly the consuming component | needs `async` pipe / `markForCheck` (zoneless) |
| Best for | UI state, derived state, inputs, forms | events, websockets, race/cancel/debounce logic |

Sources: [signals guide](https://angular.dev/guide/signals), [rxjs-interop](https://angular.dev/ecosystem/rxjs-interop),
[zoneless](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility).

> ⚠️ Not confirmed by official docs / opinion: the "best for" row is community consensus, not an official statement.

> 💡 **Interview tip:** "Will signals replace RxJS?" — For synchronous state, mostly yes; for event streams with
> time-based operators, cancellation (`switchMap`) and complex async orchestration, RxJS remains the tool. They are
> designed to interoperate (`toSignal`/`toObservable`, `rxResource`, `outputFromObservable`).

---

## 🎯 Likely interview questions

1. **What does "computed is lazy and memoized" mean?**
   <details><summary>Answer</summary>The derivation doesn't run until first read, and the result is cached until a dependency changes and it's read again. (<a href="https://angular.dev/guide/signals#computed-signals-are-both-lazily-evaluated-and-memoized">docs</a>)</details>
2. **When does an effect run?**
   <details><summary>Answer</summary>At least once, then after its tracked dependencies change — asynchronously during change detection: view effects before their component is checked, root effects before all components. (<a href="https://angular.dev/guide/signals/effect#execution-of-effects">docs</a>)</details>
3. **Why shouldn't you use effect to sync two signals?**
   <details><summary>Answer</summary>It can cause NG0100, circular updates and extra CD cycles; use computed or linkedSignal. (<a href="https://angular.dev/guide/signals/effect#use-cases-for-effects">docs</a>)</details>
4. **computed vs linkedSignal?**
   <details><summary>Answer</summary>Both derive from other signals; linkedSignal is writable and is reset by its computation when the source changes; its object form exposes the previous value. (<a href="https://angular.dev/guide/signals/linked-signal">docs</a>)</details>
5. **What does untracked do?**
   <details><summary>Answer</summary>Reads signals without registering them as dependencies of the current reactive context. (<a href="https://angular.dev/guide/signals#reading-without-tracking-dependencies">docs</a>)</details>
6. **How do you create an effect outside the constructor?**
   <details><summary>Answer</summary>Pass <code>{ injector }</code> (e.g. <code>inject(Injector)</code> stored in a field); otherwise NG0203. Destroy it with the returned EffectRef if needed. (<a href="https://angular.dev/guide/signals/effect#injection-context">docs</a>)</details>
7. **Why did my computed not update after I pushed into an array?**
   <details><summary>Answer</summary>Same reference: Object.is says equal, so no notification. Update immutably. (<a href="https://angular.dev/guide/signals#signal-equality-functions">docs</a>)</details>
8. **What is glitch-free?**
   <details><summary>Answer</summary>Consumers never see inconsistent intermediate states thanks to push (invalidate) / pull (lazy recompute). (<a href="https://github.com/angular/angular/blob/main/packages/core/primitives/signals/README.md">README</a>)</details>
9. **How does model() enable two-way binding?**
   <details><summary>Answer</summary>model() is a writable input with an implicit <code>xChange</code> output; <code>[(x)]="sig"</code> binds the signal instance. (<a href="https://angular.dev/guide/components/inputs#model-inputs">docs</a>)</details>
10. **toObservable emits every set?**
    <details><summary>Answer</summary>No: it uses an effect, emits asynchronously, only the settled value after synchronous writes. (<a href="https://angular.dev/ecosystem/rxjs-interop#timing-of-toobservable">docs</a>)</details>

## 📚 References

- https://angular.dev/guide/signals
- https://angular.dev/guide/signals/effect
- https://angular.dev/guide/signals/linked-signal
- https://angular.dev/guide/signals/resource
- https://angular.dev/guide/components/inputs
- https://angular.dev/guide/components/queries
- https://angular.dev/guide/templates/two-way-binding
- https://angular.dev/ecosystem/rxjs-interop
- https://angular.dev/api/core/EffectRef
- https://angular.dev/errors/NG0600
- https://angular.dev/errors/NG0203
- https://angular.dev/errors/NG0950
- https://angular.dev/guide/zoneless
- https://github.com/angular/angular/blob/main/packages/core/primitives/signals/README.md
