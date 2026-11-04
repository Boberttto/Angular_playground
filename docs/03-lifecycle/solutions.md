# 03 · Lifecycle hooks — Solutions

Exercises: [exercises.md](./exercises.md). All snippets compile with Angular 22 (strict mode).

---

## Solution 1 — A clock that cleans up after itself

```ts
import { Component, DestroyRef, inject, signal } from '@angular/core';

@Component({
  selector: 'app-clock',
  template: `<p class="clock">{{ now() }}</p>`,
})
export class Clock {
  // A signal: in a zoneless app, setInterval alone would NOT refresh the view.
  protected readonly now = signal(new Date().toLocaleTimeString());

  constructor() {
    const id = setInterval(() => {
      console.log('tick');
      this.now.set(new Date().toLocaleTimeString());
    }, 1000);
    // Cleanup registered right next to the setup.
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}

@Component({
  selector: 'app-sandbox',
  imports: [Clock],
  template: `
    <button type="button" (click)="show.set(!show())">Toggle clock</button>
    @if (show()) { <app-clock /> }
  `,
})
export class Sandbox {
  protected readonly show = signal(true);
}
```

**Why:** the constructor is an injection context, so `inject(DestroyRef)` works there; the callback runs when `@if`
destroys the component, and "tick" stops in the console. Writing a signal read by the template is one of the
notifications that schedules change detection in zoneless mode
([docs](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility)). Starting the timer in the
constructor rather than `ngOnInit` is fine because it does not depend on inputs.

---

## Solution 2 — Migrate ngOnChanges to signals

```ts
import { Component, computed, effect, input, linkedSignal } from '@angular/core';

@Component({ selector: 'app-greeting', template: `<p>{{ message() }}</p>` })
export class Greeting {
  readonly firstName = input.required<string>();
  readonly lastName = input('');

  // Derived state: lazy + memoized, no hook needed.
  protected readonly message = computed(() => `Hello ${this.firstName()} ${this.lastName()}`.trim());

  // Previous value tracking with linkedSignal's `previous` argument.
  private readonly firstNameChange = linkedSignal<string, { from?: string; to: string }>({
    source: this.firstName,
    computation: (to, previous) => ({ from: previous?.source, to }),
  });

  constructor() {
    // Side effect only (console) -> effect is appropriate.
    effect(() => {
      const { from, to } = this.firstNameChange();
      if (from !== undefined) console.log(`firstName changed from ${from} to ${to}`);
    });
  }
}
```

**Why:** `computed` replaces the "recompute a field in ngOnChanges" pattern
([docs](https://angular.dev/guide/signals#computed-signals)). `linkedSignal`'s `computation(source, previous)` gives
the previous **source** value (`previous.source`) ([docs](https://angular.dev/guide/signals/linked-signal#accounting-for-previous-state)).
`effect` is reserved for side effects ([docs](https://angular.dev/guide/signals/effect#use-cases-for-effects)).
Reading the required input in the constructor would throw NG0950; reading it inside `computed`/`effect` is fine
because they run later ([docs](https://angular.dev/errors/NG0950)).

---

## Solution 3 — SSR-safe autofocus directive

```ts
import { Directive, ElementRef, afterNextRender, booleanAttribute, inject, input } from '@angular/core';

@Directive({ selector: '[appAutofocus]' })
export class Autofocus {
  // `<input appAutofocus>` passes '' -> booleanAttribute('') === true
  readonly appAutofocus = input(true, { transform: booleanAttribute });

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    // Never runs on the server; `write` phase because focusing mutates the DOM state.
    afterNextRender({
      write: () => {
        if (this.appAutofocus()) el.focus();
      },
    });
  }
}
```

**Why:** render callbacks don't run during SSR/prerendering, so no `focus()` on a server DOM
([docs](https://angular.dev/guide/components/lifecycle#aftereveryrender-and-afternextrender)). Reading the input inside
the callback is safe: by then inputs are set. `ngAfterViewInit` would also be called on the server and the DOM is
not guaranteed to be rendered there ([docs](https://angular.dev/guide/components/dom-apis)).

---

## Solution 4 — Lifecycle tracer

```ts
import { Component, DestroyRef, afterNextRender, inject, input } from '@angular/core';

@Component({
  selector: 'app-tracer',
  template: `<div class="tracer">{{ name() }} <ng-content /></div>`,
})
export class Tracer {
  readonly name = input('?');

  constructor() {
    console.log('[?] constructor (inputs not set yet)');
    inject(DestroyRef).onDestroy(() => this.log('DestroyRef'));
    afterNextRender(() => this.log('afterNextRender'));
  }

  private log(hook: string): void {
    console.log(`[${this.name()}] ${hook}`);
  }
  ngOnChanges(): void { this.log('ngOnChanges'); }
  ngOnInit(): void { this.log('ngOnInit'); }
  ngDoCheck(): void { this.log('ngDoCheck'); }
  ngAfterContentInit(): void { this.log('ngAfterContentInit'); }
  ngAfterContentChecked(): void { this.log('ngAfterContentChecked'); }
  ngAfterViewInit(): void { this.log('ngAfterViewInit'); }
  ngAfterViewChecked(): void { this.log('ngAfterViewChecked'); }
  ngOnDestroy(): void { this.log('ngOnDestroy'); }
}

@Component({
  selector: 'app-tracer-host',
  imports: [Tracer],
  template: `<app-tracer name="view-child" />`,
})
export class TracerHost {
  ngOnInit(): void { console.log('[host] ngOnInit'); }
  ngAfterContentInit(): void { console.log('[host] ngAfterContentInit'); }
  ngAfterViewInit(): void { console.log('[host] ngAfterViewInit'); }
}

@Component({
  selector: 'app-sandbox',
  imports: [Tracer, TracerHost],
  template: `
    <app-tracer name="outer"><app-tracer name="inner" /></app-tracer>
    <app-tracer-host />
    <button type="button" (click)="noop()">Change nothing</button>
  `,
})
export class Sandbox {
  protected noop(): void {}
}
```

Observed sequence (Angular 22.2, Init hooks only):

```
[outer] ngOnInit
[inner] ngOnInit
[host] ngOnInit
[inner] ngAfterContentInit
[outer] ngAfterContentInit
[host] ngAfterContentInit
[view-child] ngOnInit
[view-child] ngAfterContentInit
[view-child] ngAfterViewInit
[inner] ngAfterViewInit
[outer] ngAfterViewInit
[host] ngAfterViewInit
```

**`outer` / `inner`:** both tags are written in the **sandbox's** template: projection does not change which view a
component belongs to, so `inner` is initialized by the sandbox's check, in template order (`outer` then `inner`) — not
"inside" `outer`. Note `inner.ngAfterContentInit` comes **before** `outer.ngAfterContentInit`: `inner` is nested in
`outer`'s content, so its content is complete first.

**`host` / `view-child`:** `view-child` lives in `host`'s view, so it is initialized only when `host`'s view is
processed — after every component of the sandbox's view got `ngOnInit`/`ngAfterContentInit`. A parent's view is
initialized only once its children's views are, so `ngAfterViewInit` goes bottom-up (`view-child` before `host`).

> ⚠️ Not confirmed by official docs / opinion: angular.dev doesn't document cross-component ordering; this is the
> observed order. Don't write code that depends on it.

**"Change nothing" click:** the template listener notifies the scheduler; the sandbox is checked, so every tracer
gets `ngDoCheck`, `ngAfterContentChecked`, `ngAfterViewChecked` — but **not** `ngOnChanges` (no input changed) and no
Init hooks. Their templates are not re-rendered (OnPush, nothing dirty in them)
([docs](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility)).

---

## Solution 5 — Component-scoped polling service

```ts
import { Component, Injectable, OnDestroy, inject, signal } from '@angular/core';

@Injectable() // no providedIn: must be provided explicitly
export class Poller implements OnDestroy {
  private readonly _count = signal(0);
  readonly count = this._count.asReadonly();
  private readonly id = setInterval(() => {
    // fetch('/mock/status.json') would go here
    this._count.update((n) => n + 1);
  }, 3000);

  // Angular never calls ngOnInit on a service: lifecycle hooks are for directives/components.
  // The only hook a service gets is ngOnDestroy (https://angular.dev/api/core/OnDestroy).
  ngOnDestroy(): void {
    clearInterval(this.id);
    console.log('Poller destroyed');
  }
}

@Component({
  selector: 'app-status-widget',
  providers: [Poller], // one Poller per widget instance, destroyed with it
  template: `<p>Polled {{ poller.count() }} times</p>`,
})
export class StatusWidget {
  protected readonly poller = inject(Poller);
}

@Component({
  selector: 'app-sandbox',
  imports: [StatusWidget],
  template: `
    <button type="button" (click)="a.set(!a())">Toggle A</button>
    <button type="button" (click)="b.set(!b())">Toggle B</button>
    @if (a()) { <app-status-widget /> }
    @if (b()) { <app-status-widget /> }
  `,
})
export class Sandbox {
  protected readonly a = signal(true);
  protected readonly b = signal(true);
}
```

**Why:** a component-level provider creates one instance per component in its `ElementInjector`; "When the component
instance is destroyed, so is that service instance" ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection)),
which calls the service's `ngOnDestroy`. With `providedIn: 'root'` there would be one shared instance living until
the app is destroyed — the interval would never stop.

---

## Solution 6 — NG0103 debugging

**Out loud:**
1. `Shell` is checked: it renders `checks()` (0) and records a dependency on `stats.checks`.
2. As part of **Shell's** check, `Widget`'s view is checked, then Angular calls `Widget.ngAfterViewChecked`
   (view hooks of a child run during its parent's check).
3. The hook writes `stats.checks` → `Shell`'s template consumer is now dirty → Angular must refresh `Shell` again
   in the same tick.
4. Re-checking `Shell` re-checks `Widget` → `ngAfterViewChecked` again → write again → … Angular gives up after a
   bounded number of passes and throws `NG0103: Infinite change detection`.
   (With a plain field instead of a signal, you would get `NG0100` in dev mode.) Both outcomes are verified in
   [`lifecycle.spec.ts`](../../src/app/modules/03-lifecycle/lifecycle.spec.ts).

**Bonus:** when only `Widget`'s own template reads the signal, the write marks only `Widget`'s view; Angular
re-renders that view alone, without re-checking `Shell`, so `Widget.ngAfterViewChecked` (invoked by `Shell`'s check)
isn't called again. Verified in the spec (_"…ITS OWN template…: re-render, no loop"_).

**Fix: count in a plain field, publish outside change detection**

```ts
import { AfterViewChecked, Component, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Stats {
  private raw = 0; // plain field: writing it notifies nobody
  private scheduled = false;
  private readonly _checks = signal(0);
  readonly checks = this._checks.asReadonly();

  recordCheck(): void {
    this.raw++;
    if (this.scheduled) return;
    this.scheduled = true;
    // Publish later, outside the current check, at most once per second.
    setTimeout(() => {
      this.scheduled = false;
      this._checks.set(this.raw);
    }, 1000);
  }
}

@Component({ selector: 'app-widget', template: `<p>widget</p>` })
export class Widget implements AfterViewChecked {
  private readonly stats = inject(Stats);
  ngAfterViewChecked(): void {
    this.stats.recordCheck();
  }
}
```

Publishing re-checks `Shell` → one more `ngAfterViewChecked` → one more publish a second later: a slow, bounded
"heartbeat" instead of a synchronous loop. That's why the demo of this module goes further and only records during
a user-triggered window ([theory §11](./theory.md#11-logging-from-hooks-without-infinite-loops-how-the-demo-works)).

**Discussion:** counting checks in production code is rarely useful and each `*Checked` hook costs on every
pass ([docs](https://angular.dev/guide/components/lifecycle#ngafterviewchecked)). To understand change detection, use
the Angular DevTools profiler instead.

> ⚠️ Not confirmed by official docs / opinion: the exact maximum number of re-check passes before NG0103 is an
> implementation detail.
