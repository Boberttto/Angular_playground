# 01 · Basics — solutions

Every solution below was compiled (AOT, strict template type checking) and rendered in a throw-away
TestBed spec with Angular 22.2.

---

## Solution 1 — User badge

```ts
import { Component, signal } from '@angular/core';

interface User {
  name: string;
  plan: 'free' | 'premium';
  score: number;
}

@Component({
  selector: 'app-user-badge',
  template: `
    <div
      class="badge"
      [class.premium]="user().plan === 'premium'"
      [style.color]="user().score >= 50 ? 'green' : 'red'"
      [style.width.px]="user().score * 2"
      [attr.title]="user().name + ' (' + user().plan + ')'"
      [attr.data-plan]="user().plan === 'premium' ? 'premium' : null"
    >
      {{ user().name }} — {{ user().score }} pts
    </div>
    <button type="button" (click)="togglePlan()">Toggle plan</button>
    <button type="button" (click)="addScore()">+10</button>
  `,
  styles: `.badge { border: 1px solid #ccc; min-width: 120px; } .premium { font-weight: bold; background: gold; }`,
})
export class UserBadge {
  protected readonly user = signal<User>({ name: 'Ada', plan: 'free', score: 30 });

  protected togglePlan(): void {
    this.user.update((u) => ({ ...u, plan: u.plan === 'free' ? 'premium' : 'free' }));
  }

  protected addScore(): void {
    this.user.update((u) => ({ ...u, score: u.score + 10 }));
  }
}
```

**Why:**
- `[class.premium]` toggles one class from a boolean; `[style.width.px]` appends the unit.
- `[attr.data-plan]` bound to `null` **removes** the attribute — that's the documented behaviour of
  attribute bindings.
- `update(u => ({ ...u, … }))` creates a **new object**: a signal compares with `Object.is`, so mutating
  the same object would not notify.

---

## Solution 2 — Keyboard-driven todo list

```ts
import { Component, signal } from '@angular/core';

interface Todo {
  readonly id: number;
  readonly text: string;
}

@Component({
  selector: 'app-key-todos',
  template: `
    <input #draft placeholder="Enter = add, Esc = clear" (keyup.enter)="add(draft)" (keyup.escape)="draft.value = ''" />
    <ul>
      @for (todo of todos(); track todo.id; let i = $index, isLast = $last) {
        <li [class.last]="isLast">
          {{ i + 1 }}/{{ $count }} {{ todo.text }}
          <button type="button" (click)="remove(todo.id)">✕</button>
        </li>
      } @empty {
        <li>Nothing to do 🎉</li>
      }
    </ul>
  `,
  styles: `.last { font-weight: bold; }`,
})
export class KeyTodos {
  protected readonly todos = signal<readonly Todo[]>([]);
  private nextId = 1;

  protected add(input: HTMLInputElement): void {
    const text = input.value.trim();
    if (!text) return;
    this.todos.update((list) => [...list, { id: this.nextId++, text }]);
    input.value = '';
  }

  protected remove(id: number): void {
    this.todos.update((list) => list.filter((t) => t.id !== id));
  }
}
```

**Why:**
- `#draft` references the `HTMLInputElement`, so the handler receives the element itself.
- Assigning `draft.value = ''` is allowed because event handlers are **statements** (assignments are
  only forbidden in bindings).
- `track todo.id` keeps each `<li>` attached to its todo when items are removed; `$count`, `$last`
  come for free; `@empty` replaces the classic `*ngIf="todos.length === 0"`.

---

## Solution 3 — Filterable product table

```ts
import { Component, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly stock: number;
}

type StockStatus = 'out' | 'low' | 'ok';

@Component({
  selector: 'app-product-table',
  imports: [FormsModule, CurrencyPipe],
  template: `
    <input [(ngModel)]="query" placeholder="Search…" />
    @let count = filtered().length;
    <p>{{ count }} result(s)</p>
    <table>
      <tbody>
        @for (p of filtered(); track p.id) {
          <tr>
            <td>{{ p.name }}</td>
            <td>{{ p.price | currency: 'EUR' : 'symbol' : '1.0-0' }}</td>
            <td>
              @switch (stockStatus(p.stock)) {
                @case ('out') { Out of stock }
                @case ('low') { Low }
                @default { In stock }
              }
            </td>
          </tr>
        } @empty {
          <tr><td colspan="3">No product matches “{{ query() }}”</td></tr>
        }
      </tbody>
    </table>
  `,
})
export class ProductTable {
  protected readonly query = signal('');
  private readonly products: readonly Product[] = [
    { id: 1, name: 'Keyboard', price: 79, stock: 12 },
    { id: 2, name: 'Mouse', price: 29, stock: 3 },
    { id: 3, name: 'Monitor', price: 249, stock: 0 },
    { id: 4, name: 'Webcam', price: 59, stock: 7 },
    { id: 5, name: 'Headset', price: 99, stock: 1 },
    { id: 6, name: 'Mouse pad', price: 15, stock: 40 },
  ];

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.products.filter((p) => p.name.toLowerCase().includes(q));
  });

  protected stockStatus(stock: number): StockStatus {
    return stock === 0 ? 'out' : stock < 5 ? 'low' : 'ok';
  }
}
```

**Why:**
- `[(ngModel)]="query"` receives the **signal**; Angular calls `query.set()` on input.
- `filtered` is a `computed()`: it re-runs only when `query` changes and is memoized between renders.
- `@switch` on a small union keeps the template declarative. `stockStatus()` is a cheap method; for
  heavier logic prefer a pure pipe or a `computed()` per row (see module 11).
- `@let count` avoids reading `filtered().length` twice and documents intent.

---

## Solution 4 — Invoice with built-in pipes

```ts
import { Component } from '@angular/core';
import { AsyncPipe, CurrencyPipe, DatePipe, JsonPipe, KeyValuePipe, PercentPipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { interval, map } from 'rxjs';

@Component({
  selector: 'app-invoice',
  imports: [AsyncPipe, CurrencyPipe, DatePipe, JsonPipe, KeyValuePipe, PercentPipe, TitleCasePipe, UpperCasePipe],
  template: `
    <h3>Invoice {{ invoice.number | uppercase }} — {{ invoice.customer | titlecase }}</h3>
    <p>{{ invoice.date | date: 'longDate' }} at {{ invoice.date | date: 'HH:mm' : 'UTC' }} UTC</p>
    <ul>
      @for (line of invoice.lines | keyvalue: null; track line.key) {
        <li>{{ line.key }}: {{ line.value | currency: 'CAD' : 'code' }}</li>
      }
    </ul>
    <p>Tax rate: {{ invoice.taxRate | percent: '1.2-2' }} — Total: {{ invoice.total | currency: 'CAD' : 'code' }}</p>
    <p>Printed at {{ now$ | async | date: 'mediumTime' }}</p>
    <pre>{{ invoice | json }}</pre>
  `,
})
export class Invoice {
  protected readonly invoice = {
    number: 'inv-2026-042',
    customer: 'grace hopper',
    date: new Date(Date.UTC(2026, 10, 4, 15, 30)),
    taxRate: 0.14975,
    total: 1149.75,
    lines: new Map<string, number>([
      ['Consulting', 900],
      ['Hosting', 100],
    ]),
  };
  protected readonly now$ = interval(1000).pipe(map(() => new Date()));
}
```

**Why:**
- `date: 'HH:mm' : 'UTC'` — the 2nd parameter of `DatePipe` is the timezone.
- `keyvalue: null` keeps the Map's insertion order (default is sorted by key).
- `async | date` chains left to right: first unwrap the Observable, then format the `Date`.
  `async` returns `null` before the first emission, which `DatePipe` renders as an empty string.
- `percent: '1.2-2'` → `14.98%` (min 1 integer digit, exactly 2 fraction digits).

---

## Solution 5 — Debugging challenge

Fixed component:

```ts
import { Component, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-buggy',
  imports: [FormsModule, UpperCasePipe],
  template: `
    <input [(ngModel)]="name" />
    <p>Rounded score: {{ roundedScore() }}</p>
    <p [class]="classes()">{{ (isAdmin() ? 'admin' : 'user') | uppercase }}</p>
    <button (click)="toggle()">toggle</button>
    <ul>
      @for (item of items(); track item.id) { <li>{{ item.label }}</li> }
    </ul>
    @if (!user()?.email) { <p>No email</p> }
  `,
})
export class Buggy {
  name = signal('Ada');
  score = signal(7.6);
  isAdmin = signal(true);
  classes = signal({ active: false });
  items = signal([{ id: 1, label: 'A' }]);
  user = signal<{ email?: string } | null>(null);

  roundedScore(): number {
    return Math.round(this.score());
  }

  toggle(): void {
    this.classes.update((c) => ({ active: !c.active }));
  }
}
```

| # | Bug | Kind | Fix / explanation |
| --- | --- | --- | --- |
| 1 | `[(ngModel)]="name()"` | compile | Two-way binding needs a **writable target**: pass the signal `name`, not its value. |
| 2 | `Math.round(...)` in the template | compile | Templates have no JS globals (only `undefined`, `$any`). Use a method, `computed()` or the `number` pipe. |
| 3 | `@for` without `track` | compile | `track` is mandatory → `track item.id`. |
| 4 | `isAdmin() ? 'admin' : 'user' \| uppercase` | behaviour | The pipe binds tighter than `?:`, so `admin` was never upper-cased. Add parentheses. |
| 5 | `this.classes.active = !…` mutation | behaviour | `[class]` with an object compares by reference (`===`): mutation is ignored (and with OnPush a plain field is not reactive anyway). Use a signal holding a **new** object. |
| 6 | `user()?.email === null` | behaviour | Since Angular 22, `?.` returns `undefined` (not `null`) like JavaScript, and a missing `email` is `undefined` too, so the check was always false. Test falsiness (`!user()?.email`) or use `== null`. |

---

## Solution 6 — Explain out loud (model answer)

1. **Reverse with `track item.id`:** Angular matches old and new items by id and **moves** the existing
   DOM nodes; no row is created or destroyed, component state inside rows (focus, typed text, child
   component state) follows the item.
   **With `track $index`:** row *n* stays row *n*; Angular only updates the bindings of each row with
   the new item → cheap text updates, but any DOM/component state stays at its position (wrong item).
   **`*ngFor` without `trackBy` + re-fetched data:** default tracking is by object identity; new objects
   ⇒ every row is destroyed and re-created (expensive, loses focus/state).
2. `track` is required because forgetting `trackBy` was a very common performance bug; making it
   mandatory forces a conscious identity choice (the compiler error is
   `@for loop must have a "track" expression`).
3. `*ngIf`/`*ngFor` are directives that must sit on an element (desugared to `<ng-template>`), and only
   one structural directive per element is allowed — hence `<ng-container>` wrappers and
   `<ng-template #else>` references. Control-flow blocks are part of the template syntax: they render no
   element, nest freely, and `@else`/`@empty` are built in.

References: [control flow](https://angular.dev/guide/templates/control-flow),
[structural directives](https://angular.dev/guide/directives/structural-directives),
[expression syntax](https://angular.dev/guide/templates/expression-syntax).
