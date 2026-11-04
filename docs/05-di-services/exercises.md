# 05 · DI & services — Exercises

Work in [`src/app/sandbox/`](../../src/app/sandbox/) (route `/sandbox`): create your files there, import the
components in `sandbox.ts` and render them in `sandbox.html`. Solutions: [solutions.md](./solutions.md).

---

## Exercise 1 ⭐ — A shared root store

**Goal:** prove that a root service is a singleton shared by unrelated components.

**Requirements**
- [ ] Create `ThemeStore` with `@Service()` holding `mode = signal<'light' | 'dark'>('light')` and a `toggle()` method.
- [ ] Create two components `ThemeToggle` (button) and `ThemeBadge` (displays the mode), both using `inject(ThemeStore)`.
- [ ] Render them far apart in the sandbox: clicking the toggle updates the badge.
- [ ] Display an `instanceId` (static counter incremented in the constructor) in both: it must be the same.

<details><summary>Hints</summary>

- `@Service()` = `@Injectable({ providedIn: 'root' })`, imported from `@angular/core`.
- `let next = 1;` at module level + `readonly instanceId = next++;` as a field.
</details>

---

## Exercise 2 ⭐⭐ — One store per component, destroyed with it

**Goal:** isolate state per component instance and observe the service's destruction.

**Requirements**
- [ ] Create `@Injectable() class WizardState` (NOT root) with `step = signal(1)`, `next()`, `prev()`.
- [ ] Create `Wizard` with `providers: [WizardState]`, and a child `WizardNav` (buttons) that injects `WizardState` — no inputs/outputs between them.
- [ ] Render **two** `<app-wizard>` side by side: their steps are independent.
- [ ] In `WizardState`, log destruction **twice**: in `ngOnDestroy()` and via `inject(DestroyRef).onDestroy()`.
- [ ] Add a button that removes one wizard with `@if` and display the log on screen (`EventLog` + `<app-log-panel>`).

<details><summary>Hints</summary>

- A child injects the nearest provider walking up the element tree, so `WizardNav` gets its parent's `WizardState`.
- The log must outlive the wizard → put the `EventLog` in a small root service.
- Use `log.addDeferred()` in destruction callbacks (they run during rendering).
</details>

---

## Exercise 3 ⭐⭐ — Tokens, defaults and overrides

**Goal:** use `InjectionToken` with a default factory, override it locally, and build a value with `useFactory`.

**Requirements**
- [ ] `API_BASE_URL = new InjectionToken<string>(...)` with a factory returning `'/api'` (no provider needed).
- [ ] `ENDPOINTS = new InjectionToken<{ users: string; orders: string }>(...)` whose factory **injects** `API_BASE_URL`.
- [ ] A component `EndpointList` displays both values.
- [ ] Render it twice: once normally, once inside a wrapper component that provides `{ provide: API_BASE_URL, useValue: 'https://staging.example.com' }`.
- [ ] Question: does the second instance show the staging URLs in `ENDPOINTS`? Explain why.

<details><summary>Hints</summary>

- Token factories are `providedIn: 'root'` by default and run **once in the root injector**.
- Think about which injector creates `ENDPOINTS` and which `API_BASE_URL` it can see.
</details>

---

## Exercise 4 ⭐⭐⭐ — A plugin system with `multi` providers

**Goal:** collect contributions from several providers into one array.

**Requirements**
- [ ] Define `interface PasswordRule { name: string; test(pw: string): boolean }` and `PASSWORD_RULES = new InjectionToken<readonly PasswordRule[]>('PASSWORD_RULES')`.
- [ ] Provide 3 rules (min length 8, has digit, has uppercase) with `multi: true` in a `PasswordChecker` component.
- [ ] The component injects the array and shows ✅/❌ per rule as the user types (signal + `computed`).
- [ ] Add a 4th rule with `useFactory` + `deps` (e.g. a "not equal to username" rule that receives a `USERNAME` token).

<details><summary>Hints</summary>

- `{ provide: PASSWORD_RULES, useValue: rule, multi: true }`.
- `{ provide: PASSWORD_RULES, useFactory: (username: string) => ({...}), deps: [USERNAME], multi: true }`.
</details>

---

## Exercise 5 ⭐⭐⭐ — Own the lifetime: a manual `EnvironmentInjector`

**Goal:** create a "session" service on demand and destroy it explicitly, without any component scope.

**Requirements**
- [ ] `@Injectable() class ChatSession` that starts an RxJS `interval(1000)` in its constructor, pipes `takeUntilDestroyed()`, and counts messages in a signal.
- [ ] A component with buttons **Open session** (`createEnvironmentInjector([ChatSession], parent)`), **Close session** (`destroy()`).
- [ ] Display the message count while the session exists; prove (log) that the interval stops when the session is closed.
- [ ] Opening a new session must create a **new** instance (count restarts).

<details><summary>Hints</summary>

- `parent = inject(EnvironmentInjector)` in a field initializer.
- `takeUntilDestroyed()` with no argument works in the service constructor (injection context).
- Store the current `ChatSession | null` in a signal to display its count.
</details>

---

## Exercise 6 🎤 — Interview: debug & explain out loud

**Part A — debugging.** A teammate reports: *"The cart badge in the header shows 0 items while the cart page shows 3."*

```ts
@Injectable({ providedIn: 'root' })
export class CartStore { readonly items = signal<string[]>([]); }

// app.routes.ts
{ path: 'shop', providers: [CartStore], loadChildren: () => import('./shop/shop.routes') }
```

- [ ] Explain precisely why there are two instances and which components get which.
- [ ] Give two ways to fix it.

**Part B — explain out loud (≤ 2 minutes each).**
- [ ] "What is the first lifecycle hook of a service?"
- [ ] "Name four ways a service can release resources."
- [ ] "When would you use `viewProviders`?"

<details><summary>Hints</summary>

- One instance **per injector that has a provider**. Route `providers` create a child `EnvironmentInjector`.
- The header isn't inside the `shop` route.
</details>
