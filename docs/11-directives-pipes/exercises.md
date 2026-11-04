# 11 · Directives & pipes — exercises

Work in [`src/app/sandbox/`](../../src/app/sandbox/), import your directives/pipes into a sandbox
component and try them on `/sandbox`. Solutions: [solutions.md](./solutions.md).

---

## Exercise 1 ⭐ — `appAutofocus` attribute directive

**Goal:** a minimal directive using `inject(ElementRef)` correctly.

- [ ] `<input appAutofocus />` focuses the input once it is rendered.
- [ ] `<input [appAutofocus]="false" />` does not.
- [ ] The DOM access happens in a **render callback**, not in the constructor or `ngOnInit`.

<details><summary>Hints</summary>

- `input(true, { alias: 'appAutofocus', transform: booleanAttribute })` — a bare attribute is `''`,
  which `booleanAttribute` turns into `true`.
- `afterNextRender(() => …)` must be called in an injection context (constructor/field initializer).
</details>

**Where:** `src/app/sandbox/autofocus.ts`

---

## Exercise 2 ⭐ — `appClickOutside` with host listeners

**Goal:** global event targets in `host`, an `output()` on a directive.

- [ ] `<div (appClickOutside)="close()">` emits when the user clicks anywhere **outside** the element.
- [ ] Use `host: { '(document:click)': … }` (no `@HostListener`, no manual `addEventListener`).
- [ ] Use it to close a small dropdown.
- [ ] Bonus: write the legacy `@HostListener('document:click', ['$event'])` version and compare.

<details><summary>Hints</summary>

- `this.el.nativeElement.contains(event.target as Node)`.
- The output can have the same name as the selector: `readonly appClickOutside = output<MouseEvent>()`.
</details>

**Where:** `src/app/sandbox/click-outside.ts`

---

## Exercise 3 ⭐⭐ — `*appHasRole` structural directive with an `else` template

**Goal:** `TemplateRef`, `ViewContainerRef`, microsyntax keys.

- [ ] A `RoleService` (root) exposes `role = signal<'guest' | 'user' | 'admin'>('guest')`.
- [ ] `<button *appHasRole="'admin'; else denied">Delete</button>` renders only for admins, otherwise
      renders `<ng-template #denied>`.
- [ ] Changing the role at runtime updates the view (signals + `effect`).
- [ ] Write the **desugared** `<ng-template>` form next to it and explain the `else` → `appHasRoleElse`
      mapping.

<details><summary>Hints</summary>

- Inputs: `appHasRole = input.required<Role>()`, `appHasRoleElse = input<TemplateRef<unknown> | null>(null)`.
- Clear the container before switching between the main and the else template.
</details>

**Where:** `src/app/sandbox/has-role.ts`

---

## Exercise 4 ⭐⭐ — `fileSize` pipe with arguments, then chaining

**Goal:** pure pipe with arguments, logic extracted into a function.

- [ ] `{{ 1536 | fileSize }}` → `1.5 KB`, `{{ 1048576 | fileSize: 0 }}` → `1 MB`, `{{ 0 | fileSize }}` → `0 B`.
- [ ] Second argument `'si'` uses powers of 1000 instead of 1024 (`kB`, `MB`…).
- [ ] The logic lives in `formatFileSize(bytes, decimals, mode)`, reused by a service method too.
- [ ] Chain it: `{{ size | fileSize | uppercase }}`.
- [ ] Explain why the pipe must stay **pure**.

<details><summary>Hints</summary>

- `Math.floor(Math.log(bytes) / Math.log(base))` gives the unit index.
- `Number(value.toFixed(decimals))` removes trailing zeros.
</details>

**Where:** `src/app/sandbox/file-size-pipe.ts`

---

## Exercise 5 ⭐⭐⭐ — Composition with `hostDirectives`

**Goal:** build a component from reusable behaviours.

- [ ] Directive `Disableable` (`[appDisableable]`): `disabled` boolean input; host bindings
      `[attr.aria-disabled]`, `[class.is-disabled]`, `[attr.tabindex]` (`-1` when disabled, `0` otherwise).
- [ ] Directive `ClickTracker` (`[appClickTracker]`): `trackId` input; on host click, if the injected
      `Disableable` (optional) is not disabled, emits `tracked` with the id.
- [ ] Component `<app-action-button>` uses both via `hostDirectives`, exposing `disabled` and `trackId`
      as inputs and `tracked` as an output.
- [ ] Prove the order of execution: log from each constructor.

<details><summary>Hints</summary>

- `inject(Disableable, { optional: true })` inside `ClickTracker`.
- `hostDirectives: [{ directive: Disableable, inputs: ['disabled'] }, { directive: ClickTracker, inputs: ['trackId'], outputs: ['tracked'] }]`.
</details>

**Where:** `src/app/sandbox/action-button.ts`

---

## Exercise 6 ⭐⭐⭐ — Debugging challenge (explain out loud)

This list of 5 000 orders is slow and buggy. Find the problems, explain them, fix them.

```ts
@Pipe({ name: 'filterBy', pure: false })
export class FilterByPipe implements PipeTransform {
  transform(items: Order[], text: string) {
    return items.filter((o) => o.customer.includes(text));
  }
}

@Directive({ selector: '[appHighlightText]' })
export class HighlightText {
  @Input() appHighlightText = '';
  private el = inject(ElementRef);
  ngOnChanges() {
    this.el.nativeElement.innerHTML = this.el.nativeElement.textContent
      .replace(this.appHighlightText, `<mark>${this.appHighlightText}</mark>`);
  }
}
```
```html
<input [(ngModel)]="search" />
<p>Total: {{ computeTotal(orders) }}</p>
<li *ngFor="let o of orders | filterBy: search" *ngIf="o.visible" [appHighlightText]="search">
  {{ o.customer }}
</li>
```

<details><summary>Hints</summary>

At least five issues: impure pipe + new array each call, template method, two structural directives on one
element, `innerHTML` with user input, `textContent` vs Angular's own text binding, no `track`.
</details>

**Where:** out loud, then fix in `src/app/sandbox/orders.ts`.
