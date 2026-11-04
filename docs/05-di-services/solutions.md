# 05 · DI & services — Solutions

Each solution compiles with Angular 22 (they were test-compiled and rendered in a TestBed before being written
here). Paths assume the files live in `src/app/sandbox/` (so the shared helpers are imported from
`'../shared/...'`).

---

## Solution 1 ⭐ — A shared root store

```ts
// src/app/sandbox/theme-store.ts
import { Component, Service, inject, signal } from '@angular/core';

let nextId = 1;

@Service()
export class ThemeStore {
  readonly instanceId = nextId++;
  readonly mode = signal<'light' | 'dark'>('light');

  toggle(): void {
    this.mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }
}

@Component({
  selector: 'app-theme-toggle',
  template: `<button type="button" (click)="store.toggle()">Toggle (store #{{ store.instanceId }})</button>`,
})
export class ThemeToggle {
  protected readonly store = inject(ThemeStore);
}

@Component({
  selector: 'app-theme-badge',
  template: `<span>Mode: {{ store.mode() }} (store #{{ store.instanceId }})</span>`,
})
export class ThemeBadge {
  protected readonly store = inject(ThemeStore);
}
```

**Why it works:** `@Service()` registers `ThemeStore` in the **root** `EnvironmentInjector`. The first
`inject(ThemeStore)` creates the instance; every later request (from any component, anywhere) gets the cached
one → same `instanceId`, shared signal. Both components are OnPush (default in v22) but they read a signal in
their template, so they re-render when it changes.
([docs](https://angular.dev/guide/di/creating-and-using-services#how-services-become-available))

---

## Solution 2 ⭐⭐ — One store per component, destroyed with it

```ts
// src/app/sandbox/wizard.ts
import { Component, DestroyRef, Injectable, OnDestroy, Service, inject, signal } from '@angular/core';
import { EventLog } from '../shared/event-log';
import { LogPanel } from '../shared/log-panel/log-panel';

/** Root service so the log survives the wizards. */
@Service()
export class WizardLog {
  readonly log = new EventLog();
}

let nextId = 1;

/** NOT root: each <app-wizard> provides its own. */
@Injectable()
export class WizardState implements OnDestroy {
  readonly id = nextId++;
  readonly step = signal(1);
  private readonly log = inject(WizardLog).log;

  constructor() {
    this.log.addDeferred(`WizardState #${this.id} created`);
    inject(DestroyRef).onDestroy(() => this.log.addDeferred(`WizardState #${this.id}: DestroyRef.onDestroy`, 'hook'));
  }

  next(): void {
    this.step.update((s) => Math.min(s + 1, 3));
  }

  prev(): void {
    this.step.update((s) => Math.max(s - 1, 1));
  }

  ngOnDestroy(): void {
    this.log.addDeferred(`WizardState #${this.id}: ngOnDestroy`, 'warning');
  }
}

@Component({
  selector: 'app-wizard-nav',
  template: `
    <button type="button" (click)="state.prev()">Prev</button>
    <button type="button" (click)="state.next()">Next</button>
  `,
})
export class WizardNav {
  // Resolved from the parent <app-wizard>'s ElementInjector.
  protected readonly state = inject(WizardState);
}

@Component({
  selector: 'app-wizard',
  providers: [WizardState],
  imports: [WizardNav],
  template: `<p>Wizard #{{ state.id }} — step {{ state.step() }}/3</p><app-wizard-nav />`,
})
export class Wizard {
  protected readonly state = inject(WizardState);
}

@Component({
  selector: 'app-wizard-demo',
  imports: [Wizard, LogPanel],
  template: `
    <button type="button" (click)="showSecond.set(!showSecond())">Toggle second wizard</button>
    <app-wizard />
    @if (showSecond()) {
      <app-wizard />
    }
    <app-log-panel [entries]="log.entries()" (cleared)="log.clear()" />
  `,
})
export class WizardDemo {
  protected readonly log = inject(WizardLog).log;
  protected readonly showSecond = signal(true);
}
```

**Why it works:**
- `providers: [WizardState]` on `Wizard` creates one instance **per `<app-wizard>` element**
  ([docs](https://angular.dev/guide/di/defining-dependency-providers#component-or-directive-providers)).
- `WizardNav` has no provider, so resolution walks up the **element** tree and finds the parent wizard's
  instance — that's how a parent and its children share state without inputs/outputs.
- When the second wizard is removed by `@if`, its ElementInjector is destroyed, which runs the service's
  `ngOnDestroy()` and its `DestroyRef` callbacks
  ([API](https://angular.dev/api/core/DestroyRef)).
- The log lives in a **root** service, otherwise it would die with the wizard.
- `addDeferred()` because instances are created/destroyed while Angular renders the `@if` block.

---

## Solution 3 ⭐⭐ — Tokens, defaults and overrides

```ts
// src/app/sandbox/endpoints.ts
import { Component, InjectionToken, inject } from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => '/api',
});

export interface Endpoints {
  readonly users: string;
  readonly orders: string;
}

export function endpointsFactory(): Endpoints {
  const base = inject(API_BASE_URL);
  return { users: `${base}/users`, orders: `${base}/orders` };
}

export const ENDPOINTS = new InjectionToken<Endpoints>('ENDPOINTS', { factory: endpointsFactory });

@Component({
  selector: 'app-endpoint-list',
  template: `<p>base: {{ base }} · users: {{ endpoints.users }} · orders: {{ endpoints.orders }}</p>`,
})
export class EndpointList {
  protected readonly base = inject(API_BASE_URL);
  protected readonly endpoints = inject(ENDPOINTS);
}

/** Overrides only API_BASE_URL → ENDPOINTS still comes from root (built with '/api'). */
@Component({
  selector: 'app-staging-wrapper',
  imports: [EndpointList],
  providers: [{ provide: API_BASE_URL, useValue: 'https://staging.example.com' }],
  template: `<app-endpoint-list />`,
})
export class StagingWrapper {}

/** Fix: re-provide ENDPOINTS at the same level so its factory sees the local API_BASE_URL. */
@Component({
  selector: 'app-staging-wrapper-fixed',
  imports: [EndpointList],
  providers: [
    { provide: API_BASE_URL, useValue: 'https://staging.example.com' },
    { provide: ENDPOINTS, useFactory: endpointsFactory },
  ],
  template: `<app-endpoint-list />`,
})
export class StagingWrapperFixed {}
```

Rendered output:

| Where | `API_BASE_URL` | `ENDPOINTS.users` |
| --- | --- | --- |
| plain | `/api` | `/api/users` |
| `StagingWrapper` | `https://staging.example.com` | **`/api/users`** 😱 |
| `StagingWrapperFixed` | `https://staging.example.com` | `https://staging.example.com/users` |

**Answer to the question: no.** A token with a factory is `providedIn: 'root'`
([docs](https://angular.dev/guide/di/defining-dependency-providers#injectiontoken-with-providedin-root)), so
`ENDPOINTS` is created **once, by the root injector**, and its factory's `inject(API_BASE_URL)` resolves from
root → `'/api'`. Overriding `API_BASE_URL` in a component doesn't re-run a factory that belongs to another
injector. Fix: provide `ENDPOINTS` again **at the same level** (`useFactory: endpointsFactory`), so the
factory runs in the component's injection context and sees the local `API_BASE_URL`. Rule of thumb: *a
value is built by the injector that owns its provider, with the dependencies visible from there.*

---

## Solution 4 ⭐⭐⭐ — A plugin system with `multi` providers

```ts
// src/app/sandbox/password-checker.ts
import { Component, InjectionToken, computed, inject, signal } from '@angular/core';

export interface PasswordRule {
  readonly name: string;
  test(pw: string): boolean;
}

export const PASSWORD_RULES = new InjectionToken<readonly PasswordRule[]>('PASSWORD_RULES');
export const USERNAME = new InjectionToken<string>('USERNAME');

@Component({
  selector: 'app-password-checker',
  providers: [
    { provide: USERNAME, useValue: 'ada' },
    { provide: PASSWORD_RULES, multi: true, useValue: { name: 'At least 8 chars', test: (pw: string) => pw.length >= 8 } },
    { provide: PASSWORD_RULES, multi: true, useValue: { name: 'Has a digit', test: (pw: string) => /\d/.test(pw) } },
    { provide: PASSWORD_RULES, multi: true, useValue: { name: 'Has an uppercase', test: (pw: string) => /[A-Z]/.test(pw) } },
    {
      provide: PASSWORD_RULES,
      multi: true,
      useFactory: (username: string): PasswordRule => ({
        name: `Is not the username "${username}"`,
        test: (pw) => pw.toLowerCase() !== username.toLowerCase(),
      }),
      deps: [USERNAME],
    },
  ],
  template: `
    <input type="password" [value]="password()" (input)="onInput($event)" aria-label="Password" />
    <ul>
      @for (r of results(); track r.name) {
        <li>{{ r.ok ? '✅' : '❌' }} {{ r.name }}</li>
      }
    </ul>
  `,
})
export class PasswordChecker {
  private readonly rules = inject(PASSWORD_RULES);
  protected readonly password = signal('');
  protected readonly results = computed(() =>
    this.rules.map((rule) => ({ name: rule.name, ok: rule.test(this.password()) })),
  );

  protected onInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }
}
```

**Why it works:** with `multi: true` each provider **adds** an element instead of replacing the previous one,
so `inject(PASSWORD_RULES)` returns an array of 4 rules
([docs](https://angular.dev/guide/di/defining-dependency-providers#multiple-providers)). The 4th rule uses
`useFactory` + `deps`: the factory is called with the resolved `USERNAME`
([docs](https://angular.dev/guide/di/defining-dependency-providers#usefactory)). This is exactly how Angular
itself collects `HTTP_INTERCEPTORS` or `NG_VALIDATORS`. `computed()` re-evaluates the rules whenever the
`password` signal changes.

---

## Solution 5 ⭐⭐⭐ — Own the lifetime: a manual `EnvironmentInjector`

```ts
// src/app/sandbox/chat-session.ts
import {
  Component,
  DestroyRef,
  EnvironmentInjector,
  Injectable,
  createEnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, interval } from 'rxjs';
import { EventLog } from '../shared/event-log';
import { LogPanel } from '../shared/log-panel/log-panel';

let nextId = 1;

@Injectable()
export class ChatSession {
  readonly id = nextId++;
  readonly messages = signal(0);
  /** Set by the owner so the session can log; kept simple for the exercise. */
  log?: EventLog;

  constructor() {
    interval(1000)
      .pipe(
        takeUntilDestroyed(), // injection context: the constructor
        finalize(() => this.log?.add(`session #${this.id}: interval stopped`, 'warning')),
      )
      .subscribe(() => this.messages.update((n) => n + 1));
    inject(DestroyRef).onDestroy(() => this.log?.add(`session #${this.id}: destroyed`, 'hook'));
  }
}

@Component({
  selector: 'app-chat-session-demo',
  imports: [LogPanel],
  template: `
    <button type="button" (click)="open()" [disabled]="session()">Open session</button>
    <button type="button" (click)="close()" [disabled]="!session()">Close session</button>
    @if (session(); as s) {
      <p>Session #{{ s.id }} — {{ s.messages() }} messages</p>
    }
    <app-log-panel [entries]="log.entries()" (cleared)="log.clear()" />
  `,
})
export class ChatSessionDemo {
  private readonly parent = inject(EnvironmentInjector);
  private injector: EnvironmentInjector | null = null;
  protected readonly session = signal<ChatSession | null>(null);
  protected readonly log = new EventLog();

  open(): void {
    this.injector = createEnvironmentInjector([ChatSession], this.parent, 'ChatSession');
    const session = this.injector.get(ChatSession);
    session.log = this.log;
    this.session.set(session);
    this.log.add(`session #${session.id}: opened`, 'success');
  }

  close(): void {
    this.injector?.destroy();
    this.injector = null;
    this.session.set(null);
  }
}
```

**Why it works:**
- `createEnvironmentInjector([ChatSession], parent)` creates a child injector that **owns** the
  `ChatSession` provider ([API](https://angular.dev/api/core/createEnvironmentInjector)). The instance is
  created lazily by `injector.get(ChatSession)`.
- In the service, `DestroyRef` is the DestroyRef of **that injector**
  ([API](https://angular.dev/api/core/DestroyRef)), so `takeUntilDestroyed()` completes the interval and the
  `onDestroy` callback fires when we call `injector.destroy()`.
- Opening again creates a new injector → a new instance (count restarts).
- Passing the log through a public field is a shortcut for the exercise; in real code you'd inject a logger
  (e.g. via an `InjectionToken` provided in the same `createEnvironmentInjector` call:
  `createEnvironmentInjector([ChatSession, { provide: SESSION_LOG, useValue: this.log }], parent)`).

---

## Solution 6 🎤 — Interview: debug & explain out loud

**Part A.** `CartStore` has **two providers**: `providedIn: 'root'` (root injector) and the `shop` route's
`providers` (a child `EnvironmentInjector` created for that route). "Singleton" means *one instance per
injector that has a provider*. Components inside the `shop` route resolve the nearest one → the route
instance; the header lives outside the route → it resolves the root instance. Two instances, two states.
([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#resolution-rules))

Fixes:
1. Remove `CartStore` from the route's `providers` (keep `providedIn: 'root'` — or `@Service()`).
2. If the cart really must be feature-scoped, move the header's cart badge inside the route, or have the
   header read a root-level facade that the route instance reports to — but option 1 is the right answer.

**Part B — talking points.**
- *First lifecycle hook of a service?* None before destruction: no `ngOnInit`; the constructor is plain
  instantiation (lazy, on first injection). The only hook is `ngOnDestroy`
  ([API](https://angular.dev/api/core/OnDestroy)).
- *Four ways to release resources:* `ngOnDestroy`; `inject(DestroyRef).onDestroy()`; `takeUntilDestroyed()`
  / `toSignal()` (auto-unsubscribe); and controlling the owning injector — scope to a component/route, or
  create an `EnvironmentInjector` and `destroy()` it
  ([docs](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed)).
- *`viewProviders`?* When a component wants a service visible to its own template but **hidden from content
  projected into it** — e.g. a library component's internal state that consumers' `<ng-content>` must not
  inject ([docs](https://angular.dev/guide/di/hierarchical-dependency-injection#providers-vs-viewproviders)).
