# 07 · Routing

The Angular Router maps URLs to components, lazy loads code, runs guards and resolvers, and exposes
route state (params, query params, data) to components. This module uses **Angular 22** APIs:
standalone `Routes`, functional guards/resolvers, `withComponentInputBinding()` and signals.

Demo: [`src/app/modules/07-routing/`](../../src/app/modules/07-routing/) (route config:
[`routing.routes.ts`](../../src/app/modules/07-routing/routing.routes.ts)). The claims about
component reuse, redirects and guards are checked by a real test:
[`product-detail.spec.ts`](../../src/app/modules/07-routing/product-detail/product-detail.spec.ts).

## Table of contents

1. [Defining routes & child routes](#1-defining-routes--child-routes)
2. [Navigating: RouterLink, RouterLinkActive, Router.navigate](#2-navigating-routerlink-routerlinkactive-routernavigate)
3. [Reading route state: input binding vs ActivatedRoute](#3-reading-route-state-input-binding-vs-activatedroute)
4. [Why the snapshot can be stale (component reuse)](#4-why-the-snapshot-can-be-stale-component-reuse)
5. [Query params & fragments](#5-query-params--fragments)
6. [Functional guards](#6-functional-guards)
7. [Legacy class-based guards (interview context)](#7-legacy-class-based-guards-interview-context)
8. [Resolvers](#8-resolvers)
9. [Redirects (static and function)](#9-redirects-static-and-function)
10. [Lazy loading](#10-lazy-loading)
11. [Route titles](#11-route-titles)
12. [Route-level providers](#12-route-level-providers)
13. [Preloading strategies](#13-preloading-strategies)
14. [Router events](#14-router-events)
15. [Testing routes](#15-testing-routes)

---

## 1. Defining routes & child routes

A route is an object with at least a `path` and something to render (`component`, `loadComponent`),
a redirect (`redirectTo`) or `children` ([docs](https://angular.dev/guide/routing/define-routes)).
Child routes render inside the `<router-outlet>` of their parent's component.

```ts
// routing.routes.ts (simplified)
export default [
  {
    path: '',
    loadComponent: () => import('./routing-page'), // has its own <router-outlet />
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      { path: 'products', loadComponent: () => import('./product-list/product-list') },
      { path: 'products/:id', loadComponent: () => import('./product-detail/product-detail') },
      { path: '**', redirectTo: 'products' },
    ],
  },
] satisfies Routes;
```

- `:id` is a **route parameter**; `**` is a **wildcard** that matches anything — put it last
  ([docs](https://angular.dev/guide/routing/define-routes#wildcards)).
- Routes are matched **in order, first match wins**
  ([docs](https://angular.dev/guide/routing/define-routes#how-angular-matches-urls)).
- The app registers routes once with `provideRouter(routes, ...features)` (see `app.config.ts`).

> 💡 **Interview tip:** "Order matters" is the classic gotcha: a `**` route or a too generic prefix route placed
> first will swallow everything after it.

[demo](../../src/app/modules/07-routing/routing.routes.ts)

## 2. Navigating: RouterLink, RouterLinkActive, Router.navigate

**Declarative** navigation uses the `RouterLink` directive
([docs](https://angular.dev/guide/routing/navigate-to-routes#how-to-use-routerlink)):

```html
<a routerLink="products">Products</a>                 <!-- relative to the current route -->
<a [routerLink]="['..', nextId()]">Next</a>           <!-- commands array, '..' = parent -->
<a routerLink="/routing/products">Absolute</a>
```

Links without a leading `/` are **relative to the route of the component that declares the link**
([docs](https://angular.dev/guide/routing/navigate-to-routes#how-relative-urls-work)).

`RouterLinkActive` adds CSS classes when a link's URL is active; `ariaCurrentWhenActive` sets
`aria-current` for accessibility. Use `[routerLinkActiveOptions]="{ exact: true }"` to only match the
exact URL ([docs](https://angular.dev/guide/routing/read-route-state#detect-active-current-route-with-routerlinkactive)).

**Programmatic** navigation uses the `Router` service
([docs](https://angular.dev/guide/routing/navigate-to-routes#programmatic-navigation-to-routes)):

```ts
private readonly router = inject(Router);
private readonly route = inject(ActivatedRoute);

this.router.navigate(['products', 2], {   // commands array
  relativeTo: this.route,                // without it, commands are resolved from the root
  queryParams: { from: 'navigate' },
  fragment: 'reviews',
});
this.router.navigateByUrl('/routing/legacy-product/3'); // full URL string or UrlTree
```

Both return a `Promise<boolean>` (true = navigation succeeded). For `navigate`, "if no starting route is
provided, the navigation is absolute" ([API](https://angular.dev/api/router/Router)).

> ⚠️ **Pitfall:** `router.navigate(['child'])` **without `relativeTo`** is resolved from the root, unlike
> `routerLink="child"` in a template, which is relative by default.

[demo](../../src/app/modules/07-routing/routing-page.ts)

## 3. Reading route state: input binding vs ActivatedRoute

### 3.1 Component input binding (modern)

With `provideRouter(routes, withComponentInputBinding())` (enabled in this project's `app.config.ts`),
the router sets **inputs whose name matches** a path param, matrix param, query param, static `data` key,
resolver key (or route resource) ([docs](https://angular.dev/guide/routing/common-router-tasks#add-withcomponentinputbinding)).

```ts
export default class ProductDetail {
  readonly id = input.required<string>();        // :id path param
  readonly product = input.required<Product>();  // resolve: { product: productResolver }
  readonly section = input<string>();            // data: { section: 'catalog' }
  readonly from = input<string>();               // ?from=legacy
}
```

Key facts (all from the [common router tasks guide](https://angular.dev/guide/routing/common-router-tasks#input-binding-priority)):

- **Priority when keys collide** (highest first): route resources → `data` & resolvers → path/matrix params → query params.
- An input with **no matching key is set to `undefined`** (to avoid stale data) — so type optional inputs
  as `T | undefined`, or provide a default with an input `transform` / `linkedSignal`.
- `withComponentInputBinding({ queryParams: false })` disables query-param binding, and
  `unmatchedInputBehavior: 'undefinedIfStale'` keeps initial values for inputs never provided by the router.
- **v22 default: child routes inherit parent params and data** (`paramsInheritanceStrategy: 'always'`);
  `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })` restores the legacy behaviour where only
  empty-path parents were inherited ([docs](https://angular.dev/guide/routing/common-router-tasks#inherit-parent-route-data)).
  So a child component can bind a parent's `:orgId` as an input.
- Param values are **strings**: convert them (`Number(this.id())` or `input({ transform: numberAttribute })`).

### 3.2 ActivatedRoute (classic, still everywhere)

`ActivatedRoute` exposes **observables** (`params`, `paramMap`, `queryParams`, `queryParamMap`,
`fragment`, `data`, `url`, `title`) and a **`snapshot`** ([API](https://angular.dev/api/router/ActivatedRoute)):

```ts
private readonly route = inject(ActivatedRoute);
// Observable -> always up to date
protected readonly idFromParamMap = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))));
// Snapshot -> a static picture taken at that moment
protected readonly idFromSnapshot = this.route.snapshot.paramMap.get('id');
```

"Snapshots are static and will not reflect future changes"
([docs](https://angular.dev/guide/routing/read-route-state#understanding-route-snapshots)).

> 💡 **Interview tip:** `paramMap` (a `ParamMap` with `get()`/`getAll()`/`has()`) vs `params` (a plain object):
> same data, `paramMap` is the more type-friendly API. Either way, values are strings.

[demo](../../src/app/modules/07-routing/product-detail/product-detail.ts)

## 4. Why the snapshot can be stale (component reuse)

The default `RouteReuseStrategy` (`BaseRouteReuseStrategy`) **reuses a route when the matched route
config is identical**, "when just the route parameters, query parameters or fragment change (that is,
the existing component is _reused_)" ([API](https://angular.dev/api/router/BaseRouteReuseStrategy)).

So navigating `/products/1` → `/products/2`:

| Source | Value after the 2nd navigation |
|---|---|
| `id = input()` (input binding) | `2` ✅ updated by the router |
| `route.paramMap` observable | `2` ✅ emits again |
| `route.snapshot.paramMap.get('id')` read in a field initializer / constructor / `ngOnInit` | `1` ❌ **stale** — the constructor did not run again |

Try it on the page with the "Next product →" link: the instance number stays the same and the
snapshot row turns red. The spec
[`product-detail.spec.ts`](../../src/app/modules/07-routing/product-detail/product-detail.spec.ts)
asserts exactly this.

> ⚠️ **Pitfall:** `this.route.snapshot.paramMap.get('id')` in `ngOnInit` is fine **only if** the component can't
> navigate to itself with another param (e.g. no "next/previous" links, no search updating its own query params).

> 💡 **Interview tip:** If asked "how do I force a fresh component?", the answers are: react to the param
> (observable/input signal — preferred) or provide a custom `RouteReuseStrategy` whose `shouldReuseRoute`
> returns `false` ([docs](https://angular.dev/guide/routing/customizing-route-behavior#route-reuse-strategy)).

## 5. Query params & fragments

Query params (`?sort=price`) are optional, not part of route matching, and shared by all routes; the
fragment is the `#anchor` part ([docs](https://angular.dev/guide/routing/read-route-state#query-parameters)).

```html
<a routerLink="." [queryParams]="{ sort: 'price' }" queryParamsHandling="merge">price</a>
<a [routerLink]="[]" fragment="reviews">#reviews</a>
```

`queryParamsHandling`: `'replace'` (default), `'merge'` (merge with current), `'preserve'` (keep current
and ignore new ones) ([API](https://angular.dev/api/router/RouterLink)).

Read them with an input (`sort = input<string | undefined>()`), `route.queryParamMap`, or
`route.fragment` (an `Observable<string | null>`).

> 💡 **Interview tip:** Matrix params (`/products;view=grid`) belong to a single segment, query params to
> the whole URL ([docs](https://angular.dev/guide/routing/read-route-state#matrix-parameters)).

[demo](../../src/app/modules/07-routing/product-list/product-list.html)

## 6. Functional guards

Guards are functions in the route config, run in an **injection context** (so `inject()` works). All
guards can return `boolean`, `UrlTree`, `RedirectCommand`, or a `Promise`/`Observable` of those; for
async results "Router uses the first emitted value and then unsubscribes"
([docs](https://angular.dev/guide/routing/route-guards#route-guard-return-types)).

| Guard | Signature (v22) | Purpose |
|---|---|---|
| `CanActivateFn` | `(route, state)` | May this route be activated? |
| `CanActivateChildFn` | `(childRoute, state)` | Same, for every child of a route |
| `CanDeactivateFn<T>` | `(component, currentRoute, currentState, nextState)` | May we leave? (unsaved changes) |
| `CanMatchFn` | `(route, segments, currentSnapshot)` | May this route config even be **matched**? |

Signatures verified in `node_modules/@angular/router/types/_router_module-chunk.d.ts` and on
[CanMatchFn](https://angular.dev/api/router/CanMatchFn) / [CanDeactivateFn](https://angular.dev/api/router/CanDeactivateFn).

```ts
export const authGuard: CanActivateFn = () => {
  const state = inject(RoutingDemoState);
  const router = inject(Router);
  return state.loggedIn() ? true : new RedirectCommand(router.parseUrl('/routing/denied'));
};

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() || window.confirm('You have unsaved changes. Leave anyway?');

export const betaDashboardGuard: CanMatchFn = () => inject(RoutingDemoState).betaDashboard();
```

- **`RedirectCommand`** (v18+) = redirect target + `NavigationBehaviorOptions` (e.g. `skipLocationChange`)
  ([API](https://angular.dev/api/router/RedirectCommand)). Returning a `UrlTree` also redirects.
- **`CanMatch` returning `false` does not block**: the router tries the next routes, which enables two
  configs with the same path (feature flags, A/B tests, role-based components)
  ([docs](https://angular.dev/guide/routing/route-guards#canmatch)). The demo has two `dashboard` routes.
- `CanMatch` replaces the deprecated `canLoad` (`@deprecated Use canMatch instead` in the typings).
- Multiple guards in one array **start concurrently**; the router uses the result of the **first guard in
  array order** that did not return `true` ([docs](https://angular.dev/guide/routing/route-guards#applying-guards-to-routes)).

> ⚠️ **Pitfall:** guards are **UX, not security**. Code shipped to the browser can be bypassed; the server must
> authorize every API call.

> ⚠️ **Pitfall:** `CanDeactivate` only protects **in-app** navigations. Closing the tab or typing a URL needs
> a `beforeunload` listener as well.

[demo](../../src/app/modules/07-routing/guards/guards.ts)

## 7. Legacy class-based guards (interview context)

Historically guards were `@Injectable` classes implementing `CanActivate`, `CanDeactivate<T>`, etc.,
and you listed the **class token** in the route. In v22 the interfaces still exist, but passing a token
in `canActivate`/`canMatch`/... is typed as `DeprecatedGuard` and marked `@deprecated` in the typings.
The migration path is `mapToCanActivate([MyGuard])` (or `() => inject(MyGuard).canActivate(...)`)
([API](https://angular.dev/api/router/mapToCanActivate)).

```ts
// Legacy syntax (still supported)
@Injectable({ providedIn: 'root' })
export class LegacyAuthGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot): MaybeAsync<GuardResult> { /* ... */ }
}
{ path: 'legacy-admin', canActivate: mapToCanActivate([LegacyAuthGuard]), ... }
```

> 💡 **Interview tip:** "Why functional guards?" → less boilerplate, composable (a guard can call another
> function), tree-shakable, no NgModule providers needed, `inject()` gives DI anyway.

[demo](../../src/app/modules/07-routing/guards/guards.ts)

## 8. Resolvers

A `ResolveFn<T>` fetches data **before** the route activates; the navigation waits for it. The result is
available in `ActivatedRoute.data` (and as an input, with input binding)
([docs](https://angular.dev/guide/routing/data-resolvers)). In v22 a resolver can also return a
`RedirectCommand` (`ResolveFn<T> = (route, state) => MaybeAsync<T | RedirectCommand>` in the typings).

```ts
export const productResolver: ResolveFn<Product> = async (route) => {
  const router = inject(Router);            // inject() BEFORE any await
  const products = inject(ProductService);
  const product = await products.getById(Number(route.paramMap.get('id')));
  return product ?? new RedirectCommand(router.parseUrl('/routing/products?missing=1'));
};
// route: { path: 'products/:id', resolve: { product: productResolver }, ... }
```

- An uncaught error in a resolver produces a `NavigationError` and the navigation fails; handle errors
  centrally with `withNavigationErrorHandler`, via router events, or inside the resolver
  ([docs](https://angular.dev/guide/routing/data-resolvers)).
- Trade-off: the user sees **nothing new** until data arrives. The docs suggest route **resources**
  (`resources` on the route, developer preview in 22.2) for non-blocking, signal-based loading
  ([docs](https://angular.dev/guide/routing/data-fetching-with-resources)).

> ⚠️ **Pitfall:** `inject()` only works synchronously in the injection context. In an `async` resolver,
> call every `inject()` before the first `await`.

[demo](../../src/app/modules/07-routing/guards/resolvers.ts)

## 9. Redirects (static and function)

```ts
{ path: '', redirectTo: 'products', pathMatch: 'full' },
{
  path: 'legacy-product/:id',
  redirectTo: ({ params }) =>
    inject(Router).createUrlTree(['/routing/products', params['id']], { queryParams: { from: 'legacy' } }),
},
```

- An empty-path redirect needs `pathMatch: 'full'`, otherwise `''` matches every URL as a prefix
  ([docs](https://angular.dev/guide/routing/redirecting-routes#pathmatch-full)).
- `redirectTo` can be a **`RedirectFunction`** returning `string | UrlTree` (or an Observable/Promise of
  it). It runs in an **injection context** and receives a **partial snapshot** (params, queryParams, data,
  ...) because matching is not finished ([API](https://angular.dev/api/router/RedirectFunction),
  [docs](https://angular.dev/guide/routing/redirecting-routes#conditional-redirects)).
- A string is absolute if it starts with `/` (or the function returns a `UrlTree`), otherwise relative.

[demo](../../src/app/modules/07-routing/routing.routes.ts)

## 10. Lazy loading

- `loadComponent: () => import('./x')` lazy loads one standalone component.
- `loadChildren: () => import('./x.routes')` lazy loads a whole set of child routes.
- With a **default export**, no `.then(m => m.X)` is needed (`DefaultExport` in the typings).
- The router runs `loadComponent`/`loadChildren` **in the route's injection context**
  ([docs](https://angular.dev/guide/routing/loading-strategies)).

**This playground itself is the example:** `app.routes.ts` lazy loads each module with
`loadChildren: () => import('./modules/07-routing/routing.routes')`, and inside this module every child
uses `loadComponent`. Watch `RouteConfigLoadStart/End` in the router events log the first time you open
a child.

> 💡 **Interview tip:** Lazy loading is per **import()**: the bundler creates a chunk for each dynamic import.
> Importing the same component statically elsewhere puts it back in the eager bundle.

## 11. Route titles

`title` sets `document.title` when the route activates; it can be a string or a `ResolveFn<string>`
([docs](https://angular.dev/guide/routing/define-routes#page-titles)). The default strategy takes the title of the **deepest primary route** ([API](https://angular.dev/api/router/TitleStrategy)).
For a global pattern ("Page · My App"), extend `TitleStrategy`
([API](https://angular.dev/api/router/TitleStrategy)).

```ts
{ path: 'products/:id', title: productTitleResolver, ... }
export const productTitleResolver: ResolveFn<string> = (route) =>
  `${inject(ProductService).nameOf(Number(route.paramMap.get('id')))} · Routing`;
```

> 💡 **Interview tip:** Titles are an accessibility requirement: screen readers announce them on navigation.

## 12. Route-level providers

`providers` on a route creates an **environment injector** for that route and its children
([docs](https://angular.dev/guide/routing/define-routes#route-level-providers-for-dependency-injection)):

```ts
{
  path: 'scoped',
  providers: [{ provide: ROUTE_GREETING, useValue: 'Hello from the route injector 👋' }, ScopedVisitCounter],
  loadComponent: () => import('./demo-pages/scoped-provider-demo'),
}
```

The demo counter **keeps its value** when you leave and come back: the component is recreated, but the
route injector is not destroyed. v22.2 adds the opt-in `withAutoCleanupInjectors()` to destroy unused
route injectors ([API](https://angular.dev/api/router/withAutoCleanupInjectors)).

> 💡 **Interview tip:** Route providers replace the old "lazy NgModule providers" pattern: a service provided on a
> lazy route gets its own instance, separate from root.

[demo](../../src/app/modules/07-routing/demo-pages/scoped-provider-demo.ts)

## 13. Preloading strategies

Lazy chunks are downloaded on first navigation by default. `withPreloading(strategy)` lets a
`PreloadingStrategy` download them proactively in the background ([API](https://angular.dev/api/router/withPreloading)).
`PreloadAllModules` "preloads all modules as quickly as possible"
([API](https://angular.dev/api/router/PreloadAllModules)); `NoPreloading` is "enabled by default"
([API](https://angular.dev/api/router/NoPreloading)):

```ts
provideRouter(routes, withPreloading(PreloadAllModules));  // everything, ASAP
```

Custom strategy: implement `PreloadingStrategy.preload(route, load)`
([API](https://angular.dev/api/router/PreloadingStrategy)):

```ts
@Injectable({ providedIn: 'root' })
export class FlagPreloading implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return route.data?.['preload'] ? load() : of(null);
  }
}
// provideRouter(routes, withPreloading(FlagPreloading))
```

This project does **not** enable preloading (`app.config.ts` is shared), so you can observe lazy loading.

> 💡 **Interview tip:** Preloading vs `@defer`: preloading is for **routes** (navigation chunks); `@defer` is for
> **parts of a template**. `@defer` has its own `prefetch` trigger (module 12).

## 14. Router events

`Router.events` is an `Observable<Event>` emitting, in order: `NavigationStart`,
`RouteConfigLoadStart/End` (lazy), `RoutesRecognized`, `GuardsCheckStart/End`, `ResolveStart/End`,
activation events, then `NavigationEnd`, `NavigationCancel` (a guard returned `false`, a `UrlTree` or a
`RedirectCommand`) or `NavigationError`; plus `NavigationSkipped` and `Scroll`
([docs](https://angular.dev/guide/routing/router-reference#router-events),
[guide](https://angular.dev/guide/routing/lifecycle-and-events)).

```ts
this.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
  this.log.add(EventType[e.type]); // every event has a `type` (EventType enum)
});
```

- Typical uses: loading bar (`NavigationStart` → `NavigationEnd|Cancel|Error`), analytics, scroll handling.
- `withDebugTracing()` logs all events to the console ([API](https://angular.dev/api/router/withDebugTracing)).
- `router.currentNavigation()` is a **signal** of the in-flight navigation; `getCurrentNavigation()` is
  `@deprecated 20.2` in the typings ([API](https://angular.dev/api/router/Router)).

> ⚠️ **Pitfall:** don't use `e.constructor.name` to identify events: class names are minified in production.
> Use `instanceof` or the `type` field.

[demo](../../src/app/modules/07-routing/routing-page.ts)

## 15. Testing routes

`RouterTestingHarness` navigates for real and gives access to the routed component
([API](https://angular.dev/api/router/testing/RouterTestingHarness), [guide](https://angular.dev/guide/routing/testing)):

```ts
TestBed.configureTestingModule({ providers: [provideRouter(routes, withComponentInputBinding())] });
const harness = await RouterTestingHarness.create();
await harness.navigateByUrl('/routing/admin');
expect(TestBed.inject(Router).url).toBe('/routing/denied');
```

[demo spec](../../src/app/modules/07-routing/product-detail/product-detail.spec.ts)

---

## 🎯 Likely interview questions

1. **`snapshot` vs `paramMap` observable — when is the snapshot wrong?**
   <details><summary>Answer</summary>When the router reuses the component (same route config, only params/query/fragment change), the constructor/ngOnInit don't run again, so a snapshot read there keeps the old value. Use the observable or input binding. (<a href="https://angular.dev/api/router/BaseRouteReuseStrategy">BaseRouteReuseStrategy</a>)</details>
2. **What does `withComponentInputBinding()` bind, and what happens to an input with no matching key?**
   <details><summary>Answer</summary>Path, matrix and query params, static data, resolved data and route resources, by input name. Unmatched inputs are set to <code>undefined</code>. (<a href="https://angular.dev/guide/routing/common-router-tasks#input-binding-priority">docs</a>)</details>
3. **`CanActivate` vs `CanMatch`?**
   <details><summary>Answer</summary>CanActivate runs after matching and blocks/redirects. CanMatch runs during matching; <code>false</code> makes the router try the next routes (same path, other component). The guide lists feature flags, A/B testing and conditional route loading as use cases. (<a href="https://angular.dev/guide/routing/route-guards#canmatch">docs</a>)</details>
4. **How do you implement an "unsaved changes" warning?**
   <details><summary>Answer</summary>A <code>CanDeactivateFn&lt;T&gt;</code> that receives the component instance and asks it (e.g. <code>hasUnsavedChanges()</code>), plus <code>beforeunload</code> for tab close. (<a href="https://angular.dev/api/router/CanDeactivateFn">API</a>)</details>
5. **Resolver vs loading data in the component?**
   <details><summary>Answer</summary>Resolvers block navigation until data is ready (no empty state, but slower perceived navigation; errors become NavigationError). Loading in the component (or route resources) shows the page immediately with a loading state. (<a href="https://angular.dev/guide/routing/data-resolvers">docs</a>)</details>
6. **`loadChildren` vs `loadComponent`?**
   <details><summary>Answer</summary><code>loadComponent</code> lazy loads one standalone component; <code>loadChildren</code> lazy loads a <code>Routes</code> array (or legacy NgModule). Both create separate chunks. (<a href="https://angular.dev/guide/routing/loading-strategies">docs</a>)</details>
7. **Why does `{ path: '', redirectTo: 'home' }` need `pathMatch: 'full'`?**
   <details><summary>Answer</summary>With the default <code>'prefix'</code>, the empty path is a prefix of every URL, so every URL would redirect. (<a href="https://angular.dev/guide/routing/redirecting-routes#pathmatch-full">docs</a>)</details>
8. **How do you show a global loading bar during navigation?**
   <details><summary>Answer</summary>Subscribe to <code>Router.events</code>: show on <code>NavigationStart</code>, hide on <code>NavigationEnd</code>/<code>NavigationCancel</code>/<code>NavigationError</code> (or use the <code>currentNavigation()</code> signal). (<a href="https://angular.dev/guide/routing/lifecycle-and-events">docs</a>)</details>
9. **Are guards a security mechanism?**
   <details><summary>Answer</summary>No: they run in the browser and can be bypassed. They improve UX; the backend must enforce authorization. (<a href="https://angular.dev/best-practices/security">security guide</a>)</details>

## 📚 References

- https://angular.dev/guide/routing/define-routes
- https://angular.dev/guide/routing/define-routes#wildcards
- https://angular.dev/guide/routing/define-routes#how-angular-matches-urls
- https://angular.dev/guide/routing/define-routes#page-titles
- https://angular.dev/guide/routing/define-routes#route-level-providers-for-dependency-injection
- https://angular.dev/guide/routing/navigate-to-routes#how-to-use-routerlink
- https://angular.dev/guide/routing/navigate-to-routes#how-relative-urls-work
- https://angular.dev/guide/routing/navigate-to-routes#programmatic-navigation-to-routes
- https://angular.dev/guide/routing/read-route-state#detect-active-current-route-with-routerlinkactive
- https://angular.dev/guide/routing/read-route-state#understanding-route-snapshots
- https://angular.dev/guide/routing/read-route-state#query-parameters
- https://angular.dev/guide/routing/read-route-state#matrix-parameters
- https://angular.dev/guide/routing/common-router-tasks#add-withcomponentinputbinding
- https://angular.dev/guide/routing/common-router-tasks#input-binding-priority
- https://angular.dev/guide/routing/common-router-tasks#inherit-parent-route-data
- https://angular.dev/guide/routing/customizing-route-behavior#route-reuse-strategy
- https://angular.dev/guide/routing/route-guards
- https://angular.dev/guide/routing/route-guards#route-guard-return-types
- https://angular.dev/guide/routing/route-guards#canmatch
- https://angular.dev/guide/routing/route-guards#applying-guards-to-routes
- https://angular.dev/guide/routing/data-resolvers
- https://angular.dev/guide/routing/data-fetching-with-resources
- https://angular.dev/guide/routing/redirecting-routes#pathmatch-full
- https://angular.dev/guide/routing/redirecting-routes#conditional-redirects
- https://angular.dev/guide/routing/loading-strategies
- https://angular.dev/guide/routing/router-reference#router-events
- https://angular.dev/guide/routing/lifecycle-and-events
- https://angular.dev/guide/routing/testing
- https://angular.dev/api/router/ActivatedRoute
- https://angular.dev/api/router/BaseRouteReuseStrategy
- https://angular.dev/api/router/Router
- https://angular.dev/api/router/RouterLink
- https://angular.dev/api/router/CanMatchFn
- https://angular.dev/api/router/CanDeactivateFn
- https://angular.dev/api/router/RedirectCommand
- https://angular.dev/api/router/RedirectFunction
- https://angular.dev/api/router/mapToCanActivate
- https://angular.dev/api/router/TitleStrategy
- https://angular.dev/api/router/withPreloading
- https://angular.dev/api/router/PreloadAllModules
- https://angular.dev/api/router/NoPreloading
- https://angular.dev/api/router/PreloadingStrategy
- https://angular.dev/api/router/withAutoCleanupInjectors
- https://angular.dev/api/router/withDebugTracing
- https://angular.dev/api/router/testing/RouterTestingHarness
- https://angular.dev/best-practices/security
