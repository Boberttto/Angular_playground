# 12 · Advanced

Topics that come up in senior interviews: `@defer`, dynamic components, templates and projection,
error boundaries, SSR & hydration, i18n, performance, security — and **testing with Vitest**, the
default test runner of new Angular CLI projects.

Demo: [`src/app/modules/12-advanced/`](../../src/app/modules/12-advanced/). Every `*.spec.ts` in that
folder passes with `npx ng test --watch=false` and backs up a claim made below.

## Table of contents

1. [Deferrable views: `@defer`](#1-deferrable-views-defer)
2. [Dynamic components](#2-dynamic-components)
3. [`ng-template`, `ngTemplateOutlet` and context](#3-ng-template-ngtemplateoutlet-and-context)
4. [Advanced content projection](#4-advanced-content-projection)
5. [Error boundaries: `@boundary` (developer preview)](#5-error-boundaries-boundary-developer-preview)
6. [SSR & hydration (theory — this project is CSR only)](#6-ssr--hydration-theory--this-project-is-csr-only)
7. [Browser-only code: `afterNextRender`](#7-browser-only-code-afternextrender)
8. [i18n overview](#8-i18n-overview)
9. [Performance checklist](#9-performance-checklist)
10. [Security: XSS, sanitization, DomSanitizer, XSRF](#10-security-xss-sanitization-domsanitizer-xsrf)
11. [Testing with Vitest](#11-testing-with-vitest)

---

## 1. Deferrable views: `@defer`

`@defer` splits the **standalone** components, directives and pipes used inside the block into a
separate chunk, loaded when a trigger fires ([docs](https://angular.dev/guide/templates/defer)).

```html
@defer (on interaction; prefetch on idle) {
  <app-heavy-widget />
} @placeholder (minimum 500ms) {
  <button>Click to load</button>
} @loading (after 100ms; minimum 1s) {
  <p>Loading…</p>
} @error {
  <p>Failed to load</p>
}
```

| Trigger | Fires when |
|---|---|
| `on idle` (**default**) | browser idle (`requestIdleCallback`); `on idle(500)` passes a timeout |
| `on viewport` | the placeholder (or `viewport(ref)`) enters the viewport (IntersectionObserver) |
| `on interaction` | click or keydown on the placeholder (or a referenced element) |
| `on hover` | `mouseover` / `focusin` on the placeholder (or a referenced element) |
| `on immediate` | right after the non-deferred content rendered |
| `on timer(2s)` | after a duration |
| `when expr` | the expression becomes truthy — **one-way**, it never reverts to the placeholder |

- `prefetch on ...` / `prefetch when ...` downloads the JS earlier than it renders.
- `@placeholder (minimum X)` avoids flicker; `@loading (after X; minimum Y)` shows the loader only if
  loading takes longer than X, and for at least Y.
- Placeholders used as the viewport/interaction/hover target must have a **single root element**.
- Dependencies must be standalone and **not referenced elsewhere in the same file** (e.g. by a
  `viewChild` query or eager import), otherwise they stay in the main bundle
  ([docs](https://angular.dev/guide/templates/defer)).
- With `ng serve` and **HMR**, all `@defer` chunks are fetched eagerly; use `--no-hmr` to observe triggers
  ([docs](https://angular.dev/guide/templates/defer)).
- During SSR/SSG, `@defer` renders its `@placeholder` (triggers aren't invoked) unless you use incremental
  hydration triggers (§6).

> 💡 **Interview tip:** `@defer` vs lazy routes: lazy routes split by **URL**, `@defer` splits **inside a template**.
> Both rely on dynamic `import()`.

> ⚠️ **Pitfall:** nesting `@defer` blocks with the same trigger causes **cascading** sequential requests; and a
> placeholder with a different height than the content causes layout shift
> ([docs](https://angular.dev/guide/templates/defer)).

[demo](../../src/app/modules/12-advanced/defer/defer-demo.html) ·
[spec](../../src/app/modules/12-advanced/defer/defer-demo.spec.ts)

## 2. Dynamic components

Two ways to render a component whose type is chosen at runtime
([docs](https://angular.dev/guide/components/programmatic-rendering)).

### 2.1 `NgComponentOutlet` (declarative)

```html
<ng-container *ngComponentOutlet="outletType(); inputs: outletInputs()" />
```

`ngComponentOutletInputs` (`inputs:` in micro-syntax) sets inputs; extras: `injector`, `content`
(projected nodes), `ngModule` ([API](https://angular.dev/api/common/NgComponentOutlet)).

### 2.2 `ViewContainerRef.createComponent` (imperative)

```ts
private readonly host = viewChild.required('host', { read: ViewContainerRef });

// v20+: template-like bindings declared at creation
const ref = this.host().createComponent(AlertCard, {
  bindings: [
    inputBinding('message', this.message),          // follows the signal
    inputBinding('kind', () => 'info'),
    outputBinding('closed', () => ref.destroy()),
    // twoWayBinding('value', someWritableSignal)
  ],
});

// Classic: set inputs imperatively
const ref2 = this.host().createComponent(AlertCard);
ref2.setInput('message', 'Static value');
ref2.instance.closed.subscribe(() => ref2.destroy());
```

- `inputBinding`, `outputBinding`, `twoWayBinding` exist in `@angular/core`
  ([API](https://angular.dev/api/core/inputBinding)); `directives: [...]` can also attach host directives
  ([docs](https://angular.dev/guide/components/programmatic-rendering#binding-inputs-outputs-and-setting-host-directives-at-creation)).
- `setInput` "will properly mark for check" OnPush components and run `ngOnChanges`
  ([API](https://angular.dev/api/core/ComponentRef)). Prefer it over `ref.instance.x = ...` (doesn't work
  with signal inputs, doesn't schedule change detection).
- **Difference proven by the spec**: an `inputBinding` keeps following its signal; `setInput` is a one-off.
- `onError` (developer preview) catches rendering/CD errors of the created component
  ([docs](https://angular.dev/guide/components/programmatic-rendering#handling-rendering-errors)).
- The standalone `createComponent(Type, { environmentInjector, hostElement })` creates a component
  **outside** any view container (e.g. overlays attached to `document.body`)
  ([API](https://angular.dev/api/core/createComponent)).

```ts
// Legacy syntax (removed in v22): ComponentFactoryResolver
// const factory = this.cfr.resolveComponentFactory(AlertCard); vcr.createComponent(factory);
```

> 💡 **Interview tip:** For lazy-loading a dynamic component, combine `await import('./x')` with
> `createComponent`, or simply use `@defer` when the component is known in the template
> ([docs](https://angular.dev/guide/components/programmatic-rendering#lazy-loading-components)).

[demo](../../src/app/modules/12-advanced/dynamic/dynamic-demo.ts) ·
[spec](../../src/app/modules/12-advanced/dynamic/dynamic-demo.spec.ts)

## 3. `ng-template`, `ngTemplateOutlet` and context

An `<ng-template>` is a **blueprint** (`TemplateRef`): it renders nothing until something stamps it
([docs](https://angular.dev/guide/templates/ng-template)). `NgTemplateOutlet` renders it with a
**context object** ([API](https://angular.dev/api/common/NgTemplateOutlet)):

```html
<ng-template #badge let-text let-color="color">
  <span [style.background]="color">{{ text }}</span>
</ng-template>

<ng-container *ngTemplateOutlet="badge; context: { $implicit: 'New', color: '#e7f6ee' }" />
```

- `let-text` (no value) binds `$implicit`; `let-color="color"` binds the `color` key.
- A component can receive a template from its parent with `contentChild(TemplateRef)` (or an
  `input<TemplateRef<Ctx>>()`), then stamp it per item — the "render prop" pattern:

```ts
export class SmartList<T> {
  readonly items = input.required<readonly T[]>();
  protected readonly itemTemplate = contentChild<TemplateRef<ListItemContext<T>>>(TemplateRef);
}
```

```html
<ng-container [ngTemplateOutlet]="itemTemplate() ?? fallback"
              [ngTemplateOutletContext]="{ $implicit: item, index: $index }" />
```

> ⚠️ **Pitfall:** variables declared with `let-` are typed `any` unless the directive declares a
> `static ngTemplateContextGuard` (as `NgFor`/`NgIf` do).
> > ⚠️ Not confirmed by official docs / opinion: in app code, the loss of typing is usually acceptable for small templates.

[demo](../../src/app/modules/12-advanced/templates/template-demo.html)

## 4. Advanced content projection

([docs](https://angular.dev/guide/components/content-projection))

```html
<!-- panel-card template -->
<header><ng-content select="[panel-title]">Untitled panel</ng-content></header>
<div class="body"><ng-content /></div>
<footer><ng-content select="app-panel-footer, [panel-footer]">No footer projected</ng-content></footer>
```

- `select` takes a CSS selector (element, attribute, class, comma list). Content matching no selector goes
  to the default `<ng-content>`.
- Content **inside** `<ng-content>` is **fallback** content, shown when nothing is projected into that slot.
- `ngProjectAs="[panel-footer]"` lets an element (often an `ng-container`) match a selector it doesn't have.
- Projected content is **created by the parent** (it belongs to the parent's view) even if the child
  never displays it; an `<ng-content>` cannot be conditionally *instantiated*. For lazy/conditional or
  repeated content, accept an `ng-template` instead (§3).

> 💡 **Interview tip:** "Can I put `<ng-content>` inside `@if`?" → it controls *where/whether it's displayed*,
> not whether the projected components are created — their lifecycle hooks still run.

[demo](../../src/app/modules/12-advanced/templates/panel-card.ts)

## 5. Error boundaries: `@boundary` (developer preview)

New in v22 and **developer preview**: `@boundary` catches errors thrown while rendering or change
detecting its content and renders `@error` instead ([docs](https://angular.dev/guide/templates/error-boundaries)).

```html
@boundary {
  <app-flaky-widget [explode]="explode()" />
} @error {
  <p>Caught: {{ $error.message }}</p>
  <button (click)="$reset()">Try again</button>
}
```

- `$error` is the caught error; `$reset()` re-renders the content.
- Several `@error (... when predicate(err))` blocks can handle specific errors (first match wins).
- A boundary does **not** catch errors from content projected into an `<ng-content>` inside it — that content
  belongs to the parent's view.
- A custom `ErrorHandler` can implement `onViewError(error, details)` to log caught errors.

[demo](../../src/app/modules/12-advanced/boundary/boundary-demo.html) ·
[spec](../../src/app/modules/12-advanced/boundary/boundary-demo.spec.ts)

## 6. SSR & hydration (theory — this project is CSR only)

- "Angular ships all applications as client-side rendered (CSR) by default"; `ng new --ssr` or
  `ng add @angular/ssr` adds server rendering ([docs](https://angular.dev/guide/ssr)).
- **Render modes** per route (`app.routes.server.ts`): `RenderMode.Client` (CSR), `RenderMode.Server`
  (SSR, per request), `RenderMode.Prerender` (SSG, at build time)
  ([docs](https://angular.dev/guide/ssr#rendering-modes)).
- **Hydration** reuses the server-rendered DOM instead of re-creating it, enabled with
  `provideClientHydration()` in **both** the browser and server configs
  ([docs](https://angular.dev/guide/hydration)).
- **Hydration mismatches** come from direct DOM manipulation or invalid HTML; `ngSkipHydration` opts a
  component out as a workaround ([docs](https://angular.dev/guide/hydration)).
- **Event replay** captures user events that happen before hydration and replays them afterwards
  ([docs](https://angular.dev/guide/hydration)).
- **Incremental hydration** leaves `@defer` blocks dehydrated until a `hydrate` trigger fires
  (`hydrate on viewport|interaction|idle|hover|immediate|timer`, `hydrate when`, `hydrate never`). In v22 it
  is **enabled by default** with `provideClientHydration()`; `withNoIncrementalHydration()` opts out,
  `withIncrementalHydration()` is deprecated, and incremental hydration enables event replay automatically
  ([docs](https://angular.dev/guide/incremental-hydration), [API](https://angular.dev/api/platform-browser/withNoIncrementalHydration)).

```html
@defer (hydrate on viewport) {
  <app-comments />   <!-- rendered on the server, hydrated when visible -->
}
```

> 💡 **Interview tip:** CSR vs SSR vs SSG: SSR/SSG improve first paint and SEO (crawlers get full HTML);
> SSG is cheapest per request but data is fixed at build time; SSR needs a Node (or other) server
> ([docs](https://angular.dev/guide/ssr#choosing-a-rendering-mode)).

## 7. Browser-only code: `afterNextRender`

On the server there is no `window`, `document`, `navigator`, `location`... "code which relies on
browser-specific symbols should only be executed in the browser", which `afterNextRender` /
`afterEveryRender` enforce because they "are only executed on the browser and skipped on the server"
([docs](https://angular.dev/guide/ssr#authoring-server-compatible-components)).

```ts
constructor() {
  afterNextRender(() => {
    this.width.set(this.measured().nativeElement.getBoundingClientRect().width);
  });
}
```

- `afterNextRender` runs **once** after the next render; `afterEveryRender` after every render
  (`afterRender` was renamed) ([API](https://angular.dev/api/core/afterNextRender)).
- Use the `DOCUMENT` token instead of the global `document`
  ([docs](https://angular.dev/guide/ssr#accessing-document-via-di)).
- The docs warn against `isPlatformBrowser` inside `@if` to render different content: it causes
  hydration mismatches and layout shifts ([docs](https://angular.dev/guide/ssr#authoring-server-compatible-components)).

[demo](../../src/app/modules/12-advanced/advanced-page.ts)

## 8. i18n overview

([docs](https://angular.dev/guide/i18n))

1. `ng add @angular/localize` ([docs](https://angular.dev/guide/i18n/add-package)).
2. Mark text: `<h1 i18n="@@homeTitle">Hello</h1>`, attributes with `i18n-title`, TS strings with
   `` $localize`Hello` `` ([docs](https://angular.dev/guide/i18n/prepare), [API](https://angular.dev/api/localize/init/$localize)).
3. `ng extract-i18n` produces a source file (XLIFF by default); translators produce one file per locale.
4. Build: the `localize` option builds **one complete copy of the app per locale**, translated at compile
   time with AOT ([docs](https://angular.dev/guide/i18n/merge)); serve each copy via server language
   detection or subdirectories.
- Locale-aware pipes (`DatePipe`, `CurrencyPipe`, `DecimalPipe`...) use `LOCALE_ID`.

> 💡 **Interview tip:** Built-in i18n is **compile-time** (one build per locale, zero runtime cost). Switching
> language at runtime without reload requires a runtime library.
> > ⚠️ Not confirmed by official docs / opinion: popular runtime choices are third-party libraries such as Transloco.

## 9. Performance checklist

| Technique | Why | Source |
|---|---|---|
| OnPush (default in v22) + signals | Skip subtrees that didn't change; signals mark exactly the views that read them | [docs](https://angular.dev/best-practices/skipping-subtrees) |
| Zoneless (default in v22) | No global zone.js patching; CD only on notifications | [docs](https://angular.dev/guide/zoneless) |
| `track` with a unique id in `@for` | Minimal DOM operations when lists change | [docs](https://angular.dev/guide/templates/control-flow) |
| Lazy routes | Smaller initial bundle | [docs](https://angular.dev/guide/routing/loading-strategies) |
| `@defer` | Split heavy template parts | [docs](https://angular.dev/guide/templates/defer) |
| `NgOptimizedImage` | `priority` on the LCP image (`fetchpriority=high`, eager), lazy by default otherwise, required `width`/`height` to prevent layout shift | [docs](https://angular.dev/guide/image-optimization) |
| Pure pipes / `computed()` instead of template method calls | Memoized derivations | [docs](https://angular.dev/best-practices/runtime-performance) |
| SSR/SSG + hydration | Faster first paint, LCP | [docs](https://angular.dev/guide/ssr) |
| Profile first | Angular DevTools profiler, Chrome DevTools | [docs](https://angular.dev/best-practices/runtime-performance) |

```html
<img ngSrc="hero.jpg" width="1200" height="600" priority />
```

## 10. Security: XSS, sanitization, DomSanitizer, XSRF

"Angular treats all values as untrusted by default"; values bound into the DOM are **sanitized and escaped**
according to their **security context**: HTML, style, URL, resource URL
([docs](https://angular.dev/best-practices/security#sanitization-and-security-contexts)).

| Binding | Result with `<img src=x onerror=alert(1)><script>…</script>` |
|---|---|
| `{{ value }}` | escaped: shown as text |
| `[innerHTML]="value"` | sanitized: `script` and `onerror` removed, safe tags kept, dev-mode warning |
| `[href]="'javascript:…'"` | prefixed with `unsafe:` |
| resource URLs (e.g. `<iframe [src]>`) | "Sanitizing resource URLs isn't possible": only bind values you explicitly trusted (`bypassSecurityTrustResourceUrl`) |

```ts
private readonly sanitizer = inject(DomSanitizer);
this.sanitizer.sanitize(SecurityContext.HTML, untrusted);   // what Angular would keep
this.sanitizer.bypassSecurityTrustHtml(trustedConstant);     // disables sanitization: YOUR responsibility
```

- `bypassSecurityTrust{Html,Style,Script,Url,ResourceUrl}` must **never** wrap user input
  ([API](https://angular.dev/api/platform-browser/DomSanitizer)).
- Direct DOM APIs (`element.innerHTML = ...`) are **not** protected unless you enforce **Trusted Types**;
  add a **Content Security Policy** ([docs](https://angular.dev/best-practices/security#content-security-policy)).
- Use the AOT compiler (CLI default) and never generate/compile templates containing user data: "Angular
  trusts template code", so that is template injection
  ([docs](https://angular.dev/best-practices/security#use-the-aot-template-compiler)).
- **XSRF**: `HttpClient` reads the `XSRF-TOKEN` cookie and sends an `X-XSRF-TOKEN` header; the server must
  set and verify it ([docs](https://angular.dev/best-practices/security#httpclient-xsrf-csrf-security),
  [API](https://angular.dev/api/common/http/withXsrfConfiguration)).

[demo](../../src/app/modules/12-advanced/security/sanitization-demo.html)

## 11. Testing with Vitest

### 11.1 Setup

- New CLI projects use **Vitest** with **jsdom** by default; Karma is still supported
  ([docs](https://angular.dev/guide/testing)). The switch happened in **CLI 21.0.0** ("configure Vitest for
  new projects", [CHANGELOG](https://github.com/angular/angular-cli/blob/main/CHANGELOG.md)).
- `angular.json`: `"test": { "builder": "@angular/build:unit-test" }`; `tsconfig.spec.json` adds
  `"types": ["vitest/globals"]` so `describe/it/expect/vi` are globals (this project).
- Default include: `**/*.spec.ts` and `**/*.test.ts`; options `setupFiles`, `providersFile`, `coverage`,
  `browsers` (real browser via a provider) ([docs](https://angular.dev/guide/testing)).
- Run once: `npx ng test --watch=false`; one folder: `--include='src/app/modules/12-advanced/**/*.spec.ts'`.
- Migrating from Karma/Jasmine: a `refactor-jasmine-vitest` schematic exists; the docs flag migration
  as experimental ([docs](https://angular.dev/guide/testing/migrating-to-vitest)).

### 11.2 TestBed & ComponentFixture

`TestBed` creates a testing module/injector; `TestBed.createComponent(C)` returns a
`ComponentFixture` with `componentInstance`, `nativeElement`, `debugElement`, `componentRef`,
`whenStable()`, `detectChanges()` ([API](https://angular.dev/api/core/testing/ComponentFixture)).

```ts
const fixture = TestBed.createComponent(RatingBadge);
fixture.componentRef.setInput('label', 'Angular'); // works for signal & required inputs
fixture.componentRef.setInput('score', 3);
await fixture.whenStable();                         // zoneless: wait for the scheduled render
expect(fixture.nativeElement.textContent).toContain('Angular: 3/5');
```

- Configure first, then create: "Do not re-configure TestBed after calling createComponent"
  ([docs](https://angular.dev/guide/testing/components-basics)).
- `compileComponents()` "is only required when `@defer` blocks are used" ([docs](https://angular.dev/guide/testing/components-basics)).
- v22: `TestBed.createComponent(C, { bindings: [inputBinding(...), outputBinding(...)] })` — used in
  [rating-badge.spec.ts](../../src/app/modules/12-advanced/testing/rating-badge.spec.ts).

### 11.3 `whenStable()` in zoneless apps

"TestBed uses zoneless change detection by default"; prefer `await fixture.whenStable()` over
`fixture.detectChanges()` so tests behave like production (Angular schedules CD from notifications)
([docs](https://angular.dev/guide/zoneless)). Observed in this project's
[`forms.spec.ts`](../../src/app/modules/08-forms/forms.spec.ts): `whenStable()` also waited for a
`resource()`-based async validator to finish (resources register pending tasks —
[PendingTasks](https://angular.dev/api/core/PendingTasks)).

- `fakeAsync`/`tick`/`flush` are Zone.js utilities ([docs](https://angular.dev/guide/testing/zone-js-testing-utilities)); the
  v22 typings state "This API requires Zone.js and cannot be used with the Vitest test runner".
  Use real async/await, or Vitest fake timers (`vi.useFakeTimers()`).
- Signals: `computed()` is read synchronously; **effects are scheduled** — flush them with `TestBed.tick()`
  (`flushEffects()` is deprecated) — see [counter-store.spec.ts](../../src/app/modules/12-advanced/testing/counter-store.spec.ts).

### 11.4 Services, mocks, pipes

```ts
store = TestBed.inject(CounterStore);       // service test, no component

TestBed.configureTestingModule({
  providers: [{ provide: GreetingService, useValue: { greet: vi.fn((n: string) => `Mocked ${n}`) } }],
});                                          // mocking a dependency

const pipe = new TruncatePipe();             // pure pipe: plain class
```

([services](https://angular.dev/guide/testing/services), [pipes](https://angular.dev/guide/testing/pipes),
[scenarios](https://angular.dev/guide/testing/components-scenarios))

### 11.5 `@defer` in tests

`deferBlockBehavior: DeferBlockBehavior.Manual` keeps blocks on their placeholder; then
`fixture.getDeferBlocks()` and `block.render(DeferBlockState.Loading | Complete | Error)`
([docs](https://angular.dev/guide/templates/defer#testing-defer-blocks),
[API](https://angular.dev/api/core/testing/DeferBlockFixture)). The default is **Playthrough** (blocks behave
as in the browser).

### 11.6 Component harnesses (mention)

A harness is a class that interacts with a component "the way an end user does", insulating tests from
DOM structure; Angular Material ships one per component; the same harness works in unit and e2e tests
([docs](https://angular.dev/guide/testing/component-harnesses-overview)). They come from
`@angular/cdk/testing` (not installed here).

> 💡 **Interview tip:** Test **behaviour through the DOM and public API** (inputs, outputs, rendered text), not
> private fields. Prefer `setInput` over writing to `componentInstance`.

---

## 🎯 Likely interview questions

1. **What is the default `@defer` trigger and what does `prefetch` add?**
   <details><summary>Answer</summary><code>on idle</code>. <code>prefetch</code> downloads the chunk on another trigger before the block renders, so rendering is instant. (<a href="https://angular.dev/guide/templates/defer">docs</a>)</details>
2. **`setInput` vs `inputBinding` vs assigning `ref.instance.x`?**
   <details><summary>Answer</summary><code>setInput</code> sets once and marks for check; <code>inputBinding(name, signalOrFn)</code> keeps the input in sync reactively; assigning the instance bypasses inputs (fails for signal inputs, no CD notification). (<a href="https://angular.dev/api/core/ComponentRef">API</a>)</details>
3. **How do you let a parent customize how a child renders each item?**
   <details><summary>Answer</summary>Pass an <code>ng-template</code> (content or input), read it with <code>contentChild(TemplateRef)</code>, render with <code>ngTemplateOutlet</code> + a context (<code>$implicit</code>, named keys). (<a href="https://angular.dev/api/common/NgTemplateOutlet">API</a>)</details>
4. **What is hydration, and what is new in v22?**
   <details><summary>Answer</summary>Reusing server-rendered DOM instead of re-rendering. In v22 incremental hydration (hydrate triggers on <code>@defer</code>) is on by default with <code>provideClientHydration()</code>, which also enables event replay. (<a href="https://angular.dev/guide/incremental-hydration">docs</a>)</details>
5. **Why `afterNextRender` for DOM measurement?**
   <details><summary>Answer</summary>It runs only in the browser, after Angular updated the DOM — safe for SSR and for reading layout. (<a href="https://angular.dev/guide/ssr#authoring-server-compatible-components">docs</a>)</details>
6. **How does Angular prevent XSS and when are you on your own?**
   <details><summary>Answer</summary>Escapes interpolation, sanitizes HTML/URL/style bindings by context. You're on your own with <code>bypassSecurityTrust*</code>, direct DOM APIs (without Trusted Types) and server-side template generation. (<a href="https://angular.dev/best-practices/security">docs</a>)</details>
7. **How do you test a zoneless OnPush component?**
   <details><summary>Answer</summary><code>TestBed.createComponent</code>, <code>fixture.componentRef.setInput()</code>, <code>await fixture.whenStable()</code>, assert on <code>nativeElement</code>; avoid relying on <code>detectChanges()</code>. (<a href="https://angular.dev/guide/zoneless">docs</a>)</details>
8. **Can you use `fakeAsync` with Vitest?**
   <details><summary>Answer</summary>No: it requires Zone.js (stated in the v22 <code>@angular/core/testing</code> typings). Use async/await or Vitest fake timers. (<a href="https://angular.dev/guide/testing/zone-js-testing-utilities">docs</a>)</details>
9. **What does Angular i18n produce at build time?**
   <details><summary>Answer</summary>One fully translated copy of the app per locale (compile-time, AOT). (<a href="https://angular.dev/guide/i18n/merge">docs</a>)</details>

## 📚 References

- https://angular.dev/guide/templates/defer
- https://angular.dev/guide/templates/defer#testing-defer-blocks
- https://angular.dev/guide/components/programmatic-rendering
- https://angular.dev/guide/components/programmatic-rendering#binding-inputs-outputs-and-setting-host-directives-at-creation
- https://angular.dev/guide/components/programmatic-rendering#handling-rendering-errors
- https://angular.dev/guide/components/programmatic-rendering#lazy-loading-components
- https://angular.dev/api/common/NgComponentOutlet
- https://angular.dev/api/core/inputBinding
- https://angular.dev/api/core/ComponentRef
- https://angular.dev/api/core/createComponent
- https://angular.dev/guide/templates/ng-template
- https://angular.dev/api/common/NgTemplateOutlet
- https://angular.dev/guide/components/content-projection
- https://angular.dev/guide/templates/error-boundaries
- https://angular.dev/guide/ssr
- https://angular.dev/guide/ssr#rendering-modes
- https://angular.dev/guide/ssr#choosing-a-rendering-mode
- https://angular.dev/guide/ssr#authoring-server-compatible-components
- https://angular.dev/guide/ssr#accessing-document-via-di
- https://angular.dev/guide/hydration
- https://angular.dev/guide/incremental-hydration
- https://angular.dev/api/platform-browser/withNoIncrementalHydration
- https://angular.dev/api/core/afterNextRender
- https://angular.dev/guide/i18n
- https://angular.dev/guide/i18n/add-package
- https://angular.dev/guide/i18n/prepare
- https://angular.dev/guide/i18n/merge
- https://angular.dev/api/localize/init/$localize
- https://angular.dev/best-practices/skipping-subtrees
- https://angular.dev/best-practices/runtime-performance
- https://angular.dev/guide/zoneless
- https://angular.dev/guide/templates/control-flow
- https://angular.dev/guide/routing/loading-strategies
- https://angular.dev/guide/image-optimization
- https://angular.dev/best-practices/security
- https://angular.dev/best-practices/security#sanitization-and-security-contexts
- https://angular.dev/best-practices/security#content-security-policy
- https://angular.dev/best-practices/security#use-the-aot-template-compiler
- https://angular.dev/best-practices/security#httpclient-xsrf-csrf-security
- https://angular.dev/api/platform-browser/DomSanitizer
- https://angular.dev/api/common/http/withXsrfConfiguration
- https://angular.dev/guide/testing
- https://angular.dev/guide/testing/components-basics
- https://angular.dev/guide/testing/components-scenarios
- https://angular.dev/guide/testing/services
- https://angular.dev/guide/testing/pipes
- https://angular.dev/guide/testing/migrating-to-vitest
- https://angular.dev/guide/testing/zone-js-testing-utilities
- https://angular.dev/guide/testing/component-harnesses-overview
- https://angular.dev/api/core/testing/ComponentFixture
- https://angular.dev/api/core/testing/DeferBlockFixture
- https://angular.dev/api/core/PendingTasks
- https://github.com/angular/angular-cli/blob/main/CHANGELOG.md
