# 01 · Basics — templates, bindings, control flow, pipes

An Angular template is HTML plus a small expression language: bindings push data **into** the DOM,
event listeners bring user actions **back** into the class, control-flow blocks shape the DOM, and pipes
format values. Everything here is compiled ahead of time and type-checked against your component class.

> All demos: [`src/app/modules/01-basics/`](../../src/app/modules/01-basics/) — route `/basics`.
> Versions: Angular 22 (zoneless, `OnPush` by default, standalone by default).

## Table of contents

1. [Text interpolation](#1-text-interpolation)
2. [Property, attribute, class and style bindings](#2-property-attribute-class-and-style-bindings)
3. [Event binding, `$event` and key filters](#3-event-binding-event-and-key-filters)
4. [Template reference variables](#4-template-reference-variables)
5. [Two-way binding: `[(ngModel)]` vs signals](#5-two-way-binding-ngmodel-vs-signals)
6. [Built-in control flow: `@if`, `@for`, `@switch`](#6-built-in-control-flow-if-for-switch)
7. [`@let` local variables](#7-let-local-variables)
8. [Legacy structural directives: `*ngIf`, `*ngFor`, `ngSwitch`](#8-legacy-structural-directives-ngif-ngfor-ngswitch)
9. [Built-in pipes](#9-built-in-pipes)
10. [Template expression syntax and restrictions](#10-template-expression-syntax-and-restrictions)
11. [🎯 Likely interview questions](#-likely-interview-questions)
12. [📚 References](#-references)

---

## 1. Text interpolation

`{{ expression }}` evaluates an expression in the context of the component instance and renders the
result as **text** (never as HTML, so it is XSS-safe).

```html
<p>Hello {{ name() }}! You have {{ items().length }} items.</p>
<img alt="Avatar of {{ name() }}" src="..." />  <!-- interpolation in an attribute = property binding -->
```

- `null` and `undefined` render as an empty string; objects use `toString()`
  ([docs](https://angular.dev/guide/templates/binding#render-dynamic-text-with-text-interpolation)).
- Interpolation inside an attribute value (`alt="... {{ x }}"`) is treated as a **property binding**
  ([docs](https://angular.dev/guide/templates/binding#text-interpolation-in-properties-and-attributes)).
- Bindings that change over time should read **signals**: Angular tracks the signals read by a template
  and refreshes it when they change ([docs](https://angular.dev/guide/templates/binding#render-dynamic-text-with-text-interpolation)).

> 💡 **Interview tip:** in Angular 22 components are `OnPush` by default
> ([docs](https://angular.dev/api/core/ChangeDetectionStrategy)). A plain field mutated from a
> `setTimeout` will **not** refresh the view; a signal will. This is why modern code reads signals in
> templates (`{{ name() }}`).

[demo](../../src/app/modules/01-basics/bindings-demo/bindings-demo.html)

## 2. Property, attribute, class and style bindings

### Property binding `[prop]`

Square brackets bind to a **DOM property** of the element (or an input of a component/directive):

```html
<button [disabled]="isSaving()">Save</button>   <!-- HTMLButtonElement.disabled -->
<app-user-card [user]="currentUser()" />          <!-- component input -->
```

### Attribute binding `[attr.x]`

Some HTML attributes have no matching DOM property (e.g. `colspan` → the property is `colSpan`, ARIA,
SVG attributes). Use the `attr.` prefix; Angular calls `setAttribute`, and **binding `null` or `undefined`
removes the attribute** ([docs](https://angular.dev/guide/templates/binding#attributes)).

```html
<td [attr.colspan]="span()">…</td>
<ul [attr.role]="listRole()">…</ul>
<button [aria-label]="label()">…</button>  <!-- ARIA attributes can also be bound directly -->
```

> 💡 **Interview tip — property vs attribute:** an *attribute* is the initial value written in HTML; a
> *property* is the live value on the DOM object. `<input value="a">` sets the attribute; typing changes
> `input.value` (the property) but not the attribute. Angular bindings target properties by default.

### Class binding

| Syntax | Accepts |
| --- | --- |
| `[class.active]="cond"` | truthy/falsy → add/remove one class |
| `[class]="expr"` | `string` (space separated), `string[]`, or `Record<string, any>` |

Static `class="..."`, `[class]` and `[class.x]` are **merged** ([docs](https://angular.dev/guide/templates/binding#css-classes)).

### Style binding

```html
<section [style.display]="open() ? 'block' : 'none'"></section>
<section [style.height.px]="height()"></section>        <!-- unit suffix -->
<section [style]="{ 'font-weight': 'bold', border: '1px solid' }"></section>
```

> ⚠️ **Pitfall:** for `[class]`/`[style]` bound to an **object or array**, Angular compares with `===`.
> Mutating the same object does nothing — create a new one (a `computed()` does this naturally)
> ([docs](https://angular.dev/guide/templates/binding#css-classes)).

> 💡 **Interview tip:** `[class]`/`[style]` bindings replaced most uses of `NgClass`/`NgStyle`. The docs
> still point to `ngClass` for keys containing several space-separated class names or mutated objects
> ([docs](https://angular.dev/guide/templates/binding#css-classes)), and there are
> [migrations](https://angular.dev/reference/migrations) "NgClass to Class" and "NgStyle to Style".

[demo](../../src/app/modules/01-basics/bindings-demo/bindings-demo.html)

## 3. Event binding, `$event` and key filters

```html
<button (click)="save()">Save</button>
<input (keyup)="onKey($event)" />           <!-- $event = the native KeyboardEvent -->
<input (keyup.enter)="submit()" />          <!-- key filter -->
<input (keyup.shift.enter)="newLine()" />   <!-- modifiers: alt, control, meta, shift -->
<input (keydown.code.alt.shift.shiftleft)="…" />  <!-- match KeyboardEvent.code instead of .key -->
```

- `$event` contains the event object; for a component `output()` it is the emitted value
  ([docs](https://angular.dev/guide/templates/event-listeners#accessing-the-event-argument)).
- Key filters match [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key)
  by default; the `code` suffix matches the physical key
  ([`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)),
  useful because e.g. <kbd>Alt</kbd>+<kbd>S</kbd> on macOS reports `key = 'ß'`
  ([docs](https://angular.dev/guide/templates/event-listeners#using-key-modifiers)).
- Global targets in `host` listeners: `window:`, `document:`, `body:`
  ([docs](https://angular.dev/guide/templates/event-listeners#listening-on-global-targets)).
- If a handler statement evaluates to `false`, Angular calls `preventDefault()`. The docs recommend
  calling `event.preventDefault()` explicitly instead
  ([docs](https://angular.dev/guide/templates/event-listeners#preventing-event-default-behavior)).

> 💡 **Interview tip:** with zoneless + OnPush, **a DOM event handled by a template listener marks
> that component (and its ancestors) for check**. That is why clicking a button refreshes a view even
> when the handler mutates a plain field.

> ⚠️ **Pitfall:** a key filter only calls your handler for the matching key, so the view is not
> refreshed on other keys. In the demo, `{{ todoInput.value }}` only updates when <kbd>Enter</kbd> is
> pressed or a button is clicked.

[demo](../../src/app/modules/01-basics/events-demo/events-demo.ts)

## 4. Template reference variables

`#name` declares a variable usable anywhere in the same template
([docs](https://angular.dev/guide/templates/variables#template-reference-variables)):

| Declared on | Value |
| --- | --- |
| a plain element (`<input #box>`) | the DOM element (`HTMLInputElement`) |
| a component (`<app-datepicker #dp>`) | the component instance |
| `<ng-template #tpl>` | a `TemplateRef` |
| an element with a directive + `#x="exportAsName"` | the directive instance (requires `exportAs`) |

```html
<input #todoInput (keyup.enter)="add(todoInput.value)" />
<button (click)="add(todoInput.value)">Add</button>
```

- Scoping: `@if`, `@for`, `<ng-template>` create **nested scopes**: an inner template can read outer
  variables, not the reverse ([docs](https://angular.dev/guide/templates/variables#template-variable-scope)).
- The same `#name` is also a **query locator**: `viewChild('todoInput')` (see module 02).

[demo](../../src/app/modules/01-basics/events-demo/events-demo.html)

## 5. Two-way binding: `[(ngModel)]` vs signals

`[( )]` ("banana in a box") = property binding + event binding
([docs](https://angular.dev/guide/templates/two-way-binding)):

```html
<input [(ngModel)]="name" />
<!-- is sugar for -->
<input [ngModel]="name" (ngModelChange)="name = $event" />
```

- `ngModel` comes from `FormsModule` (import it in the component's `imports`)
  ([docs](https://angular.dev/api/forms/NgModel)).
- The bound target can be a **plain property** or a **`WritableSignal`**. With a signal you pass the
  signal itself — `[(ngModel)]="name"`, **not** `name()` — Angular reads it and calls `.set()` on change.
  The docs show this form with `model()` inputs ("the binding passes the signal *instance*")
  ([docs](https://angular.dev/guide/components/inputs#model-inputs)); the demo verifies it with `ngModel`.
- For custom components, two-way binding is implemented with `model()` (module 02).

> 💡 **Interview tip:** `[(x)]="v"` = `[x]="v"` + `(xChange)="v = $event"`. A `model()` input named `x`
> automatically creates the `xChange` output
> ([docs](https://angular.dev/guide/components/inputs#implicit-change-events)).

> ⚠️ Not confirmed by the current official docs page / from experience: the same desugaring also works
> with a hand-written pair `@Input() x` + `@Output() xChange` (the pre-`model()` pattern you will meet in
> older codebases).

> ⚠️ **Pitfall:** `[(ngModel)]="name()"` is a compile error: you cannot write back into a function call.

[demo](../../src/app/modules/01-basics/two-way-demo/two-way-demo.html)

## 6. Built-in control flow: `@if`, `@for`, `@switch`

Built into the template syntax since Angular 17 — **no import needed**
([migration docs](https://angular.dev/reference/migrations/control-flow)).

### `@if` / `@else if` / `@else`

```html
@if (user(); as u) {
  Hello {{ u.name }}       <!-- u is narrowed: not null here -->
} @else if (loading()) {
  Loading…
} @else {
  Please log in
}
```

`as` stores the condition result for reuse
([docs](https://angular.dev/guide/templates/control-flow#referencing-the-conditional-expressions-result)).

### `@for` + `track` + `@empty`

```html
@for (item of items(); track item.id; let i = $index, isOdd = $odd) {
  <li>{{ i + 1 }}/{{ $count }} {{ item.name }} @if ($first) { (first) }</li>
} @empty {
  <li>No items</li>
}
```

Contextual variables ([docs](https://angular.dev/guide/templates/control-flow#contextual-variables-in-for-blocks)):
`$index`, `$count`, `$first`, `$last`, `$even`, `$odd` — always available, aliasable with `let`
(handy for nested loops). The collection can be any iterable. `@for` does not support `break`/`continue`.

#### Why `track` is mandatory

`track` tells Angular how to map each data item to its DOM nodes, so that on change it performs the
**minimum DOM operations** (move/insert/remove instead of re-creating everything)
([docs](https://angular.dev/guide/templates/control-flow#why-is-track-in-for-blocks-important)).
The compiler rejects a loop without it: *`@for loop must have a "track" expression`*
([compiler source](https://github.com/angular/angular/blob/main/packages/compiler/src/render3/r3_control_flow.ts)).
Making it mandatory forces developers to think about identity — forgetting `trackBy` on `*ngFor` was a
classic performance bug. Pipes are not allowed in the track expression (same source).

| `track …` | When |
| --- | --- |
| `item.id` (unique key) | ✅ default choice |
| `$index` | static lists that never reorder |
| `item` (identity `===`) | last resort — the docs warn it can be much slower |

In dev mode Angular warns about two classic tracking mistakes:
- **NG0955** — the track expression produced **duplicated keys**: Angular may reuse the DOM of another
  item with the same key, and must use slower data structures ([docs](https://angular.dev/errors/NG0955)).
- **NG0956** — tracking by **object identity** (`track item`) caused the **whole list to be re-created**,
  typically with immutable updates (`items.map(i => ({ ...i, done: true }))`); focus and DOM state are
  lost ([docs](https://angular.dev/errors/NG0956)).

The demo has the same list rendered twice with an `<input>` per row: after *Shuffle*, with
`track fruit.id` your typed text **moves with its fruit** (the DOM node moved); with `track $index` the
rows stay in place and only their text changes. The spec
[`basics.spec.ts`](../../src/app/modules/01-basics/basics.spec.ts) asserts this DOM-node identity.

> ⚠️ **Pitfall:** "Unlike `*ngFor`, `@for` prioritizes view reuse": if the tracked key of an item stays
> the same but the object changes, Angular updates the bindings of the existing view instead of
> re-creating it ([docs](https://angular.dev/guide/templates/control-flow#why-is-track-in-for-blocks-important)).
> Don't rely on component re-creation (constructor / `ngOnInit` running again) to "reset" a row.

### `@switch`

```html
@switch (status()) {
  @case ('loading') { <spinner /> }
  @case ('error') @case ('timeout') { <error-box /> }   <!-- consecutive cases share a block -->
  @default { <content /> }
}
```

Compared with `===`, **no fallthrough** (no `break`), `@default` optional
([docs](https://angular.dev/guide/templates/control-flow#conditionally-display-content-with-the-switch-block)).
`@default never;` enables **exhaustive type checking** on a union type; it does not work directly on a
signal call, so assign it to a `@let` first
([docs](https://angular.dev/guide/templates/control-flow#exhaustive-type-checking)).

[demo](../../src/app/modules/01-basics/control-flow-demo/control-flow-demo.html)

## 7. `@let` local variables

```html
@let user = user$ | async;
@let total = price() * quantity();
@if (user) { <h1>{{ user.name }}: {{ total }}</h1> }
```

- One variable per `@let`, terminated by `;`. Kept up to date like a binding
  ([docs](https://angular.dev/guide/templates/variables#local-template-variables-with-let)).
- **Read-only**: `(click)="total = 0"` is invalid
  ([docs](https://angular.dev/guide/templates/variables#assignability)).
- Scoped to the current view and its descendants, **not hoisted**
  ([docs](https://angular.dev/guide/templates/variables#variable-scope)).
- Typical uses: subscribe once with `async` and reuse; name a long expression; narrow a signal value
  (e.g. for `@switch` exhaustiveness).

> 💡 **Interview tip:** prefer `computed()` in the class for logic you want to unit-test; `@let` is for
> presentation-level aliases.

[demo](../../src/app/modules/01-basics/control-flow-demo/control-flow-demo.html)

## 8. Legacy structural directives: `*ngIf`, `*ngFor`, `ngSwitch`

Still very common in existing codebases (and interviews). They are **directives** from `@angular/common`
(import `NgIf`, `NgFor`, … or `CommonModule`) and are **deprecated since v20**
([NgIf](https://angular.dev/api/common/NgIf), [NgFor](https://angular.dev/api/common/NgFor),
[NgSwitch](https://angular.dev/api/common/NgSwitch)).

```html
<!-- Legacy syntax (still supported, deprecated) -->
<div *ngIf="user$ | async as user; else loading">{{ user.name }}</div>
<ng-template #loading>Loading…</ng-template>

<li *ngFor="let item of items; trackBy: trackById; let i = index; let odd = odd">{{ item.name }}</li>

<div [ngSwitch]="status">
  <p *ngSwitchCase="'ok'">OK</p>
  <p *ngSwitchDefault>?</p>
</div>
```

| | Legacy | Built-in control flow |
| --- | --- | --- |
| Import | `NgIf`/`NgFor`/`NgSwitch` or `CommonModule` | none |
| Tracking | `trackBy` **optional** (identity by default) | `track` **required** |
| Empty state | manual `*ngIf="items.length === 0"` | `@empty` |
| else | `; else tplRef` + `<ng-template>` | `@else` / `@else if` |
| Type narrowing | via template guards on the directive | native (`@if (x; as y)`) |
| Wrapper | needs `<ng-container>` to avoid extra elements | blocks render no element |

Migrate automatically with `ng generate @angular/core:control-flow`
([docs](https://angular.dev/reference/migrations/control-flow)).

> 💡 **Interview tip:** `*ngIf` is sugar for `<ng-template [ngIf]="…">` (see module 11 for the `*`
> microsyntax). That is why only **one** structural directive is allowed per element.

## 9. Built-in pipes

A pipe transforms a value in a template: `{{ value | pipeName: arg1 : arg2 }}`. Built-in pipes live in
`@angular/common` and must be **imported** like components
([docs](https://angular.dev/guide/templates/pipes)).

| Pipe | Example | Notes |
| --- | --- | --- |
| [`date`](https://angular.dev/api/common/DatePipe) | `d \| date: 'HH:mm' : 'UTC'` | default format `mediumDate`; 2nd arg timezone |
| [`currency`](https://angular.dev/api/common/CurrencyPipe) | `n \| currency: 'EUR' : 'code' : '1.0-0'` | default currency from `DEFAULT_CURRENCY_CODE` (USD) |
| [`percent`](https://angular.dev/api/common/PercentPipe) | `0.456 \| percent: '1.1-2'` | digitsInfo `minInt.minFrac-maxFrac` |
| [`number`](https://angular.dev/api/common/DecimalPipe) | `n \| number: '1.2-2'` | class is `DecimalPipe` |
| [`uppercase`](https://angular.dev/api/common/UpperCasePipe) / `lowercase` / [`titlecase`](https://angular.dev/api/common/TitleCasePipe) | `s \| titlecase` | |
| [`json`](https://angular.dev/api/common/JsonPipe) | `obj \| json` | debugging; **impure** |
| [`keyvalue`](https://angular.dev/api/common/KeyValuePipe) | `obj \| keyvalue: compareFn` | sorted by key by default; `null` keeps natural order; **impure** |
| [`async`](https://angular.dev/api/common/AsyncPipe) | `obs$ \| async` | subscribes, marks for check, unsubscribes on destroy; **impure** |
| `slice` | `s \| slice: 0 : 7` | **impure** |

Purity was checked in the `@angular/common` sources (`pure: false` on `AsyncPipe`, `JsonPipe`,
`KeyValuePipe`, `SlicePipe`), e.g. [keyvalue_pipe.ts](https://github.com/angular/angular/blob/main/packages/common/src/pipes/keyvalue_pipe.ts).

**Parameters** follow `:`; **chaining** applies left to right: `{{ d | date: 'fullDate' | uppercase }}`
([docs](https://angular.dev/guide/templates/pipes#combining-multiple-pipes-in-the-same-expression)).

**Precedence:** the pipe has *lower* precedence than `+ - * / % && || ??` but *higher* than the ternary
([docs](https://angular.dev/guide/templates/pipes#pipe-operator-precedence)):

```html
{{ first + last | uppercase }}                      <!-- (first + last) | uppercase -->
{{ isAdmin ? 'yes' : 'no' | uppercase }}            <!-- isAdmin ? 'yes' : ('no' | uppercase) ! -->
{{ (isAdmin ? 'yes' : 'no') | uppercase }}          <!-- what you meant -->
```

> 💡 **Interview tip — `async` pipe:** it handles subscription *and* unsubscription, and notifies
> Angular on each emission, which makes it OnPush/zoneless friendly. Use `@let x = obs$ | async;` to
> subscribe only once. In signal-based code, `toSignal()` is the alternative (module 06).

> ⚠️ **Pitfall:** locale-aware pipes (`date`, `currency`, `number`, `percent`) use `LOCALE_ID`
> (`en-US` by default). Other locales must be registered with `registerLocaleData`.
> Outside templates, use `formatDate`/`formatCurrency`/`formatNumber`/`formatPercent` instead of
> injecting the pipe class ([docs](https://angular.dev/guide/templates/pipes#use-formatting-functions-for-built-in-pipes)).

[demo](../../src/app/modules/01-basics/pipes-demo/pipes-demo.html) · custom pipes: module 11.

## 10. Template expression syntax and restrictions

Template expressions are **JavaScript-like but restricted**
([docs](https://angular.dev/guide/templates/expression-syntax)).

**Supported:** literals (incl. template strings and RegExp), arithmetic/comparison/logical operators,
ternary, `??`, `typeof`, `void`, `in`, `instanceof`, spread in literals, arrow functions with an
**expression body** (e.g. `items.filter((i) => i.done).length`), plus Angular-only operators:

| Operator | Meaning |
| --- | --- |
| `\|` | pipe |
| `a?.b` | optional chaining (safe navigation) |
| `a!.b` | TypeScript non-null assertion (type checking only) |

**Not supported:** `new`, bitwise operators (`|` is the pipe!), destructuring, the comma operator,
declarations (`let`, `const`, `function`, `class`), block-body arrow functions, and **globals** — only
`undefined` and `$any` exist, so `Math.max(...)`, `window`, `console` are not available
([docs](https://angular.dev/guide/templates/expression-syntax#globals)). Assignments (`=`, `+=`, `++`)
are only allowed in **event listener statements**; statements, in turn, do not support pipes
([docs](https://angular.dev/guide/templates/expression-syntax#event-listener-statements)).

### Safe navigation `?.` and non-null `!`

```html
{{ user()?.address?.city ?? 'unknown' }}   <!-- no crash when user() or address is null -->
{{ config!.theme }}                         <!-- "trust me, not null" for the type checker -->
{{ $any(event.target).value }}              <!-- escape hatch: disables type checking -->
```

> ⚠️ **Pitfall (Angular 22 change):** before v22, `?.` in templates returned `null` when the left side
> was nullish; **since v22 it returns `undefined`**, like JavaScript. `ng update` wrapped existing
> expressions in `$safeNavigationMigration(...)` to keep the old behaviour
> ([docs](https://angular.dev/guide/templates/expression-syntax#safe-navigation-migration)).

> ⚠️ **Pitfall:** `!` does nothing at runtime. If the value *is* null you still get a `TypeError`.

**Best practices** (opinion, consistent with the docs' guidance): keep expressions fast and side-effect
free (they run on every check of the view), move logic to `computed()` or a pure pipe, and never call
expensive methods from templates (see module 11 for measured call counts).

[demo](../../src/app/modules/01-basics/expressions-demo/expressions-demo.html)

---

## 🎯 Likely interview questions

1. **Property binding vs attribute binding?**
   <details><summary>Answer</summary>

   `[x]` sets a DOM **property** (live state); `[attr.x]` calls `setAttribute`, needed when no property
   exists (ARIA, SVG, `colspan`). Binding `null` to an attribute removes it.
   ([docs](https://angular.dev/guide/templates/binding#attributes))
   </details>

2. **Why is `track` mandatory in `@for`? What should you track by?**
   <details><summary>Answer</summary>

   It maps items to DOM nodes so Angular performs minimal DOM operations; the compiler errors without
   it. Track a unique id; `$index` only for static lists; the item itself as a last resort.
   ([docs](https://angular.dev/guide/templates/control-flow#why-is-track-in-for-blocks-important))
   </details>

3. **What are the contextual variables of `@for`?**
   <details><summary>Answer</summary>

   `$index`, `$count`, `$first`, `$last`, `$even`, `$odd`; aliasable with `let i = $index`.
   ([docs](https://angular.dev/guide/templates/control-flow#contextual-variables-in-for-blocks))
   </details>

4. **What does `[(ngModel)]="x"` expand to? Can `x` be a signal?**
   <details><summary>Answer</summary>

   `[ngModel]="x" (ngModelChange)="x = $event"`. Yes: pass the `WritableSignal` itself (no `()`),
   Angular reads and `.set()`s it. ([docs](https://angular.dev/guide/templates/two-way-binding))
   </details>

5. **Differences between `@if/@for/@switch` and `*ngIf/*ngFor/ngSwitch`?**
   <details><summary>Answer</summary>

   Built-in (no import), mandatory `track`, `@empty`, `@else if`, better type narrowing, no wrapper
   element. The directives are deprecated since v20.
   ([docs](https://angular.dev/reference/migrations/control-flow), [NgIf](https://angular.dev/api/common/NgIf))
   </details>

6. **What is a template reference variable and what does it reference?**
   <details><summary>Answer</summary>

   `#ref` on an element → the DOM element; on a component → its instance; on `<ng-template>` → a
   `TemplateRef`; `#ref="exportAsName"` → a directive instance.
   ([docs](https://angular.dev/guide/templates/variables#template-reference-variables))
   </details>

7. **Can you use `Math.round()` or `new Date()` in a template?**
   <details><summary>Answer</summary>

   No: only `undefined` and `$any` globals exist and `new` is unsupported. Expose a method/computed or
   use a pipe. ([docs](https://angular.dev/guide/templates/expression-syntax#globals))
   </details>

8. **What does `{{ a ? 'x' : 'y' | uppercase }}` render when `a` is true?**
   <details><summary>Answer</summary>

   `x` (lowercase): the pipe binds tighter than the ternary, so only `'y'` is piped. Use parentheses.
   ([docs](https://angular.dev/guide/templates/pipes#pipe-operator-precedence))
   </details>

9. **What is `@let` and can you reassign it?**
   <details><summary>Answer</summary>

   A template-local, read-only variable kept in sync with its expression; it cannot be reassigned and is
   not hoisted. ([docs](https://angular.dev/guide/templates/variables#local-template-variables-with-let))
   </details>

10. **Why is the `async` pipe considered good practice?**
    <details><summary>Answer</summary>

    It subscribes, triggers change detection on emission, and unsubscribes automatically on destroy —
    no manual subscription management. ([docs](https://angular.dev/api/common/AsyncPipe))
    </details>

## 📚 References

- https://angular.dev/guide/templates
- https://angular.dev/guide/templates/binding
- https://angular.dev/guide/templates/event-listeners
- https://angular.dev/guide/templates/two-way-binding
- https://angular.dev/guide/templates/control-flow
- https://angular.dev/guide/templates/variables
- https://angular.dev/guide/templates/pipes
- https://angular.dev/guide/templates/expression-syntax
- https://angular.dev/guide/components/inputs
- https://angular.dev/api/core/ChangeDetectionStrategy
- https://angular.dev/api/forms/NgModel
- https://angular.dev/api/common/NgIf
- https://angular.dev/api/common/NgFor
- https://angular.dev/api/common/NgSwitch
- https://angular.dev/api/common/DatePipe
- https://angular.dev/api/common/CurrencyPipe
- https://angular.dev/api/common/PercentPipe
- https://angular.dev/api/common/DecimalPipe
- https://angular.dev/api/common/UpperCasePipe
- https://angular.dev/api/common/TitleCasePipe
- https://angular.dev/api/common/JsonPipe
- https://angular.dev/api/common/KeyValuePipe
- https://angular.dev/api/common/AsyncPipe
- https://angular.dev/reference/migrations
- https://angular.dev/reference/migrations/control-flow
- https://angular.dev/errors/NG0955
- https://angular.dev/errors/NG0956
- https://github.com/angular/angular/blob/main/packages/compiler/src/render3/r3_control_flow.ts
- https://github.com/angular/angular/blob/main/packages/common/src/pipes/keyvalue_pipe.ts
- https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
- https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
