# 01 · Basics — exercises

Work in [`src/app/sandbox/`](../../src/app/sandbox/): create one component per exercise, add it to the
`imports` of `sandbox.ts` and render it in `sandbox.html` (route `/sandbox`).
Solutions: [solutions.md](./solutions.md).

---

## Exercise 1 ⭐ — User badge with every binding flavour

**Goal:** practise interpolation, property, attribute, class and style bindings.

Create `UserBadge` (`user-badge.ts`) showing a user `{ name: string; plan: 'free' | 'premium'; score: number }`
stored in a signal.

- [ ] Display `name` and `score` with interpolation.
- [ ] Add the class `premium` only when `plan === 'premium'` (`[class.x]`).
- [ ] Set the text colour with `[style.color]`: green if score ≥ 50, red otherwise.
- [ ] Set the badge width with `[style.width.px]` = `score * 2`.
- [ ] Set a `title` attribute and a `data-plan` attribute (`[attr.data-plan]`); remove `data-plan` when
      the plan is `free` (bind `null`).
- [ ] A button toggles the plan, another adds 10 to the score.

<details><summary>Hints</summary>

- `null` removes an attribute with `[attr.x]`.
- Signals: `user.update(u => ({ ...u, score: u.score + 10 }))` (new object!).
</details>

**Where:** `src/app/sandbox/user-badge.ts`

---

## Exercise 2 ⭐ — Keyboard-driven todo list

**Goal:** event binding, key filters, template reference variables, `@for` contextual variables.

- [ ] An `<input #draft>`: <kbd>Enter</kbd> adds the trimmed text (ignore empty), <kbd>Escape</kbd> clears the input.
- [ ] Each todo has a unique `id` (incrementing number). Render them with `@for` tracked by `id`.
- [ ] Show `index + 1` / `$count` before each todo, and add a `last` class to the last one.
- [ ] Each row has a ✕ button removing that todo.
- [ ] When the list is empty, show "Nothing to do 🎉" with `@empty`.

<details><summary>Hints</summary>

- `(keyup.enter)="add(draft)"` passes the `HTMLInputElement`.
- `(keyup.escape)` exists too (key names come from `KeyboardEvent.key`, lower-cased).
- `let i = $index, isLast = $last`.
</details>

**Where:** `src/app/sandbox/key-todos.ts`

---

## Exercise 3 ⭐⭐ — Filterable product table

**Goal:** two-way binding with a signal, `computed`, `@for`/`@empty`, `@switch`, `@let`, pipes.

Data: an array of `{ id: number; name: string; price: number; stock: number }` (6+ items).

- [ ] A search `<input [(ngModel)]="query">` where `query` is a **signal**.
- [ ] A `computed()` returns the products whose name contains the query (case-insensitive).
- [ ] Render a table with `@for … track p.id` and `@empty` ("No product matches …").
- [ ] Price column uses the `currency` pipe in EUR without decimals.
- [ ] Stock column uses `@switch` on a computed status: `0` → "Out of stock", `< 5` → "Low", otherwise "In stock".
- [ ] Above the table, `@let count = filtered().length;` and display "`count` result(s)".

<details><summary>Hints</summary>

- `imports: [FormsModule, CurrencyPipe]`.
- `currency: 'EUR' : 'symbol' : '1.0-0'`.
- `@switch (true)` is legal but unclear — prefer a helper returning `'out' | 'low' | 'ok'`.
</details>

**Where:** `src/app/sandbox/product-table.ts`

---

## Exercise 4 ⭐⭐ — Invoice with built-in pipes

**Goal:** pipe parameters, chaining, `keyvalue`, `async`.

- [ ] Show an invoice date with `date: 'longDate'` and its time in UTC (`date: 'HH:mm' : 'UTC'`).
- [ ] Show the customer name with `titlecase` and the invoice number with `uppercase`.
- [ ] Show the total as `currency: 'CAD' : 'code'` and the tax rate (0.14975) as a percentage with 2 decimals.
- [ ] Render a `Map<string, number>` of line items **in insertion order** with `keyvalue`.
- [ ] Show a live "printed at" clock using an `Observable` + `async` + `date: 'mediumTime'`.
- [ ] Debug the whole invoice object with `json` inside a `<pre>`.

<details><summary>Hints</summary>

- `keyvalue: null` keeps the natural order.
- `interval(1000).pipe(map(() => new Date()))`.
</details>

**Where:** `src/app/sandbox/invoice.ts`

---

## Exercise 5 ⭐⭐⭐ — Debugging challenge: find the 6 bugs

The following component compiles with errors **or** behaves incorrectly. Find and fix every problem,
and explain each fix in one sentence.

```ts
@Component({
  selector: 'app-buggy',
  imports: [FormsModule, UpperCasePipe],
  template: `
    <input [(ngModel)]="name()" />
    <p>Rounded score: {{ Math.round(score()) }}</p>
    <p [class]="classes">{{ isAdmin() ? 'admin' : 'user' | uppercase }}</p>
    <button (click)="toggle()">toggle</button>
    <ul>
      @for (item of items()) { <li>{{ item.label }}</li> }
    </ul>
    @if (user()?.email === null) { <p>No email</p> }
  `,
})
export class Buggy {
  name = signal('Ada');
  score = signal(7.6);
  isAdmin = signal(true);
  classes = { active: false };
  items = signal([{ id: 1, label: 'A' }]);
  user = signal<{ email?: string } | null>(null);
  toggle() { this.classes.active = !this.classes.active; }
}
```

<details><summary>Hints</summary>

- Three are compile errors, three are runtime/behaviour bugs.
- Think about: writable targets, globals, pipe precedence, object identity, `track`, and Angular 22's `?.`.
</details>

**Where:** `src/app/sandbox/buggy.ts`

---

## Exercise 6 ⭐⭐⭐ — Explain out loud (interview simulation)

Without notes, explain in ~2 minutes:

1. What Angular does to the DOM when you **reverse** a list of 1 000 rows rendered with
   `track item.id`, versus `track $index`, versus `*ngFor` without `trackBy` when the array is re-fetched
   from the server (new objects, same ids).
2. Why `@for` requires `track` while `*ngFor` made `trackBy` optional.
3. Why the legacy structural directives needed `<ng-container>` and `<ng-template>` so often, and why
   control-flow blocks don't.

Then verify your claims with the demo (section 4 of `/basics`) and the spec
`src/app/modules/01-basics/basics.spec.ts`.

**Where:** out loud (record yourself) — optionally write the answers in `src/app/sandbox/notes.md`.
