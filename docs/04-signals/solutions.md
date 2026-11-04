# 04 · Signals — Solutions

Exercises: [exercises.md](./exercises.md). All snippets compile with Angular 22 (strict mode).

---

## Solution 1 — Todo store with signals

```ts
import { Component, Injectable, computed, inject, signal } from '@angular/core';

export interface Todo {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly _todos = signal<readonly Todo[]>([]);
  readonly todos = this._todos.asReadonly();
  readonly done = computed(() => this._todos().filter((t) => t.done).length);
  readonly remaining = computed(() => this._todos().length - this.done());

  add(title: string): void {
    const t = title.trim();
    if (t) this._todos.update((list) => [...list, { id: Date.now(), title: t, done: false }]);
  }
  toggle(id: number): void {
    this._todos.update((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }
  clearDone(): void {
    this._todos.update((list) => list.filter((t) => !t.done));
  }
}

@Component({
  selector: 'app-sandbox',
  template: `
    <input #title (keyup.enter)="store.add(title.value); title.value = ''" placeholder="New todo" />
    <ul>
      @for (t of store.todos(); track t.id) {
        <li><label><input type="checkbox" [checked]="t.done" (change)="store.toggle(t.id)" /> {{ t.title }}</label></li>
      }
    </ul>
    <p>{{ store.remaining() }} remaining · {{ store.done() }} done</p>
    <button type="button" (click)="store.clearDone()">Clear done</button>
  `,
})
export class Sandbox {
  protected readonly store = inject(TodoStore);
}
```

**Why:** consumers get a `Signal`, not a `WritableSignal`, so only the store's methods can change state
([docs](https://angular.dev/guide/signals#converting-writable-signals-to-readonly)). Every update creates a new array /
object so `Object.is` detects the change and `computed`s recompute. `remaining` reuses `done` — computeds can depend on
computeds.

---

## Solution 2 — Persist to localStorage

```ts
import { Injectable, computed, effect, signal } from '@angular/core';

interface Todo {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

const KEY = 'sandbox-todos';

function load(): readonly Todo[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Todo[]) : [];
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class PersistentTodoStore {
  private readonly _todos = signal<readonly Todo[]>(load());
  readonly todos = this._todos.asReadonly();
  // Derived state: computed, NEVER an effect.
  readonly remaining = computed(() => this._todos().filter((t) => !t.done).length);

  constructor() {
    // Appropriate effect: syncing signal state to a NON-reactive API (storage).
    // Root service -> "root effect": runs before components are checked, lives as long as the app.
    effect(() => localStorage.setItem(KEY, JSON.stringify(this._todos())));
  }

  add(title: string): void {
    this._todos.update((list) => [...list, { id: Date.now(), title, done: false }]);
  }
}
```

**Why:** "Keeping data in sync with different kinds of storage" is a listed use case of effects; using an effect to
derive `remaining` would be state propagation, which the docs discourage
([docs](https://angular.dev/guide/signals/effect#use-cases-for-effects)). Root vs view effects:
[docs](https://angular.dev/guide/signals/effect#execution-of-effects). (With SSR, guard `localStorage` access with
`isPlatformBrowser`.)

---

## Solution 3 — Pagination with linkedSignal

```ts
import { Component, computed, linkedSignal, signal } from '@angular/core';

const NAMES = ['Ada', 'Alan', 'Barbara', 'Brian', 'Dennis', 'Donald', 'Edsger', 'Grace', 'Guido', 'Ken', 'Linus', 'Margaret'];

@Component({
  selector: 'app-sandbox',
  template: `
    <input [value]="filter()" (input)="onFilter($event)" placeholder="filter" />
    <ul>
      @for (n of pageItems(); track n) { <li>{{ n }}</li> }
    </ul>
    <button type="button" (click)="page.update((p) => p - 1)" [disabled]="page() <= 1">Prev</button>
    {{ page() }} / {{ pageCount() }}
    <button type="button" (click)="page.update((p) => p + 1)" [disabled]="page() >= pageCount()">Next</button>
  `,
})
export class Sandbox {
  private readonly pageSize = 3;
  protected readonly filter = signal('');
  protected readonly filtered = computed(() =>
    NAMES.filter((n) => n.toLowerCase().includes(this.filter().toLowerCase())),
  );
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  // Basic version: reset to page 1 whenever the filter changes.
  // protected readonly page = linkedSignal(() => { this.filter(); return 1; });

  // Bonus: keep the current page if it still exists.
  protected readonly page = linkedSignal<number, number>({
    source: this.pageCount,
    computation: (count, previous) => (previous && previous.value <= count ? previous.value : 1),
  });

  protected readonly pageItems = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  protected onFilter(e: Event): void {
    this.filter.set((e.target as HTMLInputElement).value);
  }
}
```

**Why:** `page` is derived state that the user can override — exactly `linkedSignal`'s job
([docs](https://angular.dev/guide/signals/linked-signal)). The object form gives `previous.value` to decide whether to
keep the page ([docs](https://angular.dev/guide/signals/linked-signal#accounting-for-previous-state)). Note: with the
bonus version, the source is `pageCount`, so the page is kept when the filter changes but the page count doesn't;
pick the source that matches your UX.

---

## Solution 4 — Debounced search

```ts
import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

const ITEMS = ['apple', 'apricot', 'banana', 'blueberry', 'cherry', 'grape', 'kiwi', 'mango'];

@Component({
  selector: 'app-sandbox',
  template: `
    <input [value]="query()" (input)="onInput($event)" />
    @if (isTyping()) { <span>typing…</span> }
    <p>{{ results().join(', ') }}</p>
  `,
})
export class Sandbox {
  protected readonly query = signal('');
  // Field initializers run in the injection context -> toObservable/toSignal OK.
  private readonly debouncedQuery = toSignal(toObservable(this.query).pipe(debounceTime(300)), { initialValue: '' });
  protected readonly results = computed(() => ITEMS.filter((i) => i.includes(this.debouncedQuery())));
  protected readonly isTyping = computed(() => this.query() !== this.debouncedQuery());

  protected onInput(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }
}
```

**Why:** signals have no time operators; `toObservable` → `debounceTime` → `toSignal` borrows them from RxJS
([docs](https://angular.dev/ecosystem/rxjs-interop)). `toSignal` unsubscribes automatically when the component is
destroyed. In a zoneless app the debounced emission updates a signal read by the template, so the view refreshes.

---

## Solution 5 — Custom `model()` control

```ts
import { Component, computed, input, model, numberAttribute, signal } from '@angular/core';

@Component({
  selector: 'app-quantity-picker',
  template: `
    <button type="button" (click)="step(-1)" [disabled]="clamped() <= min()">–</button>
    <strong>{{ clamped() }}</strong>
    <button type="button" (click)="step(1)" [disabled]="clamped() >= max()">+</button>
  `,
})
export class QuantityPicker {
  readonly value = model(1); // no transform allowed on model()
  readonly min = input(1, { transform: numberAttribute });
  readonly max = input(10, { transform: numberAttribute });

  protected readonly clamped = computed(() => Math.min(Math.max(this.value(), this.min()), this.max()));

  protected step(delta: number): void {
    // Start from the clamped value so the parent receives a valid number.
    this.value.set(this.clamped() + delta);
  }
}

@Component({
  selector: 'app-sandbox',
  imports: [QuantityPicker],
  template: `
    <app-quantity-picker [(value)]="qty" [min]="1" [max]="max()" /> qty signal = {{ qty() }}
    <button type="button" (click)="max.set(3)">max = 3</button>
    <app-quantity-picker [(value)]="plainQty" /> plain property = {{ plainQty }}
  `,
})
export class Sandbox {
  protected readonly qty = signal(8);
  protected readonly max = signal(10);
  protected plainQty = 2;
}
```

**Why / trade-off:** clamping in a `computed` keeps the display valid without an effect writing back to `value`
(effects propagating state are discouraged — [docs](https://angular.dev/guide/signals/effect#use-cases-for-effects)).
The trade-off: the parent's `qty` stays `8` until the user interacts (then it receives a clamped value). If the parent
must always hold a valid value, clamp at the source (the parent owns `max`) rather than inside the child. `model()`
supports two-way binding with a signal **or** a plain property
([docs](https://angular.dev/guide/components/inputs#two-way-binding-with-plain-properties)); model inputs don't
support transforms ([docs](https://angular.dev/guide/components/inputs#customizing-model-inputs)).

---

## Solution 6 — Explain out loud

Observed output (Angular 22.2, verified by running the exact component in TestBed):

```
constructor end
ngOnInit end
sum computed
effect sum=3
```

1. `constructor end` — `effect()` only **schedules** the effect; effects run asynchronously during change detection
   ([docs](https://angular.dev/guide/signals/effect)). Nothing computed yet: `sum`/`label` are **lazy**.
2. `ngOnInit end` — three writes, no logs: nobody has read `sum` yet, and effects don't run synchronously
   (**batching**).
3. `sum computed` / `effect sum=3` — at change detection, the view effect runs before the component is checked
   ([docs](https://angular.dev/guide/signals/effect#execution-of-effects)); it reads `label` → `sum` (computed once,
   with the final `a = 3`). The template then reads `label()` from the cache (**memoized**): no second "sum computed".

Later:
- `b.set(30)` → **no log at all**. `useB()` is false, so `b` was never read: not a dependency (**dynamic dependencies**,
  [docs](https://angular.dev/guide/signals#computed-signal-dependencies-are-dynamic)).
- `a.set(4)` → `sum computed` only. `label` recomputes to `"sum=4"`, but its `equal` compares lengths: `"sum=4"` and
  `"sum=3"` have the same length → considered equal → the value is **not** replaced and neither the effect nor the
  template update: the page still shows `sum=3` (**equality**, [docs](https://angular.dev/guide/signals#signal-equality-functions)).
  (`a.set(10)` would produce `"sum=10"`, a different length → `effect sum=10`.)

Lesson: a custom `equal` must mean "semantically identical"; a wrong one silently hides updates.
