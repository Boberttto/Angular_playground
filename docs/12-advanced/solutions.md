# 12 · Advanced — Solutions

Every solution below was compiled with Angular 22.2 and every spec passed with
`npx ng test --watch=false` (files were temporarily placed in `src/app/modules/12-advanced/_sol/`).

---

## Solution 1 — A deferred comments section

```ts
// comments.ts
import { Component } from '@angular/core';

@Component({ selector: 'app-comments-list', template: `<ul><li>First!</li><li>Nice article</li></ul>` })
export class CommentsList {}

@Component({
  selector: 'app-article',
  imports: [CommentsList],
  template: `
    <article>…long article…</article>
    @defer (on viewport; prefetch on idle) {
      <app-comments-list />
    } @placeholder {
      <div class="comments-box">Comments</div>
    } @loading (after 150ms; minimum 500ms) {
      <div class="comments-box skeleton"></div>
    } @error {
      <p>Could not load comments.</p>
    }`,
  styles: `.comments-box { min-height: 200px; }`,
})
export class Article {}
```

**Why:** `on viewport` renders when the placeholder scrolls into view; `prefetch on idle` downloads the
chunk earlier so rendering is instant. A fixed `min-height` on placeholder/skeleton avoids layout shift
(CLS). `CommentsList` is only referenced inside `@defer`, so it is split into its own chunk.

---

## Solution 2 — Test a pipe and a signal service

```ts
// initials.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase())
      .join('');
  }
}
```

```ts
// cart-store.ts
import { computed, Injectable, signal } from '@angular/core';

export interface Item { readonly name: string; readonly price: number; }

@Injectable({ providedIn: 'root' })
export class CartStore {
  readonly items = signal<readonly Item[]>([]);
  readonly total = computed(() => this.items().reduce((sum, i) => sum + i.price, 0));

  add(item: Item): void {
    this.items.update((items) => [...items, item]);
  }
}
```

```ts
// initials-and-cart.spec.ts
import { effect } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CartStore } from './cart-store';
import { InitialsPipe } from './initials.pipe';

describe('InitialsPipe', () => {
  const pipe = new InitialsPipe();
  it('takes the first letter of each word', () => expect(pipe.transform('Ada Lovelace')).toBe('AL'));
  it('handles extra spaces', () => expect(pipe.transform('  grace   hopper ')).toBe('GH'));
  it('returns an empty string for an empty name', () => expect(pipe.transform('')).toBe(''));
});

describe('CartStore', () => {
  it('computes the total', () => {
    const store = TestBed.inject(CartStore);
    store.add({ name: 'book', price: 10 });
    store.add({ name: 'pen', price: 2 });
    expect(store.total()).toBe(12);
  });

  it('notifies effects after TestBed.tick()', () => {
    const store = TestBed.inject(CartStore);
    const totals: number[] = [];
    TestBed.runInInjectionContext(() => effect(() => totals.push(store.total())));
    TestBed.tick();
    store.add({ name: 'book', price: 10 });
    TestBed.tick();
    expect(totals).toEqual([0, 10]);
  });
});
```

**Why:** a pure pipe is a plain class. `computed()` is read synchronously; effects are **scheduled**, so
`TestBed.tick()` flushes them (`flushEffects()` is deprecated). TestBed is reset between tests, so each
`TestBed.inject(CartStore)` returns a fresh root instance.

---

## Solution 3 — Toast service with dynamic components

```ts
// toast.ts
import { Component, ComponentRef, inject, Injectable, input, inputBinding, output, outputBinding, signal, viewChild, ViewContainerRef, effect } from '@angular/core';

export type ToastKind = 'info' | 'error';

@Component({
  selector: 'app-toast',
  template: `<div class="toast" [class]="kind()" (click)="dismissed.emit()">{{ message() }}</div>`,
})
export class Toast {
  readonly message = input.required<string>();
  readonly kind = input<ToastKind>('info');
  readonly dismissed = output<void>();
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly container = signal<ViewContainerRef | null>(null);

  register(vcr: ViewContainerRef): void {
    this.container.set(vcr);
  }

  show(message: string, kind: ToastKind = 'info', durationMs = 3000): ComponentRef<Toast> | null {
    const vcr = this.container();
    if (!vcr) return null;
    const ref: ComponentRef<Toast> = vcr.createComponent(Toast, {
      bindings: [
        inputBinding('message', () => message),
        inputBinding('kind', () => kind),
        outputBinding('dismissed', () => ref.destroy()),
      ],
    });
    const timer = setTimeout(() => ref.destroy(), durationMs);
    ref.onDestroy(() => clearTimeout(timer));
    return ref;
  }
}

@Component({ selector: 'app-toast-host', template: `<ng-container #outlet />` })
export class ToastHost {
  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });
  private readonly toasts = inject(ToastService);

  constructor() {
    // viewChild is resolved after the first render: register in an effect.
    effect(() => this.toasts.register(this.outlet()));
  }
}
```

```ts
// toast.spec.ts
import { TestBed } from '@angular/core/testing';
import { ToastHost, ToastService } from './toast';

describe('ToastService', () => {
  it('renders toasts and removes one on click', async () => {
    const fixture = TestBed.createComponent(ToastHost);
    await fixture.whenStable(); // effect registered the container
    const service = TestBed.inject(ToastService);
    service.show('Saved');
    service.show('Oops', 'error');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-toast').length).toBe(2);

    el.querySelector<HTMLElement>('.toast')?.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('app-toast').length).toBe(1);
    expect(el.textContent).toContain('Oops');
  });
});
```

**Why:** `bindings` declare inputs/outputs at creation like a template would. `outputBinding` gives a
clean way to destroy the toast from inside; `ref.onDestroy` clears the timer so no callback runs on a
destroyed component. The host registers its `ViewContainerRef` in an `effect` because a `viewChild` is
only available after the view is created.

---

## Solution 4 — Data table with a projected row template

```ts
// data-table.ts
import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, input, TemplateRef } from '@angular/core';

export interface RowContext<T> { $implicit: T; index: number; }

/**
 * Header: projected ONCE -> <ng-content> is enough.
 * Rows: must be stamped N times with different data -> needs a TemplateRef + context.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet],
  template: `
    <div class="header"><ng-content select="[table-header]" /></div>
    @for (row of rows(); track $index) {
      <ng-container [ngTemplateOutlet]="rowTemplate() ?? null" [ngTemplateOutletContext]="{ $implicit: row, index: $index }" />
    } @empty {
      <ng-content select="[table-empty]">No data</ng-content>
    }`,
})
export class DataTable<T> {
  readonly rows = input.required<readonly T[]>();
  protected readonly rowTemplate = contentChild<TemplateRef<RowContext<T>>>('row');
}

@Component({
  selector: 'app-table-usage',
  imports: [DataTable],
  template: `
    <app-data-table [rows]="people">
      <strong table-header>Name</strong>
      <ng-template #row let-person let-i="index"><div>{{ i + 1 }}. {{ person.name }}</div></ng-template>
    </app-data-table>
    <app-data-table [rows]="[]"><strong table-header>Empty table</strong></app-data-table>`,
})
export class TableUsage {
  protected readonly people = [{ name: 'Ada' }, { name: 'Grace' }];
}
```

```ts
// data-table.spec.ts
import { TestBed } from '@angular/core/testing';
import { TableUsage } from './data-table';

describe('DataTable', () => {
  it('renders rows with the parent template and the empty fallback', async () => {
    const fixture = TestBed.createComponent(TableUsage);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1. Ada');
    expect(text).toContain('2. Grace');
    expect(text).toContain('No data');
  });
});
```

**Why:** `<ng-content>` projects content **once** (created by the parent). Rows need to be stamped N
times with different data, so the parent passes a **template** and the table renders it with
`ngTemplateOutlet` + a context. The `[table-empty]` slot uses `<ng-content>` fallback content.

---

## Solution 5 — Mocked service + @defer

```ts
// user-card.ts
import { Component, inject, Injectable, input, resource } from '@angular/core';

export interface User { readonly id: number; readonly name: string; readonly email: string; }

@Injectable({ providedIn: 'root' })
export class UserApi {
  async load(id: number): Promise<User> {
    const res = await fetch(`/api/users/${id}`);
    return (await res.json()) as User;
  }
}

@Component({
  selector: 'app-user-card',
  template: `
    @if (user.value(); as u) {
      <h3>{{ u.name }}</h3>
      @defer (on interaction) {
        <p class="details">Email: {{ u.email }}</p>
      } @placeholder {
        <button type="button">Show details</button>
      }
    } @else if (user.isLoading()) {
      <p>Loading…</p>
    }`,
})
export class UserCard {
  private readonly api = inject(UserApi);
  readonly id = input.required<number>();
  protected readonly user = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.load(params),
  });
}
```

```ts
// user-card.spec.ts
import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { UserApi, UserCard } from './user-card';

describe('UserCard', () => {
  const load = vi.fn(async (id: number) => ({ id, name: 'Ada', email: 'ada@example.com' }));

  beforeEach(() => {
    load.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: UserApi, useValue: { load } }],
      deferBlockBehavior: DeferBlockBehavior.Manual,
    });
  });

  it('loads the user through the mocked API', async () => {
    const fixture = TestBed.createComponent(UserCard);
    fixture.componentRef.setInput('id', 1);
    await fixture.whenStable(); // waits for the resource (pending task) and the render
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ada');
    expect(load).toHaveBeenCalledWith(1);
  });

  it('shows details only when the defer block completes', async () => {
    const fixture = TestBed.createComponent(UserCard);
    fixture.componentRef.setInput('id', 1);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Show details');

    const [details] = await fixture.getDeferBlocks();
    await details.render(DeferBlockState.Complete);
    expect(el.querySelector('.details')?.textContent).toContain('ada@example.com');
  });
});
```

**Why `whenStable()` waits for the resource:** `resource()` registers its loading as a pending task, and
`whenStable()` resolves when the app has no pending work — so the test doesn't need timers
([PendingTasks](https://angular.dev/api/core/PendingTasks)). With `DeferBlockBehavior.Manual` the defer
block stays on its placeholder until the test renders `Complete`.

---

## Solution 6 — Interview answers

1. **`bypassSecurityTrustHtml(userBio)`** disables sanitization: any `<img onerror>` or `javascript:` link
   in the bio executes → stored XSS. Keep `[innerHTML]` sanitized; if interactivity is needed, render
   structured data (e.g. Markdown parsed into safe nodes) and bind events with Angular templates.
   ([docs](https://angular.dev/best-practices/security))
2. **`window` in the constructor** throws on the server (`window` is not defined). Move it to
   `afterNextRender` (browser-only), and avoid rendering different markup per platform to prevent hydration
   mismatches. ([docs](https://angular.dev/guide/ssr#authoring-server-compatible-components))
3. **`fakeAsync` with Vitest:** `fakeAsync` needs Zone.js, which the Vitest runner doesn't use (stated
   in the v22 `@angular/core/testing` typings). Rewrite with `vi.useFakeTimers()` +
   `vi.advanceTimersByTime(1000)` (then `vi.useRealTimers()`), or with real `await` + `fixture.whenStable()`.
4. **LCP hero image:** `NgOptimizedImage` with `priority` (sets `fetchpriority=high` and eager loading) plus
   explicit `width`/`height`; and render it on the server (SSR/SSG) — never inside a `@defer` placeholder.
   ([image docs](https://angular.dev/guide/image-optimization))
