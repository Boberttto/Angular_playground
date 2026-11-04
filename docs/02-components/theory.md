# 02 · Components — inputs, outputs, model, projection, queries, styling

A component is a **directive with a template**: a TypeScript class decorated with `@Component`, a
selector that says where it renders, a template, and styles. Components form a tree; data flows
**down** through inputs and **up** through outputs.

> All demos: [`src/app/modules/02-components/`](../../src/app/modules/02-components/) — route `/components`.

## Table of contents

1. [Anatomy of a component](#1-anatomy-of-a-component)
2. [Inputs: `input()`, `input.required()`, transforms, aliases](#2-inputs-input-inputrequired-transforms-aliases)
3. [Outputs: `output()`](#3-outputs-output)
4. [`model()` — two-way binding for custom components](#4-model--two-way-binding-for-custom-components)
5. [Parent ↔ child communication patterns](#5-parent--child-communication-patterns)
6. [Smart vs presentational components](#6-smart-vs-presentational-components)
7. [Content projection](#7-content-projection)
8. [Queries: `viewChild`, `viewChildren`, `contentChild`, `contentChildren`](#8-queries-viewchild-viewchildren-contentchild-contentchildren)
9. [View encapsulation and component styles](#9-view-encapsulation-and-component-styles)
10. [🎯 Likely interview questions](#-likely-interview-questions)
11. [📚 References](#-references)

---

## 1. Anatomy of a component

```ts
@Component({
  selector: 'app-profile-card',          // where it renders
  imports: [DatePipe, Avatar],            // what the template may use (standalone by default)
  templateUrl: './profile-card.html',     // or template: `...`
  styleUrl: './profile-card.scss',        // or styles: `...` / styleUrls: [...]
  host: { role: 'article', '[class.featured]': 'featured()', '(click)': 'select()' },
  // changeDetection: OnPush is the default in v22; ChangeDetectionStrategy.Eager opts out
  // encapsulation: ViewEncapsulation.Emulated (default)
  // providers: [...]  → element-injector providers for this component and its children
})
export class ProfileCard { … }
```

- **Standalone by default** (since v19): add components/directives/pipes to `imports` to use them
  ([docs](https://angular.dev/guide/components)).
- The DOM element matching the selector is the **host element**; the template renders inside it
  ([docs](https://angular.dev/guide/components)).
- **Selectors** support a subset of CSS: element (`profile-photo`), attribute (`[dropzone]`,
  `[type="reset"]`), class (`.menu-item`), `:not(...)`, concatenation and comma lists. **No
  combinators** (descendant/child). Never use the `ng` prefix; the CLI default prefix is `app-`
  ([docs](https://angular.dev/guide/components/selectors)).
- **`host` metadata** binds properties, attributes, classes, styles and listeners on the host element.
  The docs say to *always prefer* it over `@HostBinding`/`@HostListener`, which "exist exclusively for
  backwards compatibility" ([docs](https://angular.dev/guide/components/host-elements#prefer-using-the-host-property-over-the-decorators)).
  When a consumer also binds the same property: both static → instance wins; static vs dynamic →
  dynamic wins; both dynamic → **the component's host binding wins**
  ([docs](https://angular.dev/guide/components/host-elements#binding-collisions)).
- Style guide: use `protected` for members only used by the template and `readonly` for
  `input`/`output`/`model`/queries ([docs](https://angular.dev/style-guide)).

> 💡 **Interview tip:** a component's host element is `display: inline` by default (it is an unknown
> custom element). Add `:host { display: block; }` when needed. (Standard CSS behaviour for unknown
> elements — see [MDN `:host`](https://developer.mozilla.org/en-US/docs/Web/CSS/:host) for the selector.)

[demo](../../src/app/modules/02-components/anatomy/profile-card.ts)

## 2. Inputs: `input()`, `input.required()`, transforms, aliases

```ts
readonly name = input.required<string>();                         // InputSignal<string>
readonly role = input('Developer');                               // InputSignal<string>
readonly featured = input(false, { transform: booleanAttribute }); // <app-x featured />
readonly level = input(1, { transform: numberAttribute });         // level="2" → 2
readonly avatarEmoji = input('🙂', { alias: 'avatar' });           // template uses [avatar]
readonly nickname = input('', { transform: trimString });          // custom pure function
```

- `input()` returns a **read-only signal** (`InputSignal`): read with `name()`, derive with `computed()`
  ([docs](https://angular.dev/guide/components/inputs#reading-inputs)).
- **Required inputs** are enforced at **build time**, and their type excludes `undefined`
  ([docs](https://angular.dev/guide/components/inputs#required-inputs)).
- **Transforms** must be pure and **statically analyzable** (a function reference, not an expression).
  The transform's parameter type defines what the template may pass
  ([docs](https://angular.dev/guide/components/inputs#input-transforms)).
- `booleanAttribute` mimics HTML boolean attributes, but treats the string `"false"` as `false`;
  `numberAttribute` parses to a number (`NaN` on failure)
  ([docs](https://angular.dev/guide/components/inputs#built-in-transformations)).
- **Aliases** rename the template-facing name only; the docs advise avoiding them except to preserve
  an old name or avoid DOM property collisions ([docs](https://angular.dev/guide/components/inputs#input-aliases)).

> ⚠️ **Pitfall:** signal inputs are **not set in the constructor**. Reading a required input there
> throws **NG0950**; read it in the template, a `computed`, an `effect`, or from `ngOnInit` onwards
> ([docs](https://angular.dev/errors/NG0950)).

> ⚠️ **Pitfall (found while building this demo):** a parent that reads a **child's required input
> through a query** in its own template (e.g. `computed(() => chips().map(c => c.label()))`) can hit
> NG0950: the query already contains the freshly created children while their inputs are not yet set.
> Read child data later (event handler) or, better, keep the data in the parent.
> ([demo](../../src/app/modules/02-components/queries/queries-demo.ts))

### Legacy syntax (still supported)

```ts
// Legacy syntax (still supported)
@Input({ required: true }) name!: string;
@Input({ transform: booleanAttribute }) featured = false;
@Input('avatar') avatarEmoji = '🙂';
@Input() set value(v: number) { this._value = v; }   // setter input: prefer transforms
ngOnChanges(changes: SimpleChanges) { … }             // was needed to react to input changes
```

Decorator inputs are plain properties: no reactivity without `ngOnChanges`/setters. Signal inputs make
derived state a one-liner (`computed`). Migration: `ng generate @angular/core:signal-input-migration`
([docs](https://angular.dev/reference/migrations/signal-inputs)).

[demo](../../src/app/modules/02-components/anatomy/profile-card.ts)

## 3. Outputs: `output()`

```ts
readonly selected = output<ProfileSelection>();   // OutputEmitterRef<ProfileSelection>
this.selected.emit({ name: this.name(), at: new Date() });
```
```html
<app-profile-card (selected)="onSelected($event)" />
```

- `$event` is the emitted value ([docs](https://angular.dev/guide/components/outputs#emitting-event-data)).
- `output({ alias: 'valueChanged' })` renames the event (avoid unless needed).
- Name outputs in **camelCase**, **don't prefix with `on`**, avoid DOM event names
  ([docs](https://angular.dev/guide/components/outputs#choosing-event-names)).
- `output()` is not an RxJS `Subject`; for interop use `outputFromObservable()` /
  `outputToObservable()` ([docs](https://angular.dev/ecosystem/rxjs-interop/output-interop)).
- Programmatic subscription (dynamic components): `ref.instance.someOutput.subscribe(...)`, cleaned up
  automatically when the component is destroyed ([docs](https://angular.dev/guide/components/outputs#subscribing-to-outputs-programmatically)).
- Custom events **do not bubble** through the DOM — only the direct parent's template listener receives
  them. (⚠️ Not stated on the outputs page; it follows from outputs being listeners on the component
  instance, not DOM events.)

```ts
// Legacy syntax (still supported)
@Output() selected = new EventEmitter<ProfileSelection>();   // EventEmitter extends RxJS Subject
```
([docs](https://angular.dev/guide/components/outputs#declaring-outputs-with-the-output-decorator),
migration: `ng generate @angular/core:output-migration` — [docs](https://angular.dev/reference/migrations/outputs))

## 4. `model()` — two-way binding for custom components

```ts
// child
readonly rating = model(0);              // ModelSignal<number>: readable AND writable
this.rating.set(4);                      // also emits `ratingChange`
```
```html
<!-- parent -->
<app-rating-input [(rating)]="movieRating" />            <!-- WritableSignal: pass the signal -->
<app-rating-input [(rating)]="bookRating" />             <!-- plain property also works -->
<app-rating-input [rating]="x()" (ratingChange)="x.set($event)" />  <!-- desugared -->
```

- A model input automatically creates an output named `<name>Change`
  ([docs](https://angular.dev/guide/components/inputs#implicit-change-events)).
- Supports `required` and `alias`, **not transforms**
  ([docs](https://angular.dev/guide/components/inputs#customizing-model-inputs)).
- Use it when a component exists to **modify a value** (custom form controls, date pickers, toggles)
  ([docs](https://angular.dev/guide/components/inputs#when-to-use-model-inputs)).

> 💡 **Interview tip:** `input()` = read-only for the child; `model()` = the child may write and the
> parent gets notified. Don't use `model()` just to avoid writing an output — two-way state makes data
> flow harder to follow.

[demo](../../src/app/modules/02-components/model/rating-input.ts) ·
[spec](../../src/app/modules/02-components/components.spec.ts)

## 5. Parent ↔ child communication patterns

| Pattern | Direction | When | Demo |
| --- | --- | --- | --- |
| `input()` | parent → child | default for data | `ProductList [products]` |
| `output()` | child → parent | notify an action | `(addToCart)` |
| `model()` | both | value the child edits | `RatingInput` |
| Shared service (component-level `providers`) | any ↔ any in a subtree | siblings, deep trees | `CartStore` |
| `viewChild()` | parent → child API | call methods (`focus()`, `start()`) | `Stopwatch` |
| `inject(ParentComponent)` | child → ancestor | compound components | `Tab` injects `Tabs` |

- A service listed in a component's `providers` gets **one instance per component instance**, shared
  by its descendants ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection)).
- The docs list query pitfalls: keep a **single source of truth**, avoid writing state into children,
  never write state into parents — risk of `ExpressionChangedAfterItHasBeenChecked`
  ([docs](https://angular.dev/guide/components/queries#common-query-pitfalls),
  [NG0100](https://angular.dev/errors/NG0100)).

[demo](../../src/app/modules/02-components/communication/shop-container.ts)

## 6. Smart vs presentational components

> ⚠️ Not confirmed by official docs / community pattern: the "smart/container vs
> presentational/dumb" split is not an Angular API, but a widely used architecture convention.
> The style guide's closest advice is "Keep components and directives focused on presentation"
> ([docs](https://angular.dev/style-guide)).

| Smart (container) | Presentational (dumb) |
| --- | --- |
| injects services, owns state, talks to HTTP/store | only `input()` / `output()` / `model()` |
| few per feature (often the routed page) | many, reusable, easy to test |
| knows *where* data comes from | knows *how* to display it |

In the demo, `ShopContainer` provides `CartStore` and wires `ProductList` (pure inputs/outputs),
`CartSummary` (reads the store) and `Stopwatch` (called via `viewChild`).

## 7. Content projection

Projection lets a consumer pass **markup** into a component, like `<slot>` in Web Components
([docs](https://angular.dev/guide/components/content-projection)).

```html
<!-- card.html -->
<header><ng-content select="[card-title]">Untitled (fallback)</ng-content></header>
<div class="body"><ng-content /></div>          <!-- default slot: everything not matched -->
<footer><ng-content select="app-card-footer, [card-footer]">No footer</ng-content></footer>

<!-- consumer -->
<app-card>
  <span card-title>Hello</span>
  <p>Body</p>
  <h4 ngProjectAs="[card-title]">I pretend to match [card-title]</h4>
</app-card>
```

- **Multi-slot:** `select` accepts the same selectors as component selectors. Without a default slot,
  unmatched content is **not rendered** ([docs](https://angular.dev/guide/components/content-projection#multiple-content-placeholders)).
- **Fallback content:** children of `<ng-content>` render when nothing matches
  ([docs](https://angular.dev/guide/components/content-projection#fallback-content)).
- **`ngProjectAs`:** makes an element match another selector; **static values only**
  ([docs](https://angular.dev/guide/components/content-projection#aliasing-content-for-projection)).
- Projected content **belongs to the parent's view**: it is checked with the parent, and gets its
  dependencies from the parent's injector, not from the receiving component's `viewProviders`
  ([docs](https://angular.dev/guide/components/content-projection#projected-content-lives-in-the-parents-view)).

### Conditional projection: `ng-template` + `ngTemplateOutlet`

> ⚠️ **Pitfall:** "Angular always instantiates and creates DOM nodes for content rendered to a
> `<ng-content>` placeholder, even if that placeholder is hidden"
> ([docs](https://angular.dev/guide/components/content-projection)). `@if (open) { <ng-content /> }`
> does **not** make content lazy — constructors run anyway.

For lazy/conditional or repeated content, the consumer passes an `<ng-template>`; the component
queries it and renders it with `NgTemplateOutlet`, optionally with a **context**:

```ts
// lazy-expander.ts
protected readonly content = contentChild<TemplateRef<{ $implicit: number }>>(TemplateRef);
```
```html
@if (open()) {
  <ng-container [ngTemplateOutlet]="content() ?? null" [ngTemplateOutletContext]="{ $implicit: openCount() }" />
}
<!-- consumer -->
<app-lazy-expander>
  <ng-template let-count> <app-spy /> opened {{ count }} times </ng-template>
</app-lazy-expander>
```

`ngTemplateOutlet` accepts `ngTemplateOutletContext` and `ngTemplateOutletInjector`
([docs](https://angular.dev/guide/templates/ng-template), [API](https://angular.dev/api/common/NgTemplateOutlet)).
The demo logs creation/destruction of a spy component in both variants.

> ⚠️ **Pitfall — NG8011:** a control-flow block with **more than one root node** inside a component
> cannot be projected into a `select` slot (it falls into the default slot). Wrap it in
> `<ng-container ngProjectAs="…">` or split it ([docs](https://angular.dev/errors/NG8011)).

[demo](../../src/app/modules/02-components/projection/projection-demo.html)

## 8. Queries: `viewChild`, `viewChildren`, `contentChild`, `contentChildren`

| | Looks in | Returns |
| --- | --- | --- |
| `viewChild(locator)` | the component's **own template** | `Signal<T \| undefined>` |
| `viewChild.required(locator)` | idem | `Signal<T>` (throws NG0951 if missing) |
| `viewChildren(locator)` | own template | `Signal<ReadonlyArray<T>>` |
| `contentChild(locator)` | the **projected content** | `Signal<T \| undefined>` |
| `contentChildren(locator)` | projected content | `Signal<ReadonlyArray<T>>` |

- **Locators:** a component/directive class, a **template reference variable name** (`'nameInput'`),
  or any `ProviderToken`. **CSS selectors are not supported**
  ([docs](https://angular.dev/guide/components/queries#query-locators)).
- **`read`** returns something else from the matched element: `ElementRef`, `TemplateRef`,
  `ViewContainerRef`, `Injector`… ([docs](https://angular.dev/guide/components/queries#reading-specific-values-from-an-elements-injector)).
- Results are **kept up to date** (e.g. when `@if`/`@for` add/remove elements) and can feed `computed()`.
- **Queries never pierce component boundaries**
  ([docs](https://angular.dev/guide/components/queries#view-queries)).
- **`descendants`:** `contentChildren` finds **direct children only** by default, `contentChild`
  traverses descendants by default; view queries always traverse descendants
  ([docs](https://angular.dev/guide/components/queries#content-descendants)).
- Required queries: NG0951 if no result ([docs](https://angular.dev/errors/NG0951)).

The demo builds a **compound component** (`<app-tabs>` + `<app-tab>`): `Tabs` lists tabs with
`contentChildren(Tab)`, each `Tab` injects its `Tabs` parent and computes whether it is active —
no parent writes into child state.

### Legacy decorators (still supported)

```ts
// Legacy syntax (still supported)
@ViewChild('box', { static: true }) box!: ElementRef;   // available in ngOnInit, never updated
@ViewChild(Child) child?: Child;                        // static: false → from ngAfterViewInit
@ViewChildren(Item) items!: QueryList<Item>;            // items.changes is an Observable
@ContentChild(Toggle) toggle?: Toggle;                  // from ngAfterContentInit
@ContentChildren(Tab, { descendants: true }) tabs!: QueryList<Tab>;
```

- View query results are available in `ngAfterViewInit`, content queries in `ngAfterContentInit`.
- `static: true` = "this element is never inside `@if`/`@for`": resolved **before `ngOnInit`**, not
  updated afterwards; not available for the plural queries
  ([docs](https://angular.dev/guide/components/queries#static-queries)).
- Migration: `ng generate @angular/core:signal-queries-migration`
  ([docs](https://angular.dev/reference/migrations/signal-queries)).

> 💡 **Interview tip:** "Why are signal queries better?" — no lifecycle timing to remember (`undefined`
> until available, then always current), composable with `computed`/`effect`, typed `.required()`, no
> `QueryList` subscription.

[demo](../../src/app/modules/02-components/queries/queries-demo.ts)

## 9. View encapsulation and component styles

`encapsulation` decides how a component's CSS is scoped
([docs](https://angular.dev/guide/components/styling#style-scoping),
[API](https://angular.dev/api/core/ViewEncapsulation)):

| Mode | How | Leaks out? | Global styles leak in? |
| --- | --- | --- | --- |
| `Emulated` (default) | rewrites selectors with generated attributes (`_ngcontent-*`, `_nghost-*`) | no | yes |
| `None` | styles added as-is → **global** | **yes** | yes |
| `ShadowDom` | native Shadow DOM (`attachShadow`) | no | not the global stylesheet (inherited CSS properties still apply) |
| `ExperimentalIsolatedShadowDom` (experimental, v21) | Shadow DOM that guarantees *only* this component's styles apply | no | no |

Special selectors (emulated mode) ([docs](https://angular.dev/guide/components/styling#viewencapsulationemulated)):

```scss
:host { display: block; }                 // the host element
:host(.active) { border-color: red; }     // host matching a selector
:host-context(.dark-theme) p { … }        // some ANCESTOR matches (deprecated in browsers, supported by Angular's compiler)
:host ::ng-deep .mat-thing { … }          // pierces into child views — discouraged
```

- `::ng-deep`: "The Angular team strongly discourages new use… remain exclusively for backwards
  compatibility". After `::ng-deep`, encapsulation stops applying; scoping it under `:host` keeps it
  within the component's subtree ([docs](https://angular.dev/guide/components/styling#ng-deep)).
  Many interviewers still call it "deprecated". Prefer CSS custom properties exposed by the child.
- Emulated mode does **not** guarantee your styles override outside ones of equal specificity
  ([docs](https://angular.dev/guide/components/styling#viewencapsulationnone)).
- `ShadowDom` changes more than styles: event propagation, `<slot>`, DevTools
  ([docs](https://angular.dev/guide/components/styling#viewencapsulationshadowdom),
  [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)).
- Styles in `<link>`/`@import` inside templates are **not** affected by emulated encapsulation
  ([docs](https://angular.dev/guide/components/styling#referencing-external-style-files)).

> ⚠️ **Pitfall — `None` + `ShadowDom` together:** Angular adds the component styles it manages to every
> shadow root it creates (`sharedStylesHost.addHost(shadowRoot)` in
> [dom_renderer.ts](https://github.com/angular/angular/blob/main/packages/platform-browser/src/dom/dom_renderer.ts)),
> so a `ViewEncapsulation.None` rule also matches **inside** a `ShadowDom` component; the global
> `styles.scss` does not. The demo shows both. This is what `ExperimentalIsolatedShadowDom` addresses.

> 💡 **Interview tip:** to theme a child component without `::ng-deep`, let it read CSS custom
> properties and set them from the parent: `[style.--my-background]="color()"`
> ([docs](https://angular.dev/guide/components/host-elements#setting-custom-properties-on-children-components)).

[demo](../../src/app/modules/02-components/encapsulation/encapsulation-demo.html)

---

## 🎯 Likely interview questions

1. **`input()` vs `@Input()`?**
   <details><summary>Answer</summary>

   `input()` returns a read-only signal (reactive, works with `computed`/`effect`, `input.required`
   typed without `undefined`); `@Input()` is a plain property needing `ngOnChanges`/setters. Both
   support `required`, `alias`, `transform`. ([docs](https://angular.dev/guide/components/inputs))
   </details>

2. **How do you implement `[(value)]` on your own component?**
   <details><summary>Answer</summary>

   Declare `value = model(initial)`; Angular creates the `valueChange` output; the child writes with
   `.set()`/`.update()`. ([docs](https://angular.dev/guide/components/inputs#model-inputs))
   </details>

3. **When are query results available?**
   <details><summary>Answer</summary>

   Signal queries: always readable, `undefined` until found, then kept up to date. Decorators:
   `ngAfterViewInit`/`ngAfterContentInit`, or `ngOnInit` with `static: true` (never updated).
   ([docs](https://angular.dev/guide/components/queries#static-queries))
   </details>

4. **View query vs content query?**
   <details><summary>Answer</summary>

   View queries search the component's own template; content queries search the content projected
   between its tags. Neither crosses component boundaries.
   ([docs](https://angular.dev/guide/components/queries))
   </details>

5. **How do you project content conditionally?**
   <details><summary>Answer</summary>

   Not with `@if` around `<ng-content>` (content is always instantiated). Accept an `<ng-template>`
   (`contentChild(TemplateRef)`) and render it with `ngTemplateOutlet`.
   ([docs](https://angular.dev/guide/components/content-projection))
   </details>

6. **What does `ngProjectAs` do?**
   <details><summary>Answer</summary>

   Lets an element (often `<ng-container>`) match an `<ng-content select>` as if it had another
   selector; static values only. ([docs](https://angular.dev/guide/components/content-projection#aliasing-content-for-projection))
   </details>

7. **Explain the three main `ViewEncapsulation` modes.**
   <details><summary>Answer</summary>

   Emulated (default, attribute-rewritten selectors), None (global styles), ShadowDom (native shadow
   root). ([docs](https://angular.dev/guide/components/styling#style-scoping))
   </details>

8. **What are `:host` and `:host-context()`?**
   <details><summary>Answer</summary>

   `:host` targets the component's host element (`:host(.x)` when the host matches); `:host-context(.x)`
   applies when any ancestor matches. ([docs](https://angular.dev/guide/components/styling#viewencapsulationemulated))
   </details>

9. **How can two sibling components communicate?**
   <details><summary>Answer</summary>

   Through their common parent (outputs up, inputs down) or a shared service provided by a common
   ancestor (often signal-based state). ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection))
   </details>

10. **`@HostBinding`/`@HostListener` vs `host: {}`?**
    <details><summary>Answer</summary>

    Same capabilities; the docs say to always prefer `host`, the decorators exist for backwards
    compatibility. ([docs](https://angular.dev/guide/components/host-elements#prefer-using-the-host-property-over-the-decorators))
    </details>

## 📚 References

- https://angular.dev/guide/components
- https://angular.dev/guide/components/selectors
- https://angular.dev/guide/components/host-elements
- https://angular.dev/guide/components/inputs
- https://angular.dev/guide/components/outputs
- https://angular.dev/guide/components/content-projection
- https://angular.dev/guide/components/queries
- https://angular.dev/guide/components/styling
- https://angular.dev/guide/templates/ng-template
- https://angular.dev/guide/di/hierarchical-dependency-injection
- https://angular.dev/ecosystem/rxjs-interop/output-interop
- https://angular.dev/api/common/NgTemplateOutlet
- https://angular.dev/api/core/ViewEncapsulation
- https://angular.dev/reference/migrations/signal-inputs
- https://angular.dev/reference/migrations/signal-queries
- https://angular.dev/reference/migrations/outputs
- https://angular.dev/errors/NG0100
- https://angular.dev/errors/NG0950
- https://angular.dev/errors/NG0951
- https://angular.dev/errors/NG8011
- https://angular.dev/style-guide
- https://github.com/angular/angular/blob/main/packages/platform-browser/src/dom/dom_renderer.ts
- https://developer.mozilla.org/en-US/docs/Web/CSS/:host
- https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
