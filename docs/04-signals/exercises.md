# 04 · Signals — Exercises

Work in [`src/app/sandbox/`](../../src/app/sandbox/). Solutions: [solutions.md](./solutions.md).
Theory: [theory.md](./theory.md).

---

## Exercise 1 ⭐ — Todo store with signals

**Goal:** a `TodoStore` service exposing read-only state and derived counters.

**Requirements**
- [ ] Private `WritableSignal<readonly Todo[]>`, public read-only `todos` via `asReadonly()`.
- [ ] `remaining` and `done` as `computed`.
- [ ] Methods `add(title)`, `toggle(id)`, `clearDone()` — all **immutable** updates.
- [ ] A sandbox component lists todos with checkboxes and shows "x remaining".

<details><summary>Hints</summary>

- `update(list => list.map(t => t.id === id ? { ...t, done: !t.done } : t))`.
- `@Injectable({ providedIn: 'root' })` (or `@Service()` in v22).
</details>

---

## Exercise 2 ⭐ — Persist to localStorage (an appropriate effect)

**Goal:** persist the `TodoStore` state and restore it on startup.

**Requirements**
- [ ] Initial value read from `localStorage` (guard against invalid JSON).
- [ ] An `effect` writes the list to `localStorage` whenever it changes.
- [ ] Explain in a comment why an effect is appropriate here (and not for computing `remaining`).

<details><summary>Hints</summary>

- Syncing to storage is one of the documented use cases of effects.
- Root service → this is a "root effect".
</details>

---

## Exercise 3 ⭐⭐ — Pagination that resets: linkedSignal

**Goal:** a filterable list with pagination where the page goes back to 1 whenever the filter changes, but the user
can still change the page.

**Requirements**
- [ ] `filter = signal('')`, `pageSize = 3`, a local array of ~12 names.
- [ ] `filtered` and `pageCount` as `computed`.
- [ ] `page` as a `linkedSignal` that resets to 1 when `filter` changes; Prev/Next buttons call `page.update`.
- [ ] Bonus: instead of resetting to 1, keep the current page if it is still ≤ `pageCount`.

<details><summary>Hints</summary>

- Shorthand: `linkedSignal(() => { this.filter(); return 1; })`.
- Bonus: object form with `previous?.value`.
</details>

---

## Exercise 4 ⭐⭐ — Debounced search with toSignal / toObservable

**Goal:** a search box over a local list, filtering 300 ms after the last keystroke, showing "typing…" meanwhile.

**Requirements**
- [ ] `query = signal('')` bound to an input.
- [ ] `debouncedQuery = toSignal(toObservable(query).pipe(debounceTime(300)), { initialValue: '' })`.
- [ ] `results = computed(...)` from `debouncedQuery`.
- [ ] `isTyping = computed(() => query() !== debouncedQuery())`.

<details><summary>Hints</summary>

- `toSignal` and `toObservable` need an injection context: field initializers are fine.
</details>

---

## Exercise 5 ⭐⭐⭐ — A custom `model()` form control

**Goal:** a `QuantityPicker` component usable as `<app-quantity-picker [(value)]="qty" [min]="1" [max]="10" />`.

**Requirements**
- [ ] `value = model(1)`, `min`/`max` signal inputs with `numberAttribute` transform.
- [ ] – / + buttons disabled at bounds (via `computed`).
- [ ] When `max` drops below the current value, the displayed value is clamped **without** an effect writing to `value`.
      Explain the trade-off.
- [ ] Works with a parent `signal` and with a parent plain property.

<details><summary>Hints</summary>

- `clamped = computed(() => Math.min(Math.max(this.value(), this.min()), this.max()))`.
- Model inputs don't support transforms.
</details>

---

## Exercise 6 ⭐⭐⭐ — Interview: explain out loud

Predict the console output, then explain each line using the words *lazy*, *memoized*, *asynchronous*, *batching*,
*dynamic dependencies*, *equality*:

```ts
@Component({ selector: 'app-quiz', template: `{{ label() }}` })
export class Quiz {
  a = signal(1);
  b = signal(10);
  useB = signal(false);
  sum = computed(() => {
    console.log('sum computed');
    return this.useB() ? this.a() + this.b() : this.a();
  });
  label = computed(() => `sum=${this.sum()}`, { equal: (x, y) => x.length === y.length });

  constructor() {
    effect(() => console.log('effect', this.label()));
    console.log('constructor end');
  }

  ngOnInit() {
    this.b.set(20);
    this.a.set(2);
    this.a.set(3);
    console.log('ngOnInit end');
  }
}
```

Then: what happens (which logs) if a button later calls `this.b.set(30)`? And `this.a.set(4)`?

<details><summary>Hints</summary>

- Nothing is computed before someone reads it.
- `useB()` is false: is `b` a dependency?
- `label`'s equality compares string **lengths**.
</details>
