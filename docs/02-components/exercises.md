# 02 · Components — exercises

Work in [`src/app/sandbox/`](../../src/app/sandbox/), add your components to `sandbox.ts` `imports` and
render them in `sandbox.html` (route `/sandbox`). Solutions: [solutions.md](./solutions.md).

---

## Exercise 1 ⭐ — Alert component (inputs, outputs, host, projection)

**Goal:** write a small but complete presentational component.

Create `<app-alert>`:

- [ ] `type = input<'info' | 'success' | 'error'>('info')`.
- [ ] `dismissible` boolean input usable as a bare attribute: `<app-alert dismissible>`.
- [ ] The message is **projected** (`<ng-content />`).
- [ ] Host bindings via `host: {}`: `role="alert"` and a class `alert-<type>` on the host element.
- [ ] When dismissible, show a ✕ button that emits a `dismissed` output (no payload).
- [ ] The parent hides the alert when `dismissed` fires.

<details><summary>Hints</summary>

- `input(false, { transform: booleanAttribute })`.
- `'[class]': '"alert-" + type()'` in `host` (static `class` attributes are merged).
- `output<void>()` → `this.dismissed.emit()`.
</details>

**Where:** `src/app/sandbox/alert.ts`

---

## Exercise 2 ⭐ — Quantity picker with `model()`

**Goal:** custom two-way binding.

- [ ] `<app-quantity [(value)]="qty" [min]="1" [max]="10" step="2" />`.
- [ ] `value = model(0)`, `min`/`max` inputs, `step` accepts a string attribute (use `numberAttribute`).
- [ ] − / + buttons clamp the value between `min` and `max` and are disabled at the bounds.
- [ ] In the parent, `qty` is a signal; display `qty()` and a "Reset" button setting it to 1 —
      the picker must update.
- [ ] Also bind a second picker with the desugared syntax `[value]` + `(valueChange)`.

<details><summary>Hints</summary>

- `this.value.update(v => Math.min(this.max(), v + this.step()))`.
- `[(value)]="qty"` — pass the signal, not `qty()`.
</details>

**Where:** `src/app/sandbox/quantity.ts`

---

## Exercise 3 ⭐⭐ — Panel with multi-slot projection

**Goal:** `select`, default slot, fallback content, `ngProjectAs`.

- [ ] `<app-panel>` has three slots: `[panel-header]`, default body, `[panel-actions]`.
- [ ] Header fallback: "Untitled"; actions fallback: a disabled "No action" button.
- [ ] Use it three times: all slots filled; no header/actions (fallbacks visible); and a header given
      by an `<ng-container ngProjectAs="[panel-header]">` wrapping **two** elements (icon + title).

<details><summary>Hints</summary>

- `<ng-content select="[panel-header]">Untitled</ng-content>`.
- Without a wrapper you would have to put `panel-header` on each element; `ngProjectAs` on an
  `<ng-container>` projects the whole group into the slot (the container itself renders no element).
</details>

**Where:** `src/app/sandbox/panel.ts`

---

## Exercise 4 ⭐⭐ — Accordion compound component (`contentChildren` + inject parent)

**Goal:** content queries and parent/child coordination without writing into children.

- [ ] `<app-accordion>` contains several `<app-accordion-item title="…">content</app-accordion-item>`.
- [ ] Only one item is open at a time; clicking a title toggles it.
- [ ] The accordion shows "`n` sections" using `contentChildren(AccordionItem)`.
- [ ] An `allowMultiple` boolean input on the accordion lets several items be open.
- [ ] Items read their open state from the accordion (inject it), the accordion never sets fields on items.

<details><summary>Hints</summary>

- Store open items in the accordion as `signal<ReadonlySet<AccordionItem>>`.
- In the item: `private acc = inject(Accordion); open = computed(() => this.acc.isOpen(this));`.
- Declare both classes in one file to avoid a circular import.
</details>

**Where:** `src/app/sandbox/accordion.ts`

---

## Exercise 5 ⭐⭐⭐ — Lazy tabs with `ng-template` and a template context

**Goal:** conditional projection that does not instantiate hidden content.

- [ ] `<app-lazy-tabs>` receives tabs as `<ng-template appTabLabel="Profile" let-visits>…</ng-template>`.
- [ ] A directive `[appTabLabel]` (on `<ng-template>`) exposes `label = input.required<string>({ alias: 'appTabLabel' })`
      and injects its `TemplateRef`.
- [ ] `LazyTabs` uses `contentChildren(TabLabel)` to render the headers and `ngTemplateOutlet` to render
      **only the active** tab, passing `{ $implicit: visitCount }` as context (how many times this tab was opened).
- [ ] Prove laziness: put a child component in each tab that logs in its constructor; only the active
      tab's child must be created, and it must be destroyed when you switch away.

<details><summary>Hints</summary>

- `inject(TemplateRef)` in a directive applied to `<ng-template>` gives that template.
- `[ngTemplateOutlet]="active()?.template ?? null"`.
</details>

**Where:** `src/app/sandbox/lazy-tabs.ts`

---

## Exercise 6 ⭐⭐⭐ — Debugging challenge (explain out loud)

A colleague's component has four problems. For each, explain **why** it happens and fix it.

```ts
@Component({
  selector: 'app-dashboard',
  imports: [Chart, Modal],
  template: `
    @if (data().length) { <canvas #chart></canvas> }
    <app-modal [open]="false"><app-heavy-report /></app-modal>
  `,
  styles: `::ng-deep h2 { color: red; }`,
})
export class Dashboard implements OnInit {
  readonly title = input.required<string>();
  readonly data = input<number[]>([]);
  @ViewChild('chart', { static: true }) chart?: ElementRef<HTMLCanvasElement>;

  constructor() {
    console.log('Dashboard for', this.title());
  }

  ngOnInit() {
    drawChart(this.chart!.nativeElement, this.data());
  }
}
// Modal template: @if (open()) { <ng-content /> }
```

1. The console shows **NG0950** at startup.
2. `this.chart` is `undefined` in `ngOnInit` (crash).
3. Every `<h2>` of the whole application turns red.
4. `HeavyReport` fires its HTTP calls on page load although the modal is closed.

<details><summary>Hints</summary>

Inputs timing · static queries vs `@if` · emulated encapsulation and `::ng-deep` · projected content
ownership.
</details>

**Where:** out loud, then fix it in `src/app/sandbox/dashboard.ts` (stub `drawChart`, `Modal` and `HeavyReport`).
