# 02 · Components — solutions

All solutions were compiled with strict template type checking and exercised in a temporary TestBed
spec (Angular 22.2): rendering, `model()` propagation, accordion behaviour and tab laziness.

---

## Solution 1 — Alert component

```ts
import { Component, booleanAttribute, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-alert',
  host: {
    role: 'alert',
    class: 'alert',
    '[class]': '"alert-" + type()',
  },
  template: `
    <ng-content />
    @if (dismissible()) {
      <button type="button" aria-label="Dismiss" (click)="dismissed.emit()">✕</button>
    }
  `,
  styles: `
    :host { display: flex; justify-content: space-between; padding: 8px; border-radius: 6px; }
    :host(.alert-info) { background: #e3f2fd; }
    :host(.alert-success) { background: #e8f5e9; }
    :host(.alert-error) { background: #ffebee; }
  `,
})
export class Alert {
  readonly type = input<'info' | 'success' | 'error'>('info');
  readonly dismissible = input(false, { transform: booleanAttribute });
  readonly dismissed = output<void>();
}

@Component({
  selector: 'app-alert-demo',
  imports: [Alert],
  template: `
    @if (visible()) {
      <app-alert type="error" dismissible (dismissed)="visible.set(false)">Disk almost full!</app-alert>
    }
    <app-alert>Static info alert</app-alert>
  `,
})
export class AlertDemo {
  protected readonly visible = signal(true);
}
```

**Why:**
- `booleanAttribute` lets the consumer write `dismissible` like a native boolean attribute.
- The static `class: 'alert'` and the dynamic `'[class]'` host binding are **merged** by Angular.
- `:host(.alert-error)` styles the host depending on a class set by our own host binding.
- `output<void>()` + `emit()` with no argument; the parent owns the visibility state (presentational
  component, no service).

---

## Solution 2 — Quantity picker with `model()`

```ts
import { Component, input, model, numberAttribute, signal } from '@angular/core';

@Component({
  selector: 'app-quantity',
  template: `
    <button type="button" (click)="dec()" [disabled]="value() <= min()">−</button>
    <span>{{ value() }}</span>
    <button type="button" (click)="inc()" [disabled]="value() >= max()">+</button>
  `,
})
export class Quantity {
  readonly value = model(0);
  readonly min = input(0);
  readonly max = input(Number.MAX_SAFE_INTEGER);
  readonly step = input(1, { transform: numberAttribute });

  protected inc(): void {
    this.value.update((v) => Math.min(this.max(), v + this.step()));
  }

  protected dec(): void {
    this.value.update((v) => Math.max(this.min(), v - this.step()));
  }
}

@Component({
  selector: 'app-quantity-demo',
  imports: [Quantity],
  template: `
    <app-quantity [(value)]="qty" [min]="1" [max]="10" step="2" />
    <p>qty() = {{ qty() }} <button type="button" (click)="qty.set(1)">Reset</button></p>
    <app-quantity [value]="other()" (valueChange)="other.set($event)" [max]="5" />
    <p>other() = {{ other() }}</p>
  `,
})
export class QuantityDemo {
  protected readonly qty = signal(1);
  protected readonly other = signal(0);
}
```

**Why:**
- `model(0)` is both an input and a writable signal; `update()` notifies the parent through the implicit
  `valueChange` output.
- `[(value)]="qty"` passes the **signal**: when the parent calls `qty.set(1)`, the picker updates (data
  flows both ways).
- `step="2"` is a string attribute → `numberAttribute` converts it (a plain `input(1)` would be a type
  error with a string literal).
- Model inputs can't have transforms, which is why `value` has none.

---

## Solution 3 — Panel with multi-slot projection

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-panel',
  template: `
    <header><ng-content select="[panel-header]">Untitled</ng-content></header>
    <section><ng-content /></section>
    <footer>
      <ng-content select="[panel-actions]"><button type="button" disabled>No action</button></ng-content>
    </footer>
  `,
  styles: `:host { display: block; border: 1px solid #ddd; margin: 8px 0; } header { font-weight: bold; }`,
})
export class Panel {}

@Component({
  selector: 'app-panel-demo',
  imports: [Panel],
  template: `
    <app-panel>
      <h3 panel-header>Settings</h3>
      <p>All slots filled.</p>
      <button panel-actions type="button">Save</button>
    </app-panel>

    <app-panel><p>Only a body: header and actions show their fallback.</p></app-panel>

    <app-panel>
      <ng-container ngProjectAs="[panel-header]">
        <span>⚙️</span> <strong>Grouped header</strong>
      </ng-container>
      <p>The ng-container projected both elements into the header slot.</p>
    </app-panel>
  `,
})
export class PanelDemo {}
```

**Why:**
- Each `select` takes a CSS selector; the default `<ng-content />` takes everything else.
- Children of `<ng-content>` are **fallback** content, rendered only when nothing matches.
- `<ng-container ngProjectAs="[panel-header]">` groups several nodes into one slot without adding a DOM
  element. `ngProjectAs` must be static.

---

## Solution 4 — Accordion compound component

```ts
import { Component, booleanAttribute, computed, contentChildren, inject, input, signal } from '@angular/core';

@Component({
  selector: 'app-accordion',
  template: `<p>{{ items().length }} sections</p><ng-content />`,
})
export class Accordion {
  readonly allowMultiple = input(false, { transform: booleanAttribute });
  readonly items = contentChildren(AccordionItem);
  private readonly openItems = signal<ReadonlySet<AccordionItem>>(new Set());

  isOpen(item: AccordionItem): boolean {
    return this.openItems().has(item);
  }

  toggle(item: AccordionItem): void {
    this.openItems.update((current) => {
      const next = new Set(this.allowMultiple() ? current : []);
      if (current.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }
}

@Component({
  selector: 'app-accordion-item',
  template: `
    <button type="button" (click)="accordion.toggle(this)">{{ open() ? '▼' : '▶' }} {{ title() }}</button>
    @if (open()) { <div class="body"><ng-content /></div> }
  `,
})
export class AccordionItem {
  readonly title = input.required<string>();
  protected readonly accordion = inject(Accordion);
  protected readonly open = computed(() => this.accordion.isOpen(this));
}

@Component({
  selector: 'app-accordion-demo',
  imports: [Accordion, AccordionItem],
  template: `
    <app-accordion>
      <app-accordion-item title="One">First</app-accordion-item>
      <app-accordion-item title="Two">Second</app-accordion-item>
      <app-accordion-item title="Three">Third</app-accordion-item>
    </app-accordion>
    <app-accordion allowMultiple>
      <app-accordion-item title="A">a</app-accordion-item>
      <app-accordion-item title="B">b</app-accordion-item>
    </app-accordion>
  `,
})
export class AccordionDemo {}
```

**Why:**
- `contentChildren(AccordionItem)` lists the items projected **directly** into the accordion and stays
  up to date.
- Items **pull** their state (`computed(() => accordion.isOpen(this))`) instead of the parent pushing
  into them — one source of truth, no `ExpressionChangedAfterItHasBeenChecked` risk (see the docs'
  "common query pitfalls").
- `inject(Accordion)` works because the item is declared inside the accordion's content: element
  injectors follow the **declaration** hierarchy of the template.
- Both classes live in one file: the field initializers referencing each other run at instantiation time,
  so there is no circular-import or "used before declaration" problem.

---

## Solution 5 — Lazy tabs with `ng-template`

```ts
import { Component, Directive, TemplateRef, computed, contentChildren, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export const tabCreations: string[] = [];

@Directive({ selector: 'ng-template[appTabLabel]' })
export class TabLabel {
  readonly label = input.required<string>({ alias: 'appTabLabel' });
  readonly template = inject<TemplateRef<{ $implicit: number }>>(TemplateRef);
}

@Component({
  selector: 'app-lazy-tabs',
  imports: [NgTemplateOutlet],
  template: `
    @for (tab of tabs(); track tab; let i = $index) {
      <button type="button" [disabled]="i === activeIndex()" (click)="select(i)">{{ tab.label() }}</button>
    }
    <div class="panel">
      <ng-container [ngTemplateOutlet]="active()?.template ?? null" [ngTemplateOutletContext]="{ $implicit: visits()[activeIndex()] ?? 0 }" />
    </div>
  `,
})
export class LazyTabs {
  readonly tabs = contentChildren(TabLabel);
  protected readonly activeIndex = signal(0);
  protected readonly visits = signal<Record<number, number>>({ 0: 1 });
  // Explicit `| undefined`: indexing may miss (e.g. before the content query resolves).
  protected readonly active = computed<TabLabel | undefined>(() => this.tabs()[this.activeIndex()]);

  protected select(i: number): void {
    this.activeIndex.set(i);
    this.visits.update((v) => ({ ...v, [i]: (v[i] ?? 0) + 1 }));
  }
}

@Component({
  selector: 'app-tab-probe',
  template: `<em>probe {{ name() }}</em>`,
})
export class TabProbe {
  readonly name = input.required<string>();
  constructor() {
    queueMicrotask(() => tabCreations.push(this.name()));
  }
}

@Component({
  selector: 'app-lazy-tabs-demo',
  imports: [LazyTabs, TabLabel, TabProbe],
  template: `
    <app-lazy-tabs>
      <ng-template appTabLabel="Profile" let-visits>
        <app-tab-probe name="profile" /> Profile opened {{ visits }} time(s)
      </ng-template>
      <ng-template appTabLabel="Billing" let-visits>
        <app-tab-probe name="billing" /> Billing opened {{ visits }} time(s)
      </ng-template>
    </app-lazy-tabs>
  `,
})
export class LazyTabsDemo {}
```

**Why:**
- The directive's selector `ng-template[appTabLabel]` restricts it to `<ng-template>` elements, so
  `inject(TemplateRef)` always succeeds.
- `contentChildren(TabLabel)` gives both the label (input) and the template of each tab.
- `ngTemplateOutlet` instantiates **only** the active template; switching tabs destroys the previous
  embedded view. The temporary spec asserted that only `profile` is created at first, then `billing`
  after a click — something `<ng-content>` inside `@if` cannot achieve.
- The context object's `$implicit` is what `let-visits` receives.

---

## Solution 6 — Debugging challenge

Fixed version:

```ts
import { Component, ElementRef, booleanAttribute, effect, input, viewChild } from '@angular/core';

function drawChart(canvas: HTMLCanvasElement, data: readonly number[]): void {
  canvas.dataset['points'] = String(data.length); // stub
}

@Component({ selector: 'app-heavy-report', template: `<p>Heavy report</p>` })
export class HeavyReport {}

/** Fixed modal: renders a template lazily instead of a conditional <ng-content>. */
@Component({
  selector: 'app-modal',
  template: `@if (open()) { <ng-content /> }`,
})
export class Modal {
  readonly open = input(false, { transform: booleanAttribute });
}

@Component({
  selector: 'app-dashboard',
  imports: [Modal, HeavyReport],
  template: `
    <h2>{{ title() }}</h2>
    @if (data().length) { <canvas #chart></canvas> }
    <app-modal [open]="reportOpen">
      @if (reportOpen) { <app-heavy-report /> }
    </app-modal>
  `,
  styles: `h2 { color: red; }`,
})
export class Dashboard {
  readonly title = input.required<string>();
  readonly data = input<number[]>([]);
  protected reportOpen = false;
  private readonly chart = viewChild<ElementRef<HTMLCanvasElement>>('chart');

  constructor() {
    effect(() => {
      const canvas = this.chart()?.nativeElement;
      if (canvas) drawChart(canvas, this.data());
    });
  }
}

@Component({
  selector: 'app-dashboard-demo',
  imports: [Dashboard],
  template: `<app-dashboard title="Sales" [data]="[1, 2, 3]" />`,
})
export class DashboardDemo {}
```

1. **NG0950 at startup** — signal inputs are set *after* construction; reading `title()` in the
   constructor throws. Read inputs in the template, a `computed`/`effect`, or from `ngOnInit`.
   ([NG0950](https://angular.dev/errors/NG0950))
2. **`chart` undefined in `ngOnInit`** — `static: true` promises the element is never inside control flow,
   but it is inside `@if`, so it is not resolved at `ngOnInit` time (and static queries never update).
   Fix: signal `viewChild()` + `effect()` that draws whenever the canvas **and** data are available.
   ([queries](https://angular.dev/guide/components/queries#static-queries))
3. **All `<h2>` red** — `::ng-deep` at the start of a selector disables emulated encapsulation for the
   whole selector: it becomes a **global** style. Remove it (a plain `h2` rule is scoped to this
   component) or at least prefix with `:host`. ([styling](https://angular.dev/guide/components/styling#ng-deep))
4. **`HeavyReport` loaded while hidden** — projected content belongs to the **parent** and is always
   instantiated, even if the `<ng-content>` sits inside `@if`. Either the consumer guards it
   (`@if (reportOpen) { <app-heavy-report /> }`, as above) or the modal accepts an `<ng-template>`
   rendered with `ngTemplateOutlet` (solution 5).
   ([content projection](https://angular.dev/guide/components/content-projection))
