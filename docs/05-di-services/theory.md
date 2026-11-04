# 05 · DI & services

Dependency injection (DI) is how Angular creates and hands out the objects your code needs: services,
configuration values, functions, framework objects (`HttpClient`, `Router`, `ElementRef`, `DestroyRef`…).
In an interview you are expected to explain **who creates an instance**, **where it lives** (which injector),
**how many instances exist**, and **when it is destroyed**.

Live demos: [`src/app/modules/05-di-services/`](../../src/app/modules/05-di-services/) (route `/di-services`).

## Table of contents

1. [What is DI?](#1-what-is-di)
2. [Defining a service: `@Service()`, `@Injectable()`, `providedIn`](#2-defining-a-service-service-injectable-providedin)
3. [`inject()` vs constructor injection](#3-inject-vs-constructor-injection)
4. [Injection context rules and `runInInjectionContext`](#4-injection-context-rules-and-runininjectioncontext)
5. [Where to provide: root, bootstrap, route, component](#5-where-to-provide-root-bootstrap-route-component)
6. [Provider recipes: `useClass`, `useValue`, `useFactory`, `useExisting`, `multi`](#6-provider-recipes)
7. [`InjectionToken` (with and without factory)](#7-injectiontoken)
8. [Hierarchical injectors: environment tree vs element tree](#8-hierarchical-injectors)
9. [`providers` vs `viewProviders`](#9-providers-vs-viewproviders)
10. [Resolution modifiers: `optional`, `self`, `skipSelf`, `host`](#10-resolution-modifiers)
11. [Singleton vs per-component instance](#11-singleton-vs-per-component-instance)
12. [Service lifecycle & cleanup (the big interview topic)](#12-service-lifecycle--cleanup)
13. [Testing services (short)](#13-testing-services)
14. [🎯 Likely interview questions](#-likely-interview-questions)
15. [📚 References](#-references)

---

## 1. What is DI?

DI is a design pattern where a class **receives** its dependencies instead of creating them with `new`
([docs](https://angular.dev/guide/di)). You interact with Angular's DI in two ways: you **provide** values
(register a recipe in an injector) and you **inject** them (ask an injector for a token).

Benefits highlighted by the docs: maintainability (separation of concerns), reuse, and **testability**
(tests can swap real implementations for doubles) ([docs](https://angular.dev/guide/di)).

Vocabulary you must use precisely:

| Term | Meaning |
| --- | --- |
| **Token** | The key you ask for: a class, an abstract class or an `InjectionToken`. |
| **Provider** | The recipe that tells an injector how to create the value for a token (`useClass`, `useValue`…). |
| **Injector** | The object that stores providers, creates instances lazily and caches them. |
| **Injection context** | A moment in time where an injector is "current", so `inject()` can be called. |

> 💡 **Interview tip:** "An injector creates an instance **lazily, the first time it is requested**, then caches
> it: one instance **per injector that has a provider**." This one sentence explains singletons, per-component
> instances and destruction.

## 2. Defining a service: `@Service()`, `@Injectable()`, `providedIn`

### `@Service()` (new in Angular 22)

Angular 22 introduced the `@Service()` decorator (changelog: "introduce `@Service` decorator", v22.0.0 —
[CHANGELOG](https://github.com/angular/angular/blob/main/CHANGELOG.md)). The docs describe it as an ergonomic
shorthand for `@Injectable({ providedIn: 'root' })`
([docs](https://angular.dev/guide/di/creating-and-using-services#using-the-service-vs-injectable-decorator)):

```ts
import { Service, inject } from '@angular/core';

@Service() // root singleton, tree-shakable
export class DiLog {
  private readonly http = inject(HttpClient); // only inject() is supported
}
```

Differences with `@Injectable` (from the official comparison table,
[docs](https://angular.dev/guide/di/creating-and-using-services#using-the-service-vs-injectable-decorator)):

| | `@Service` | `@Injectable` |
| --- | --- | --- |
| `inject()` | ✅ | ✅ |
| Constructor parameter injection | ❌ | ✅ |
| Implicit root provider | ✅ | ❌ (needs `providedIn: 'root'`) |
| `useClass`/`useValue`/`useExisting`/`useFactory` | ❌ (single `factory` option) | ✅ |
| Non-root scopes (`providedIn: 'platform'`) | ❌ | ✅ |

- `@Service({ autoProvided: false })` → not provided anywhere; you add it to a `providers` array yourself
  ([docs](https://angular.dev/guide/di/creating-and-using-services#opting-out-of-automatic-provisioning)).
- `@Service({ factory: () => … })` → custom creation logic; the factory runs in an injection context
  ([docs](https://angular.dev/guide/di/creating-and-using-services#replacing-the-implementation-with-a-factory)).

Demo: [`di-log.ts`](../../src/app/modules/05-di-services/di-log.ts).

### `@Injectable()` (classic, still everywhere)

```ts
@Injectable({ providedIn: 'root' }) // root singleton, tree-shakable
export class CounterStore {}

@Injectable() // NOT provided: must be listed in some `providers` array
export class ReportCache {}
```

`providedIn: 'root'` (and `@Service()`) gives three guarantees: **one shared instance**, **available
everywhere without registration**, and **tree-shaking** — the class is dropped from the bundle if nothing
injects it ([docs](https://angular.dev/guide/di/creating-and-using-services#how-services-become-available)).

> 💡 **Interview tip:** Why is `providedIn: 'root'` better than `providers: [MyService]` in `app.config.ts`?
> Because a `providers` array references the class, so the bundler must keep it even if unused; `providedIn`
> inverts the reference (the service points to the injector), which makes it tree-shakable
> ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#environmentinjector)).

> ⚠️ **Pitfall:** If you provide the same class in `ApplicationConfig.providers` **and** mark it
> `providedIn: 'root'`, the `ApplicationConfig` provider wins
> ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#platform-injector)).

## 3. `inject()` vs constructor injection

```ts
// ✅ Modern: inject() in a field initializer
export class UserCard {
  private readonly api = inject(UserApi);
  private readonly theme = inject(THEME, { optional: true });
}

// Legacy syntax (still supported) — constructor parameter injection
export class UserCardLegacy {
  constructor(
    private readonly api: UserApi,
    @Optional() @Inject(THEME) private readonly theme: string | null,
  ) {}
}
```

The official style guide says **prefer `inject()`**: more readable with many dependencies, easier to comment,
better type inference, and it works naturally with ES2022 `useDefineForClassFields` (fields that read an
injected dependency don't need to be split between declaration and constructor)
([style guide](https://angular.dev/style-guide#prefer-the-inject-function-over-constructor-parameter-injection)).
An automatic migration exists: `ng generate @angular/core:inject`
([docs](https://angular.dev/reference/migrations/inject-function)).

Other practical advantages of `inject()`:

- Works in **functions**, not only classes: functional guards, resolvers, interceptors, `InjectionToken`
  factories ([docs](https://angular.dev/guide/di#where-can-inject-be-used)).
- Enables reusable "inject helpers" (`injectNativeElement()`…) guarded by `assertInInjectionContext`
  ([docs](https://angular.dev/guide/di/dependency-injection-context#asserts-the-context)).
- Inheritance is simpler: a subclass doesn't have to repeat the parent's constructor parameters and call
  `super(...)` with them. (Demo: the `LeafBase` class in
  [`modifier-leaf.ts`](../../src/app/modules/05-di-services/resolution-modifiers/modifier-leaf.ts) injects in field
  initializers and the subclasses have no constructor at all.)

Resolution options map 1:1 between the two styles: `inject(T, { optional, self, skipSelf, host })` ⇔
`@Optional() @Self() @SkipSelf() @Host()` ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#modifiers-with-constructor-injection)).

## 4. Injection context rules and `runInInjectionContext`

`inject()` only works inside an **injection context**. The docs list exactly where you have one
([docs](https://angular.dev/guide/di/dependency-injection-context)):

1. During construction (constructor) of a class instantiated by DI (`@Service`, `@Injectable`, `@Component`, `@Directive`, `@Pipe`).
2. In **field initializers** of such classes.
3. In the factory of a `useFactory` provider or of `@Injectable`/`@Service`.
4. In the factory of an `InjectionToken`.
5. Within a stack frame that runs in an injection context — e.g. router guards/resolvers, functional
   interceptors, or code wrapped in `runInInjectionContext`.

Calling `inject()` anywhere else (a click handler, `ngOnInit`, a `setTimeout`, an `async` callback after an
`await`) throws **NG0203** ([docs](https://angular.dev/errors/NG0203)).

```ts
export class Example {
  private readonly injector = inject(Injector); // ✅ capture the injector while you can

  onClick() {
    // inject(Foo);                                     ❌ NG0203
    runInInjectionContext(this.injector, () => inject(Foo)); // ✅
    this.injector.get(Foo);                                   // ✅ also fine (no context needed)
  }
}
```

`runInInjectionContext(injector, fn)` runs `fn` with `injector` as the current injector
([docs](https://angular.dev/guide/di/dependency-injection-context#run-within-an-injection-context),
[API](https://angular.dev/api/core/runInInjectionContext)). `EnvironmentInjector` also has a `runInContext(fn)`
method (checked in `@angular/core` typings).

Demo: buttons *"inject() in a click handler"* vs *"runInInjectionContext"* in
[`env-injector-demo.ts`](../../src/app/modules/05-di-services/env-injector/env-injector-demo.ts).

> ⚠️ **Pitfall:** APIs built on `inject()` inherit the rule: `toSignal()`, `toObservable()`,
> `takeUntilDestroyed()` (without argument), `effect()`, `resource()`, `httpResource()`… must be called in an
> injection context, or be given an explicit `injector` / `DestroyRef`
> ([docs](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)).

## 5. Where to provide: root, bootstrap, route, component

The docs list three levels besides `providedIn: 'root'`
([docs](https://angular.dev/guide/di/defining-dependency-providers#where-can-you-specify-providers)):

| Where | Injector | Instance count | Lifetime |
| --- | --- | --- | --- |
| `@Service()` / `providedIn: 'root'` | root `EnvironmentInjector` | 1 per app | app |
| `ApplicationConfig.providers` (`bootstrapApplication`) | root `EnvironmentInjector` | 1 per app | app |
| Route `providers: [...]` | child `EnvironmentInjector` of the route | 1 per route config | see ⚠️ below |
| `@Component/@Directive({ providers })` | `ElementInjector` of that element | 1 **per component instance** | component |

Use bootstrap providers for things that need **configuration or side effects** (`provideRouter(routes)`,
`provideHttpClient(...)`) ([docs](https://angular.dev/guide/di/defining-dependency-providers#why-provide-during-bootstrap-instead-of-using-providedin-root)).

Route providers are visible to all components of that route **and to its guards and resolvers**
([docs](https://angular.dev/guide/di/defining-dependency-providers#route-providers)).

> ⚠️ **Pitfall (route providers lifetime):** by default the router does **not** destroy a route's
> `EnvironmentInjector` when you navigate away. Opt in with
> `provideRouter(routes, withAutoCleanupInjectors())` (public API since 22.2; formerly
> `withExperimentalAutoCleanupInjectors()`, now deprecated), which destroys injectors of routes that are no longer
> active (and not stored by the `RouteReuseStrategy`)
> ([API](https://angular.dev/api/router/withAutoCleanupInjectors)). The default `BaseRouteReuseStrategy`
> returns `true` from `shouldDestroyInjector` (verified in `@angular/router` source).

## 6. Provider recipes

The long form of a provider is `{ provide: TOKEN, use…: … }`. `providers: [Foo]` is shorthand for
`{ provide: Foo, useClass: Foo }` ([docs](https://angular.dev/guide/di/defining-dependency-providers#provider-configuration-object)).

```ts
providers: [
  { provide: Logger, useClass: FancyLogger },                 // new instance of another class
  { provide: LegacyLogger, useExisting: Logger },             // alias → SAME instance
  { provide: APP_SETTINGS, useValue: { apiUrl: '/api' } },    // ready-made value
  {
    provide: API_CLIENT_LABEL,
    useFactory: (s: AppSettings, l: Logger) => l.format(s.apiUrl),
    deps: [APP_SETTINGS, Logger],                              // passed to the factory in order
  },
  { provide: PLUGINS, useValue: 'analytics', multi: true },   // contributes to an array
  { provide: PLUGINS, useValue: 'feature-flags', multi: true },
]
```

- **`useClass`** — substitute an implementation (mock, environment-specific class)
  ([docs](https://angular.dev/guide/di/defining-dependency-providers#useclass)).
- **`useValue`** — constants, config objects, test doubles ([docs](https://angular.dev/guide/di/defining-dependency-providers#usevalue)).
- **`useFactory` + `deps`** — computed at creation time; `deps` lists tokens passed as arguments, and can mark
  one optional with `[new Optional(), Token]` ([docs](https://angular.dev/guide/di/defining-dependency-providers#usefactory)).
  Modern code often calls `inject()` inside the factory instead of using `deps` (factories are an injection context).
- **`useExisting`** — an alias. *Don't confuse with `useClass`*: `useClass` creates a separate instance,
  `useExisting` returns the same one ([docs](https://angular.dev/guide/di/defining-dependency-providers#useexisting)).
- **`multi: true`** — every provider for the token contributes; injecting returns an **array**
  ([docs](https://angular.dev/guide/di/defining-dependency-providers#multiple-providers)). Real examples:
  `HTTP_INTERCEPTORS`, `NG_VALIDATORS`, `APP_INITIALIZER` (legacy).

Demo (table on screen): [`provider-recipes.ts`](../../src/app/modules/05-di-services/provider-recipes/provider-recipes.ts).

> ⚠️ **Pitfall:** Forgetting `multi: true` on one of several providers for a multi token is a classic bug.
> In an environment injector, mixing multi and regular providers for the same token throws
> `Cannot mix multi providers and regular providers`.

> ⚠️ Not confirmed by official docs / opinion: the guide doesn't mention this error; the message comes from
> the `@angular/core` source (`throwMixedMultiProviderError`).

## 7. `InjectionToken`

TypeScript **interfaces and type aliases don't exist at runtime**, so they cannot be DI tokens; use an
`InjectionToken<T>` (or an abstract class) instead
([docs](https://angular.dev/guide/di/defining-dependency-providers#can-typescript-interfaces-be-identifiers-for-injection)).

```ts
export const APP_SETTINGS = new InjectionToken<AppSettings>('APP_SETTINGS'); // must be provided somewhere

export const BUILD_INFO = new InjectionToken<string>('BUILD_INFO', {
  factory: () => `built ${new Date().toISOString()}`, // ← self-providing, tree-shakable
});
```

- The string is only a debug description; identity is the object reference
  ([docs](https://angular.dev/guide/di/defining-dependency-providers#what-is-an-injectiontoken)).
- A token **with a factory is `providedIn: 'root'` by default** (overridable with `providedIn`)
  ([docs](https://angular.dev/guide/di/defining-dependency-providers#injectiontoken-with-providedin-root)).
- The factory runs in an injection context → it may call `inject()`
  ([docs](https://angular.dev/guide/di/dependency-injection-context)).

Demo: [`tokens.ts`](../../src/app/modules/05-di-services/provider-recipes/tokens.ts) (`BUILD_INFO`, `GREETING`).

> 💡 **Interview tip:** abstract class vs `InjectionToken`: an abstract class is both a token **and** a type,
> so `inject(Logger)` is typed `Logger` with no generic. An `InjectionToken` is required for primitives,
> functions, and interfaces.

## 8. Hierarchical injectors

Angular has **two injector hierarchies** ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#types-of-injector-hierarchies)):

```
              NullInjector  (throws NG0201, or returns null with optional)
                   │
            Platform EnvironmentInjector  (providedIn: 'platform')
                   │
            Root EnvironmentInjector       (@Service, providedIn: 'root', ApplicationConfig.providers)
                   │
      Route EnvironmentInjectors           (route `providers`, lazy routes)
        ┊
        ┊  (each component is created with an EnvironmentInjector as fallback)
        ┊
ElementInjector tree (one per element that has providers / directives)
  <app-root> → <app-page> → <app-card providers=[X]> → <app-child>
```

- **EnvironmentInjector hierarchy**: configured by `@Service()`/`providedIn` and `providers` arrays in
  `ApplicationConfig` and routes. The router creates child environment injectors
  ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#environmentinjector),
  [platform](https://angular.dev/guide/di/hierarchical-dependency-injection#platform-injector)).
- **ElementInjector hierarchy**: created implicitly for DOM elements; empty unless a component/directive
  declares `providers`/`viewProviders`. "When the component instance is destroyed, so is that service
  instance." Components and directives on the same element share an injector
  ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#elementinjector)).
- (NgModule apps: `ModuleInjector` plays the environment role.)

**Resolution rules** ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#resolution-rules)):

1. Walk **up the ElementInjector tree** from the requesting element.
2. If not found, go back to the requesting element and walk **up the EnvironmentInjector tree**.
3. Still not found → error (**NG0201** "No provider found", [docs](https://angular.dev/errors/NG0201)).
4. The **first** provider found wins — a local provider shadows an ancestor's.

## 9. `providers` vs `viewProviders`

`viewProviders` are visible only to the component's **own view (template)**; content projected through
`<ng-content>` cannot see them. `providers` are visible to both
([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#providers-vs-viewproviders)).

```ts
@Component({
  selector: 'app-view-providers-host',
  providers:     [{ provide: THEME, useValue: 'from providers 🌍' }],
  viewProviders: [{ provide: THEME, useValue: 'from viewProviders 🔒' }],
  template: `<app-theme-reader label="in my template" /> <ng-content />`,
})
```

On screen: the reader declared in the host's template shows **viewProviders 🔒**; the reader projected from
the page shows **providers 🌍** (asserted in
[`di-services.spec.ts`](../../src/app/modules/05-di-services/di-services.spec.ts)).
Use case: a library component that wants to keep an internal service private from consumers' projected content.

## 10. Resolution modifiers

Three categories ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#types-of-modifiers)):
*what if not found* (`optional`), *where to start* (`skipSelf`), *where to stop* (`self`, `host`).
`host`+`self` and `skipSelf`+`self` can't be combined.

| Option | Effect |
| --- | --- |
| `optional: true` | return `null` instead of throwing ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#optional)) |
| `self: true` | only look in the **current element's** injector ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#self)) |
| `skipSelf: true` | start in the **parent** element injector ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#skipself)) |
| `host: true` | stop at the host component boundary ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#host)) |

Values shown on screen by [`modifier-leaf.ts`](../../src/app/modules/05-di-services/resolution-modifiers/modifier-leaf.ts)
(the parent provides `THEME = 'parent 🌿'` in its `providers`), verified by the spec:

| | Leaf **without** own provider | Leaf **with** `'leaf 🍁'` |
| --- | --- | --- |
| `inject(THEME)` | parent 🌿 | leaf 🍁 |
| `{ self: true, optional: true }` | null | leaf 🍁 |
| `{ skipSelf: true }` | parent 🌿 | parent 🌿 |
| `{ host: true, optional: true }` | **null** | leaf 🍁 |

> ⚠️ **Pitfall (`host`):** the leaf without a provider gets `null` with `host: true` even though its parent
> component provides `THEME`. The leaf's element lives in the **parent's template**; `host` stops the lookup at
> that template's host element, and from a child's point of view the host's **`providers` are not
> searched there — only its `viewProviders` are**. If the parent used `viewProviders`, the leaf would find it.

> ⚠️ Not confirmed by official docs / opinion: this precise rule comes from observed behaviour (spec in this
> repo) and the `isHostSpecialCase` branch of Angular's node-injector source; the guide's `host` section only
> shows the simple "own provider" case.

Classic real-world use: a child directive that needs its parent form/group:
`inject(ControlContainer, { host: true, skipSelf: true })`, or a recursive tree node
`inject(TreeNode, { optional: true, skipSelf: true })` to get its parent node
([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#skipself-option-with-optional)).

## 11. Singleton vs per-component instance

- **Root** (`@Service()`, `providedIn: 'root'`): one instance for the whole app — shared state.
- **Component `providers`**: one instance **per component instance**, shared by that component's
  subtree (children inject the nearest one). Use for isolated state: a form wizard, an editor tab, a
  modal… ([docs](https://angular.dev/guide/di/defining-dependency-providers#component-or-directive-providers)).
- A component `providers` entry **shadows** a root provider of the same token for its subtree.

Demo: [`instance-scope.ts`](../../src/app/modules/05-di-services/instance-scope/instance-scope.ts).
`CounterStore` is `providedIn: 'root'`. Grey cards inject it directly → same instance (#1). Purple cards
are wrapped in `ScopedCounterCard` with `providers: [CounterStore]` → each gets its own (#2, #3).
Removing the root cards doesn't destroy #1; removing the purple cards destroys #2 and #3.

> ⚠️ **Pitfall:** "Singleton" in Angular means **one per injector**, not one per JS runtime. Providing a
> `providedIn: 'root'` service again in a lazy route's or component's `providers` silently creates a second
> instance — a frequent "why is my state not shared?" bug.

## 12. Service lifecycle & cleanup

### "What is the first lifecycle hook of a service?"

**Trick question.** Services have **no `ngOnInit`** and no change-detection hooks. The constructor is not a
lifecycle hook — it is just JavaScript instantiation, performed lazily by the injector the first time the
token is injected. The **only** lifecycle hook a service gets is **`ngOnDestroy`**: the `OnDestroy` API is
"called when a directive, pipe, **or service** is destroyed" ([API](https://angular.dev/api/core/OnDestroy)).
Component hooks (`ngOnInit`, `ngOnChanges`, `ngAfterViewInit`…) are for components/directives
([docs](https://angular.dev/guide/components/lifecycle)).

> 💡 **Interview tip:** put initialization logic in the constructor / field initializers (that's where
> `inject()` works), and keep it cheap — it runs on first injection.

### When is a service destroyed?

**When the injector that created it is destroyed.** That's the key sentence.

| Provided in… | Destroyed when… |
| --- | --- |
| root / `ApplicationConfig` | the application is destroyed (`appRef.destroy()`, e.g. in tests between TestBed runs) |
| component/directive `providers` | that component/directive instance is destroyed ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#elementinjector)) |
| route `providers` | the route's EnvironmentInjector is destroyed — not by default; opt in with `withAutoCleanupInjectors()` ([API](https://angular.dev/api/router/withAutoCleanupInjectors)) |
| a manually created injector | you call `injector.destroy()` ([API](https://angular.dev/api/core/createEnvironmentInjector)) |

### "Is there another way than `ngOnDestroy` to clean up a service?" — yes, four

1. **`inject(DestroyRef).onDestroy(cb)`** — `DestroyRef` "lets you set callbacks to run for any cleanup or
   destruction behavior. … If `DestroyRef` is injected in a component or directive, the callbacks run when that
   component or directive is destroyed. **Otherwise the callbacks run when a corresponding injector is
   destroyed**" ([API](https://angular.dev/api/core/DestroyRef)). In a service, that's the injector that created
   it. `onDestroy` returns an unregister function, and `destroyRef.destroyed` tells you if it's already gone
   ([docs](https://angular.dev/guide/components/lifecycle#destroyref)).

   ```ts
   @Injectable({ providedIn: 'root' })
   export class CounterStore {
     private readonly destroyRef = inject(DestroyRef);
     constructor() {
       this.destroyRef.onDestroy(() => console.log('cleanup')); // keeps setup next to cleanup
     }
   }
   ```

2. **`takeUntilDestroyed()`** in the service — completes a stream when the service's `DestroyRef` fires.
   Without argument it must be called in an injection context (constructor / field initializer); otherwise
   pass a `DestroyRef` ([docs](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)). `toSignal()`
   also unsubscribes automatically "when the component **or service** which calls `toSignal` is destroyed"
   ([docs](https://angular.dev/ecosystem/rxjs-interop#create-a-signal-from-an-rxjs-observable-with-tosignal)).

3. **Scope the service to something that dies**: provide it in a component's `providers` (or a route with
   auto-cleanup) instead of root → its injector's destruction destroys it (demo: purple cards).

4. **Own the injector**: create an `EnvironmentInjector` with
   `createEnvironmentInjector(providers, parent)` and call `.destroy()` — it runs `ngOnDestroy` and the
   `DestroyRef` callbacks of everything it created ([API](https://angular.dev/api/core/createEnvironmentInjector)).
   `Injector.create({ providers, parent })` returns a `DestroyableInjector` with `destroy()` too
   ([API](https://angular.dev/api/core/DestroyableInjector)).

Demo: in [`counter-store.ts`](../../src/app/modules/05-di-services/instance-scope/counter-store.ts) the service
logs from **all three** mechanisms (`ngOnDestroy`, `DestroyRef.onDestroy`, `takeUntilDestroyed` + `finalize`);
[`env-injector-demo.ts`](../../src/app/modules/05-di-services/env-injector/env-injector-demo.ts) creates and
destroys an injector by hand.

> ⚠️ **Pitfall:** a root service that subscribes to something infinite (`interval`, a WebSocket, a store
> selector) lives as long as the app — fine for app-wide state, but if the service was supposed to be
> feature-scoped, it is a leak. Scope it, or clean up explicitly.

> ⚠️ **Pitfall (testing):** spying on `instance.ngOnDestroy` after creation doesn't work for provider
> services — Angular captured the prototype's method when it registered the destroy hook. Assert on side
> effects instead (as the spec does).

> ⚠️ Not confirmed by official docs / opinion: observed while writing this module's spec.

## 13. Testing services

Root services can be retrieved with `TestBed.inject(Service)`; override dependencies with
`providers: [{ provide: Dep, useValue: fake }]`
([docs](https://angular.dev/guide/testing/services)). See
[`di-services.spec.ts`](../../src/app/modules/05-di-services/di-services.spec.ts) for tests that prove the
behaviours of this page (scoped destruction, manual injector destruction, modifiers, viewProviders).

---

## 🎯 Likely interview questions

1. **What's the difference between `@Injectable({ providedIn: 'root' })` and adding the service to `providers` in `app.config.ts`?**
   <details><summary>Answer</summary>Both give one app-wide instance, but <code>providedIn</code> is tree-shakable (dropped if never injected) and needs no registration; <code>ApplicationConfig.providers</code> always ships the class and overrides the <code>providedIn</code> provider. In v22, <code>@Service()</code> is the shorthand for the former. (<a href="https://angular.dev/guide/di/hierarchical-dependency-injection#environmentinjector">docs</a>)</details>

2. **Where can you call `inject()`?**
   <details><summary>Answer</summary>In an injection context: constructor and field initializers of DI-created classes, provider/token factories, functional guards/resolvers/interceptors, and inside <code>runInInjectionContext</code>. Elsewhere → NG0203. (<a href="https://angular.dev/guide/di/dependency-injection-context">docs</a>)</details>

3. **What is the first lifecycle hook of a service?**
   <details><summary>Answer</summary>Trick question: services have no <code>ngOnInit</code>; the constructor is not a hook. The only hook is <code>ngOnDestroy</code>. (<a href="https://angular.dev/api/core/OnDestroy">API</a>)</details>

4. **How else can a service clean up besides `ngOnDestroy`?**
   <details><summary>Answer</summary><code>inject(DestroyRef).onDestroy()</code>, <code>takeUntilDestroyed()</code>/<code>toSignal()</code>, scoping it to a component/route so its injector's destruction destroys it, or creating an <code>EnvironmentInjector</code> manually and calling <code>destroy()</code>. (<a href="https://angular.dev/api/core/DestroyRef">API</a>)</details>

5. **How do you get one instance per component?**
   <details><summary>Answer</summary>Add the service to the component's <code>providers</code>. Each component instance gets its own instance in its ElementInjector, destroyed with the component. (<a href="https://angular.dev/guide/di/defining-dependency-providers#component-or-directive-providers">docs</a>)</details>

6. **`useClass` vs `useExisting`?**
   <details><summary>Answer</summary><code>useClass</code> creates a new instance of the given class for that token; <code>useExisting</code> aliases another token and returns the same instance. (<a href="https://angular.dev/guide/di/defining-dependency-providers#useexisting">docs</a>)</details>

7. **`providers` vs `viewProviders`?**
   <details><summary>Answer</summary><code>viewProviders</code> are only visible to the component's own template, not to projected (<code>&lt;ng-content&gt;</code>) content; <code>providers</code> are visible to both. (<a href="https://angular.dev/guide/di/hierarchical-dependency-injection#providers-vs-viewproviders">docs</a>)</details>

8. **Explain the resolution algorithm.**
   <details><summary>Answer</summary>Walk up the ElementInjector tree, then (from the requesting element) up the EnvironmentInjector tree; first match wins; nothing found → NG0201 unless <code>optional</code>. (<a href="https://angular.dev/guide/di/hierarchical-dependency-injection#resolution-rules">docs</a>)</details>

9. **Why can't an interface be a DI token?**
   <details><summary>Answer</summary>Interfaces are erased at compile time, so nothing exists at runtime to use as a key; use an <code>InjectionToken</code> or an abstract class. (<a href="https://angular.dev/guide/di/defining-dependency-providers#can-typescript-interfaces-be-identifiers-for-injection">docs</a>)</details>

10. **Is a route-level provided service destroyed when you leave the route?**
    <details><summary>Answer</summary>Not by default. Opt in with <code>withAutoCleanupInjectors()</code> (public API since 22.2) so the router destroys unused route injectors. (<a href="https://angular.dev/api/router/withAutoCleanupInjectors">API</a>)</details>

## 📚 References

- https://angular.dev/guide/di
- https://angular.dev/guide/di/creating-and-using-services
- https://angular.dev/guide/di/dependency-injection-context
- https://angular.dev/guide/di/defining-dependency-providers
- https://angular.dev/guide/di/hierarchical-dependency-injection
- https://angular.dev/guide/components/lifecycle
- https://angular.dev/guide/testing/services
- https://angular.dev/style-guide#prefer-the-inject-function-over-constructor-parameter-injection
- https://angular.dev/reference/migrations/inject-function
- https://angular.dev/ecosystem/rxjs-interop
- https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed
- https://angular.dev/api/core/DestroyRef
- https://angular.dev/api/core/OnDestroy
- https://angular.dev/api/core/runInInjectionContext
- https://angular.dev/api/core/createEnvironmentInjector
- https://angular.dev/api/core/DestroyableInjector
- https://angular.dev/api/router/withAutoCleanupInjectors
- https://angular.dev/errors/NG0203
- https://angular.dev/errors/NG0201
- https://github.com/angular/angular/blob/main/CHANGELOG.md
