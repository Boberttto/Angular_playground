# 11 · Directives & pipes — custom attribute/structural directives, composition, pure/impure pipes

Directives add **behaviour** to elements; pipes **transform values** in templates. Both are
standalone classes you `import` into a component, both can use dependency injection, and both are
frequent interview topics because they reveal how well you understand templates and change detection.

> All demos: [`src/app/modules/11-directives-pipes/`](../../src/app/modules/11-directives-pipes/) — route `/directives-pipes`.

## Table of contents

1. [The three kinds of directives](#1-the-three-kinds-of-directives)
2. [Custom attribute directive with `host` + `input()`](#2-custom-attribute-directive-with-host--input)
3. [Legacy `@HostListener` / `@HostBinding`](#3-legacy-hostlistener--hostbinding)
4. [DI in directives: `ElementRef`, `Renderer2` and why to avoid direct DOM manipulation](#4-di-in-directives-elementref-renderer2-and-why-to-avoid-direct-dom-manipulation)
5. [Custom structural directives](#5-custom-structural-directives)
6. [The `*` microsyntax, desugared](#6-the--microsyntax-desugared)
7. [Directive composition API: `hostDirectives`](#7-directive-composition-api-hostdirectives)
8. [Custom pipes](#8-custom-pipes)
9. [Pure vs impure pipes (with measured call counts)](#9-pure-vs-impure-pipes-with-measured-call-counts)
10. [Pipes vs methods vs `computed()`](#10-pipes-vs-methods-vs-computed)
11. [🎯 Likely interview questions](#-likely-interview-questions)
12. [📚 References](#-references)

---

## 1. The three kinds of directives

| Kind | What it does | Examples |
| --- | --- | --- |
| **Component** | a directive **with its own template** | every `@Component` |
| **Attribute directive** | changes appearance/behaviour of an existing element | `NgClass`, `NgModel`, `RouterLink`, `appHighlight` |
| **Structural directive** | adds/removes DOM by stamping `<ng-template>`s | `NgIf`, `NgFor` (legacy), `NgTemplateOutlet`, `*appUnless` |

([docs](https://angular.dev/guide/directives#types-of-directives))

- Use a directive to package **reusable behaviour** you apply to existing elements/components
  (tooltip, autofocus, behaviour on a component you don't own). Need your own markup? Write a component
  ([docs](https://angular.dev/guide/directives#when-to-use-a-directive)).
- For a one-off, plain template bindings (`[class.x]`, `(click)`) are enough
  ([docs](https://angular.dev/guide/directives/attribute-directives#use-template-bindings-for-one-off-behavior)).
- An element hosts **at most one component** (otherwise error
  [NG8023 "Multiple Components Match Same Element"](https://angular.dev/errors/NG8023)) but **any number
  of attribute directives**.

## 2. Custom attribute directive with `host` + `input()`

```ts
@Directive({
  selector: '[appHighlight]',            // attribute selector, prefixed
  exportAs: 'appHighlight',              // <p appHighlight #h="appHighlight"> → h is the instance
  host: {
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
    '[style.background-color]': 'hovered() ? color() : null',
    '[class.is-hovered]': 'hovered()',
  },
})
export class Highlight {
  readonly appHighlight = input('');            // same name as the selector
  readonly defaultColor = input('#fde8ee');
  readonly hovered = signal(false);
  protected color() { return this.appHighlight() || this.defaultColor(); }
}
```
```html
<p [appHighlight]="color()">…</p>                  <!-- applies AND configures the directive -->
<p appHighlight defaultColor="#d7f5e3">…</p>        <!-- static string input, no brackets -->
```

- Naming the input like the selector lets one binding both apply the directive and pass its value
  ([docs](https://angular.dev/guide/directives/attribute-directives#accepting-input-values)).
- Directives have no template: all their effect goes through **host bindings** (declarative) or through
  an injected reference to the host element (imperative)
  ([docs](https://angular.dev/guide/directives/attribute-directives#building-an-attribute-directive)).
- `exportAs` is required to reference a directive with a template variable
  ([docs](https://angular.dev/guide/templates/variables#assigning-a-reference-to-an-angular-directive)).
- Directive selectors don't support namespaces (`app:Highlight` is invalid)
  ([docs](https://angular.dev/guide/directives/attribute-directives#building-an-attribute-directive)).
- `ngNonBindable` disables interpolation/bindings for an element's **children**; directives on that
  element itself still work ([docs](https://angular.dev/guide/directives/attribute-directives#deactivating-angular-processing-with-ngnonbindable)).

> 💡 **Interview tip:** a directive's host bindings use the same syntax as template bindings, so you get
> `[attr.x]`, `[class.x]`, `[style.x.px]`, `(window:resize)`, key filters `(keydown.enter)`, etc.
> ([docs](https://angular.dev/guide/components/host-elements#binding-to-the-host-element)).

[demo](../../src/app/modules/11-directives-pipes/directives/highlight.ts)

## 3. Legacy `@HostListener` / `@HostBinding`

```ts
// Legacy syntax (still supported)
@Directive({ selector: '[appLegacyHighlight]' })
export class LegacyHighlight {
  @Input() appLegacyHighlight = '';
  @HostBinding('class.is-hovered') hovered = false;           // ≙ '[class.is-hovered]': 'hovered'
  @HostListener('mouseenter') onEnter() { … }                 // ≙ '(mouseenter)': 'onEnter()'
  @HostListener('mouseleave', ['$event']) onLeave(e: MouseEvent) { … }
  @HostListener('window:resize') onResize() { … }             // global target
}
```

"Always prefer using the `host` property over `@HostBinding` and `@HostListener`. These decorators
exist exclusively for backwards compatibility"
([docs](https://angular.dev/guide/components/host-elements#prefer-using-the-host-property-over-the-decorators)).
`host` keeps all host interactions in one place, works with signals directly and doesn't need extra
decorated members.

[demo](../../src/app/modules/11-directives-pipes/directives/legacy-highlight.ts)

## 4. DI in directives: `ElementRef`, `Renderer2` and why to avoid direct DOM manipulation

Directives are created by the **element injector** of their host node, so they can `inject()`:

| Token | Gives you |
| --- | --- |
| `ElementRef` | wrapper of the host element (`nativeElement`) |
| `Renderer2` | Angular's rendering abstraction (create/append/remove nodes, set styles, listen) |
| `TemplateRef` | the `<ng-template>` the directive sits on (structural directives) |
| `ViewContainerRef` | the anchor where views can be inserted |
| the host **component** / other directives on the same element / ancestors | their instances |
| `DestroyRef` | `onDestroy()` cleanup |

```ts
private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
private readonly renderer = inject(Renderer2);
private readonly badge = this.renderer.createElement('span');
constructor() {
  this.renderer.appendChild(this.host, this.badge);
  effect(() => this.renderer.setProperty(this.badge, 'textContent', String(this.count())));
  inject(DestroyRef).onDestroy(() => this.renderer.removeChild(this.host, this.badge));
}
```

**What the docs actually say** (worth quoting precisely in an interview):

- `ElementRef.nativeElement`: "Use this API as the **last resort** when direct access to DOM is needed.
  Use templating and data-binding provided by Angular instead"
  ([API](https://angular.dev/api/core/ElementRef)).
- "Avoid direct DOM manipulation whenever possible. Always prefer expressing your DOM's structure in
  component templates and updating that DOM with bindings" — and never set `innerHTML` yourself (XSS);
  Angular's `[innerHTML]` binding is sanitized
  ([docs](https://angular.dev/guide/components/dom-apis), [security](https://angular.dev/best-practices/security)).
- Legitimate DOM API uses: focus management, measuring geometry, reading text content, native observers
  (`ResizeObserver`, `IntersectionObserver`…) ([docs](https://angular.dev/guide/components/dom-apis#when-to-use-dom-apis)).
- Do DOM work in `afterNextRender`/`afterEveryRender` (not other lifecycle hooks): only render callbacks
  guarantee the DOM is rendered, and they don't run on the server
  ([docs](https://angular.dev/guide/components/dom-apis)).
- `Renderer2`: elements it creates **participate in the component's style encapsulation**, and it ties
  into animations. "Aside from these two narrow use-cases, there is no difference between using
  Renderer2 and native DOM APIs" — both work in SSR, but the server DOM lacks layout/observer APIs
  ([docs](https://angular.dev/guide/components/dom-apis#using-a-components-renderer)). It is also the
  extension point for **custom renderers** (rendering to something other than the DOM)
  ([API](https://angular.dev/api/core/Renderer2)).

> ⚠️ **Pitfall:** "Renderer2 makes code SSR-safe" is an over-simplification often heard in interviews.
> Per the current docs, the real reasons are encapsulation, animations, and custom renderers; browser-only
> APIs (layout, observers) need `afterNextRender` or a platform check either way.

Why avoid manual DOM changes? Angular doesn't know about them: they bypass sanitization (XSS with
`innerHTML`), they make components harder to test, and with SSR **hydration** "if you have components
that manipulate the DOM using native DOM APIs or use innerHTML or outerHTML, the hydration process will
encounter errors" — including "injecting additional nodes using `appendChild`"
([hydration docs](https://angular.dev/guide/hydration#direct-dom-manipulation)). Bindings are
declarative, sanitized and type-checked.

> ⚠️ **Pitfall (about our own demo):** the `Badge` directive appends a `<span>` with
> `Renderer2.appendChild`. Fine in this client-only playground, but in a hydrated SSR app this is
> exactly the kind of DOM change that causes hydration mismatches: render the badge from a template
> (a component) instead, or skip hydration for that subtree (`ngSkipHydration`).

[demo](../../src/app/modules/11-directives-pipes/directives/badge.ts)

## 5. Custom structural directives

A structural directive injects **`TemplateRef`** (what to stamp) and **`ViewContainerRef`** (where), and
decides when to create/destroy **embedded views**
([docs](https://angular.dev/guide/directives/structural-directives#creating-a-structural-directive)).

```ts
@Directive({ selector: '[appUnless]' })
export class Unless {
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private hasView = false;
  readonly appUnless = input.required<boolean>();

  constructor() {
    effect(() => {
      const condition = this.appUnless();
      untracked(() => {
        if (!condition && !this.hasView) { this.viewContainer.createEmbeddedView(this.templateRef); this.hasView = true; }
        else if (condition && this.hasView) { this.viewContainer.clear(); this.hasView = false; }
      });
    });
  }
}
```

- `createEmbeddedView(templateRef, context)` — the context object feeds the template's `let-` variables;
  `$implicit` is the default value for `let x` ([docs](https://angular.dev/guide/directives/structural-directives#creating-a-structural-directive),
  [API](https://angular.dev/api/core/ViewContainerRef)).
- `untracked()` so the effect only depends on the input, not on signals read while creating the view.
- **Typing:** `static ngTemplateContextGuard(dir, ctx): ctx is MyContext` types the `let-` variables;
  `static ngTemplateGuard_<input>` narrows an input expression inside the template
  ([docs](https://angular.dev/guide/directives/structural-directives#improving-template-type-checking-for-custom-directives),
  [template type checking](https://angular.dev/tools/cli/template-typecheck)).

> 💡 **Interview tip:** since v17 you rarely *need* custom structural directives for conditionals/loops
> (`@if`, `@for`), but they remain the tool for permission checks (`*appHasRole="'admin'"`), feature flags,
> or rendering a template N times with a custom context.

[demo](../../src/app/modules/11-directives-pipes/directives/unless.ts) ·
[with context](../../src/app/modules/11-directives-pipes/directives/repeat.ts) ·
[spec](../../src/app/modules/11-directives-pipes/directives-pipes.spec.ts)

## 6. The `*` microsyntax, desugared

The `*` prefix turns the element into an `<ng-template>` carrying the directive; only the structural
directive and its bindings move to the template, other attributes stay on the element
([docs](https://angular.dev/guide/directives/structural-directives#structural-directive-shorthand)).

```html
<p *appUnless="hidden()" class="pill">…</p>
<!-- becomes -->
<ng-template [appUnless]="hidden()"><p class="pill">…</p></ng-template>

<li *appRepeat="3; let n; let isLast = last">#{{ n }}</li>
<!-- becomes -->
<ng-template [appRepeat]="3" let-n let-isLast="last"><li>#{{ n }}</li></ng-template>

<li *ngFor="let item of items; trackBy: byId; index as i">…</li>
<!-- becomes -->
<ng-template ngFor let-item [ngForOf]="items" [ngForTrackBy]="byId" let-i="index"><li>…</li></ng-template>
```

Rules ([docs](https://angular.dev/guide/directives/structural-directives#structural-directive-syntax-reference)):

| Shorthand | Translation |
| --- | --- |
| first naked expression | `[prefix]="expression"` |
| `key: expr` / `key expr` | `[prefixKey]="expr"` (the key is PascalCased and prefixed) |
| `let local` | `let-local` (bound to `$implicit`) |
| `let local = export` / `export as local` | `let-local="export"` |

- **One structural directive per element** with the shorthand (there is only one `<ng-template>` to
  unwrap onto); use `<ng-container>` to nest them
  ([docs](https://angular.dev/guide/directives/structural-directives#one-structural-directive-per-element)).
- That is why `NgFor`'s inputs are named `ngForOf`, `ngForTrackBy`: the `of` / `trackBy` keys are
  prefixed with the selector.

[demo](../../src/app/modules/11-directives-pipes/directives/directives-demo.html)

## 7. Directive composition API: `hostDirectives`

Compose behaviours **on the host** of a component (or directive) without inheritance
([docs](https://angular.dev/guide/directives/directive-composition-api)):

```ts
@Component({
  selector: 'app-fancy-button',
  hostDirectives: [
    { directive: Tooltip, inputs: ['appTooltip: tip'] },   // re-exposed as [tip]
    { directive: ClickCounter, outputs: ['countChange'] }, // re-exposed as (countChange)
  ],
})
export class FancyButton {
  protected readonly counter = inject(ClickCounter);       // inject your host directives
}
```

- Applied **statically at compile time**; their **selectors are ignored**; host directives may not be
  `standalone: false` ([docs](https://angular.dev/guide/directives/directive-composition-api#adding-directives-to-a-component)).
- Their inputs/outputs are **private** unless listed (optionally aliased `'inner: outer'`).
- **Order:** host directives are instantiated, receive inputs and apply host bindings **before** the
  component, so the component can override their host bindings
  ([docs](https://angular.dev/guide/directives/directive-composition-api#directive-execution-order)).
- DI: the component and its host directives can inject each other; on conflicting providers, the
  class declaring `hostDirectives` wins ([docs](https://angular.dev/guide/directives/directive-composition-api#dependency-injection)).
- Duplicates are **de-duplicated**: a template match wins over a host-directive match; several host
  matches merge into one instance; conflicting aliases → **NG8024** at compile time
  ([docs](https://angular.dev/guide/directives/directive-composition-api#host-directive-de-duplication),
  [NG8024](https://angular.dev/errors/NG8024)).

> 💡 **Interview tip:** composition vs inheritance — `hostDirectives` lets you mix several small
> behaviours (tooltip + focus ring + click counting) without a base-class hierarchy, each with its own
> inputs, host bindings and lifecycle.

[demo](../../src/app/modules/11-directives-pipes/directives/fancy-button.ts)

## 8. Custom pipes

```ts
@Pipe({ name: 'truncate' })                       // camelCase name, no hyphens
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit = 20, ellipsis = '…'): string {
    return truncate(value, limit, ellipsis);       // logic lives in a plain function
  }
}
```
```html
{{ text() | truncate }}                  <!-- defaults -->
{{ text() | truncate: limit() : ' [...]' }}   <!-- arguments separated by ':' -->
```

- A pipe = `@Pipe({ name })` + a `transform(value, ...args)` method; implement `PipeTransform` for type
  safety. Naming: `camelCase` name, class `PascalCase` + `Pipe`
  ([docs](https://angular.dev/guide/templates/pipes#creating-custom-pipes)).
- Pipes are standalone: add them to the component's `imports`.
- Strict template type checking validates the value and argument types against `transform`'s signature.
- **Reuse outside templates:** extract the logic into a function and call it; the docs advise **not**
  injecting pipe classes into services ("Pipes are not designed as injectable services"); for built-ins
  use `formatDate`, `formatCurrency`, `formatNumber`, `formatPercent`
  ([docs](https://angular.dev/guide/templates/pipes#using-pipe-logic-outside-templates)).

[demo](../../src/app/modules/11-directives-pipes/pipes/truncate-pipe.ts)

## 9. Pure vs impure pipes (with measured call counts)

| | Pure (default) | Impure (`pure: false`) |
| --- | --- | --- |
| `transform` runs | only when the input **value** (primitive) or **reference** (object/array) or an argument changes | on **every** change detection of the view using it |
| Result caching | last value/args cached per binding | none — `transform` called every time |
| Sees in-place mutations (`arr.push`) | ❌ | ✅ |
| Built-in examples | `date`, `currency`, `uppercase`… | `async`, `json`, `keyvalue`, `slice` |

([docs](https://angular.dev/guide/templates/pipes#change-detection-with-pipes); impure built-ins checked
in the sources, e.g. [json_pipe.ts](https://github.com/angular/angular/blob/main/packages/common/src/pipes/json_pipe.ts))

```ts
@Pipe({ name: 'joinImpure', pure: false })   // "Impure" in the name: docs convention
export class JoinImpurePipe implements PipeTransform { … }
```

"Avoid creating impure pipes unless absolutely necessary, as they can incur a significant performance
penalty" ([docs](https://angular.dev/guide/templates/pipes#detecting-change-within-arrays-or-objects)).

**The demo counts real calls** (`CallStats` service) for the same array rendered three ways:

| Action | pure pipe | impure pipe | method `joinViaMethod()` |
| --- | --- | --- | --- |
| click "Unrelated change" | no call | +1 | +1 |
| `push()` (same array) | no call → **stale output** | +1, correct | +1, correct |
| `[...arr, x]` (new array) | +1 | +1 | +1 |

How the counter avoids an infinite loop is itself instructive: counting happens **during** rendering,
so the counts are published to a signal in a microtask and displayed by a **separate child component**
(`CallStatsPanel`). Refreshing that child doesn't re-render the parent (signals mark only the views that
read them), so the impure pipe isn't called again. Displaying the counter in the same template would
re-render it, call the impure pipe, bump the counter… forever.
([demo](../../src/app/modules/11-directives-pipes/pipes/call-stats.ts))

> 💡 **Interview tip:** the right fix for "my pure pipe doesn't update after `push()`" is **immutability**
> (`items = [...items, x]` or `signal.update(list => [...list, x])`), not `pure: false`.

> ⚠️ Not confirmed by official docs / inferred from the framework source: an impure pipe that returns a
> **new object/array on every call** makes every check look like a change (child inputs are re-set each
> time), and in dev mode — where Angular runs an extra `checkNoChanges` pass after change detection
> ([source](https://github.com/angular/angular/blob/main/packages/core/src/application/application_ref.ts))
> — a re-checked binding can throw NG0100 ([docs](https://angular.dev/errors/NG0100)). Return stable
> references (cache the last result) from impure pipes.

## 10. Pipes vs methods vs `computed()`

```html
{{ formatTotal(cart) }}     <!-- method: runs on EVERY check of this view -->
{{ cart | total }}          <!-- pure pipe: runs only when `cart` reference changes -->
{{ total() }}               <!-- computed(): runs only when its signal dependencies change -->
```

- A method call in a template is re-evaluated every time the view is checked (like an impure pipe) —
  visible in the demo's counters.
- A **pure pipe** is memoized per binding by input reference: cheap to re-check, reusable across
  templates, declarative.
- A **`computed()`** is memoized by signal dependencies and is the idiomatic choice for
  component-specific derived state in signal-based code
  ([signals](https://angular.dev/guide/signals)).

> ⚠️ Opinion / rule of thumb: reusable *formatting* → pure pipe; component-specific *derived state* →
> `computed()`; cheap property access → fine inline; anything expensive → never a template method.

---

## 🎯 Likely interview questions

1. **What are the three kinds of directives?**
   <details><summary>Answer</summary>

   Components (with a template), attribute directives (change an element's look/behaviour) and
   structural directives (add/remove DOM via `<ng-template>`).
   ([docs](https://angular.dev/guide/directives#types-of-directives))
   </details>

2. **What does `*` do in `*ngIf`?**
   <details><summary>Answer</summary>

   Syntactic sugar: Angular wraps the element in `<ng-template>` and moves the directive and its
   microsyntax bindings onto it (`*x="a; key: b"` → `[x]="a" [xKey]="b"`).
   ([docs](https://angular.dev/guide/directives/structural-directives#structural-directive-shorthand))
   </details>

3. **Why only one structural directive per element?**
   <details><summary>Answer</summary>

   The shorthand unwraps into a single `<ng-template>`; with two, the nesting order would be ambiguous.
   Use `<ng-container>` to nest. ([docs](https://angular.dev/guide/directives/structural-directives#one-structural-directive-per-element))
   </details>

4. **What are `TemplateRef` and `ViewContainerRef`?**
   <details><summary>Answer</summary>

   `TemplateRef` is the blueprint (the `<ng-template>` content); `ViewContainerRef` is a location where
   embedded views created from templates (or components) can be inserted/removed.
   ([docs](https://angular.dev/guide/directives/structural-directives#creating-a-structural-directive))
   </details>

5. **`host: {}` vs `@HostListener`/`@HostBinding`?**
   <details><summary>Answer</summary>

   Same features; the docs say to always prefer `host`, the decorators exist only for backwards
   compatibility. ([docs](https://angular.dev/guide/components/host-elements#prefer-using-the-host-property-over-the-decorators))
   </details>

6. **Why avoid `nativeElement` manipulation? When is it OK?**
   <details><summary>Answer</summary>

   It bypasses bindings (can be overwritten), sanitization (XSS with `innerHTML`) and is harder to test;
   use it as a last resort for focus, measurement, observers — ideally in `afterNextRender`.
   ([ElementRef](https://angular.dev/api/core/ElementRef), [DOM APIs](https://angular.dev/guide/components/dom-apis))
   </details>

7. **What is the directive composition API?**
   <details><summary>Answer</summary>

   `hostDirectives` applies directives to a component's host at compile time; inputs/outputs must be
   explicitly re-exposed; host directives run before the host component.
   ([docs](https://angular.dev/guide/directives/directive-composition-api))
   </details>

8. **Pure vs impure pipe?**
   <details><summary>Answer</summary>

   Pure (default) runs only when the input value/reference or an argument changes; impure runs on every
   change detection of the view — needed only to detect in-place mutations, costly.
   ([docs](https://angular.dev/guide/templates/pipes#change-detection-with-pipes))
   </details>

9. **Why prefer a pure pipe over a method call in a template?**
   <details><summary>Answer</summary>

   A method runs on every check of the view; a pure pipe is memoized by its inputs. (`computed()` is
   the signal-world equivalent for component-local state.)
   ([docs](https://angular.dev/guide/templates/pipes#change-detection-with-pipes))
   </details>

10. **Is the `async` pipe pure?**
    <details><summary>Answer</summary>

    No, it is impure (`pure: false`) because its output changes when the Observable emits even though
    the input reference stays the same. ([API](https://angular.dev/api/common/AsyncPipe))
    </details>

## 📚 References

- https://angular.dev/guide/directives
- https://angular.dev/guide/directives/attribute-directives
- https://angular.dev/guide/directives/structural-directives
- https://angular.dev/guide/directives/directive-composition-api
- https://angular.dev/guide/components/host-elements
- https://angular.dev/guide/components/dom-apis
- https://angular.dev/guide/templates/variables
- https://angular.dev/guide/templates/pipes
- https://angular.dev/guide/signals
- https://angular.dev/tools/cli/template-typecheck
- https://angular.dev/best-practices/security
- https://angular.dev/api/core/ElementRef
- https://angular.dev/api/core/Renderer2
- https://angular.dev/api/core/ViewContainerRef
- https://angular.dev/api/common/AsyncPipe
- https://angular.dev/guide/hydration
- https://angular.dev/errors/NG0100
- https://angular.dev/errors/NG8023
- https://angular.dev/errors/NG8024
- https://github.com/angular/angular/blob/main/packages/common/src/pipes/json_pipe.ts
- https://github.com/angular/angular/blob/main/packages/core/src/application/application_ref.ts
