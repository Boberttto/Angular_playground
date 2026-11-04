# 10 · Change detection — Solutions

Exercises: [exercises.md](./exercises.md). All snippets compile with Angular 22 (strict mode).

---

## Solution 1 — "It worked with zone.js"

```ts
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';

// Fix A (preferred): a signal read in the template is a CD notification.
@Component({ selector: 'app-loader-a', template: `<p>{{ status() }}</p>` })
export class LoaderA {
  protected readonly status = signal('Loading…');
  constructor() {
    setTimeout(() => this.status.set('Loaded'), 1000);
  }
}

// Fix B: plain field + markForCheck() (marks the view dirty AND schedules CD in zoneless).
@Component({ selector: 'app-loader-b', template: `<p>{{ status }}</p>` })
export class LoaderB {
  protected status = 'Loading…';
  private readonly cdr = inject(ChangeDetectorRef);
  constructor() {
    setTimeout(() => {
      this.status = 'Loaded';
      this.cdr.markForCheck();
    }, 1000);
  }
}
```

**Why:** with zone.js, the patched `setTimeout` told `NgZone` a task finished, which triggered `ApplicationRef.tick()`
(and the component was "Default"/Eager, so it was always checked). Zoneless Angular only reacts to the notifications
listed in the docs: signal read in a template, `markForCheck`, `setInput`, template/host listeners, attaching a dirty view
([docs](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility)).

---

## Solution 2 — The list that does not grow

```ts
import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-todo-list',
  template: `<ul>@for (i of items(); track $index) { <li>{{ i }}</li> }</ul>`,
})
export class TodoList {
  readonly items = input.required<readonly string[]>();
}

@Component({
  selector: 'app-sandbox',
  imports: [TodoList],
  template: `
    <button type="button" (click)="add()">Add</button>
    <app-todo-list [items]="items()" />
  `,
})
export class Sandbox {
  protected readonly items = signal<readonly string[]>(['a']);

  protected add(): void {
    // ❌ this.items().push('x') — same reference: the OnPush child is not refreshed
    this.items.update((list) => [...list, `item ${list.length + 1}`]); // ✅ new reference
  }
}
```

**Why:** an OnPush child is refreshed for new inputs only if the reference changed (`Object.is`)
([docs](https://angular.dev/best-practices/skipping-subtrees#edge-cases)). Making the child `Eager` re-evaluates its
template every time its parent is checked, so the mutation shows — but it hides the bug, costs a check on every pass,
and breaks as soon as another OnPush component sits between them. Immutable updates (or signals) are the fix.

---

## Solution 3 — Throttle a noisy widget with detach()

```ts
import { ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';

@Component({
  selector: 'app-price-ticker',
  template: `
    <p>Price: {{ price().toFixed(2) }} ({{ live() ? 'live' : 'throttled' }})</p>
    <button type="button" (click)="toggle()">Switch to {{ live() ? 'throttled' : 'live' }}</button>
  `,
})
export class PriceTicker {
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly price = signal(100);
  protected readonly live = signal(false);

  constructor() {
    this.cdr.detach(); // not checked anymore, even when `price` changes
    const feed = setInterval(() => this.price.update((p) => p + (Math.random() - 0.5)), 20);
    const throttle = setInterval(() => {
      if (!this.live()) this.cdr.detectChanges(); // manual, local check at most every 500ms
    }, 500);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(feed);
      clearInterval(throttle);
    });
  }

  protected toggle(): void {
    this.live.update((v) => !v);
    if (this.live()) {
      this.cdr.reattach();
    } else {
      this.cdr.detach();
    }
    this.cdr.detectChanges(); // show the new label immediately
  }
}
```

**Why:** "Detached views are not checked during change detection runs until they are re-attached, even if they are
marked as dirty"; `detectChanges()` checks the view and its children on demand
([API](https://angular.dev/api/core/ChangeDetectorRef)). Add `injectRenderCounter()` from
[`render-counter.ts`](../../src/app/modules/10-change-detection/render-counter.ts) to see ~2 renders/s in throttled mode.

---

## Solution 4 — A non-Angular callback

```ts
import { Component, DestroyRef, inject, signal } from '@angular/core';

class FakeMapLib {
  private id: ReturnType<typeof setInterval> | undefined;
  onMove(cb: (lat: number) => void): void {
    this.id = setInterval(() => cb(45 + Math.random()), 50);
  }
  destroy(): void {
    clearInterval(this.id);
  }
}

@Component({ selector: 'app-map-view', template: `<p>lat (plain): {{ latPlain }} · lat (signal): {{ lat() }}</p>` })
export class MapView {
  protected latPlain = 0; // V1: updated silently, never rendered on its own
  protected readonly lat = signal(0); // V2: notification -> rendered

  constructor() {
    const lib = new FakeMapLib();
    lib.onMove((value) => {
      this.latPlain = value;
      this.lat.set(Number(value.toFixed(4)));
    });
    inject(DestroyRef).onDestroy(() => lib.destroy());
  }
}
```

(Note: when the signal triggers a refresh, the plain field is rendered too, because the whole view is re-evaluated —
remove the signal binding to see V1 alone.)

**Bonus (zone-based app):** wrap the library setup in `ngZone.runOutsideAngular(() => lib.onMove(...))` so its 20
callbacks/s don't trigger CD; store the latest value in a plain field and, from a 1 s interval, call
`ngZone.run(() => this.lat.set(latest))` (or `markForCheck()`) to re-enter the zone once per second
([docs](https://angular.dev/best-practices/zone-pollution)). In zoneless, the signal already notifies only when written,
so you'd throttle the writes themselves (e.g. RxJS `throttleTime` + `toSignal`).

---

## Solution 5 — Predict the render counts

```ts
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { injectRenderCounter } from '../modules/10-change-detection/render-counter';

const a1Sig = signal(0);

@Component({
  selector: 'app-b1',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<span class="render-count"></span>{{ r.mark() }} B1 <button type="button" (click)="0">click B1</button>`,
})
export class B1 {
  protected readonly r = injectRenderCounter();
}

@Component({ selector: 'app-b', imports: [B1], template: `<span class="render-count"></span>{{ r.mark() }} B {{ label() }} <app-b1 />` })
export class B {
  readonly label = input('');
  protected readonly r = injectRenderCounter();
}

@Component({ selector: 'app-a1', template: `<span class="render-count"></span>{{ r.mark() }} A1 {{ sig() }}` })
export class A1 {
  protected readonly sig = a1Sig;
  protected readonly r = injectRenderCounter();
}

@Component({
  selector: 'app-a',
  imports: [A1],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<span class="render-count"></span>{{ r.mark() }} A <app-a1 />`,
})
export class A {
  protected readonly r = injectRenderCounter();
}

@Component({
  selector: 'app-sandbox',
  imports: [A, B],
  template: `
    <span class="render-count"></span>{{ r.mark() }} Root {{ rootSig() }}
    <button type="button" (click)="0">noop</button>
    <button type="button" (click)="later()">a1Sig in setTimeout</button>
    <button type="button" (click)="label.set(label() + '!')">change B label</button>
    <app-a /> <app-b [label]="label()" />
  `,
})
export class Sandbox {
  protected readonly r = injectRenderCounter();
  protected readonly rootSig = signal(0);
  protected readonly label = signal('b');
  protected later(): void {
    setTimeout(() => a1Sig.update((n) => n + 1), 0);
  }
}
```

| Action | Re-rendered | Rule |
| --- | --- | --- |
| 1. "noop" click in Root | Root, A (Eager) — not A1, B, B1 | event marks Root; Eager children are checked with their parent; OnPush children without new inputs are skipped (and so is B1 below B) ([docs](https://angular.dev/best-practices/skipping-subtrees#an-event-is-handled-by-a-component-with-onpush)) |
| 2. `a1Sig` set in `setTimeout` | Root (the click itself, first), then **A1 only** | the timer write is a signal notification marking only the consumer A1 |
| 3. new `label` for B | Root (click), A (Eager), B (new input), B1 (Eager child of a checked B) | new input reference refreshes OnPush B ([docs](https://angular.dev/best-practices/skipping-subtrees#new-inputs-to-component-with-onpush)) |
| 4. click inside B1 | B1, B, Root (ancestors marked), A (Eager, checked with Root) | an event marks the component and its ancestors ([docs](https://angular.dev/best-practices/skipping-subtrees#an-event-is-handled-by-a-descendant-of-a-component-with-onpush)) |

> ⚠️ Not confirmed by official docs / opinion: row 2's "A1 only" (ancestors not re-rendered for a signal-only change)
> is observed behaviour (see the module's spec), not a documented guarantee.

---

## Solution 6 — The spinner that throws NG0100

**Out loud:**
1. CD checks `Shell` (Eager): it evaluates `loading.loading` → `true`, creates the "Loading…" block.
2. Still in the same pass, `Shell`'s child `Dashboard` is checked; then `Dashboard.ngAfterViewInit` runs and sets
   `loading = false` — a value `Shell` **already rendered**.
3. Plain field ⇒ no notification. In dev mode, Angular re-checks the bindings after the pass, finds `true` → `false`,
   and throws NG0100 ([docs](https://angular.dev/errors/NG0100)).
4. Production skips that verification pass: no error, but the screen keeps "Loading…" until something else refreshes
   `Shell` — the bug is real, only the alarm is dev-only.

**Fix (preferred): make the state a signal**

```ts
import { Component, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _loading = signal(true);
  readonly loading = this._loading.asReadonly();
  done(): void {
    this._loading.set(false);
  }
}

@Component({ selector: 'app-dashboard', template: `<p>Dashboard</p>` })
export class Dashboard {
  private readonly loadingService = inject(LoadingService);
  ngAfterViewInit(): void {
    this.loadingService.done(); // signal write: Angular knows Shell must be refreshed again
  }
}

@Component({
  selector: 'app-shell',
  imports: [Dashboard],
  template: `@if (loadingService.loading()) { <p>Loading…</p> } <app-dashboard />`,
})
export class Shell {
  protected readonly loadingService = inject(LoadingService);
}
```

The module's spec proves both halves: plain field → NG0100; signal → no error and the parent shows the new value
([`change-detection.spec.ts`](../../src/app/modules/10-change-detection/change-detection.spec.ts)).

**Better still (real app):** question the data flow. "Loading" should be derived from the actual async state — e.g.
`resource()`/`httpResource()`'s `isLoading()` or a `computed` in the service — instead of a child flipping a global flag
from a lifecycle hook. `setTimeout`/`queueMicrotask` would hide the error but keep the two-render flicker and the
hidden coupling.
