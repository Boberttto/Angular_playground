# 03 · Lifecycle hooks — Exercises

Work in [`src/app/sandbox/`](../../src/app/sandbox/). Solutions: [solutions.md](./solutions.md).
Theory: [theory.md](./theory.md).

---

## Exercise 1 ⭐ — A clock that cleans up after itself

**Goal:** create a `Clock` component showing the current time, updated every second, that never leaks its timer.

**Requirements**
- [ ] `Clock` displays `HH:MM:SS`, refreshed every second (zoneless app: the template must be notified!).
- [ ] The interval is started when the component is created and cleared when it is destroyed.
- [ ] Use `DestroyRef` (not `ngOnDestroy`) for the cleanup, registered right next to the `setInterval`.
- [ ] The sandbox has a "Toggle clock" button (`@if`). Prove with a `console.log` inside the interval that it stops
      when the clock is hidden.

<details><summary>Hints</summary>

- In a zoneless app a plain field updated from `setInterval` will not refresh the view: use a `signal`.
- `inject(DestroyRef).onDestroy(() => ...)` in the constructor.
</details>

---

## Exercise 2 ⭐ — Migrate ngOnChanges to signals

**Goal:** rewrite this legacy component with signal inputs and no lifecycle hook.

```ts
// Legacy syntax (still supported)
@Component({ selector: 'app-greeting', template: `<p>{{ message }}</p>` })
export class Greeting implements OnChanges {
  @Input() firstName = '';
  @Input() lastName = '';
  message = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['firstName'] || changes['lastName']) {
      this.message = `Hello ${this.firstName} ${this.lastName}`.trim();
    }
  }
}
```

**Requirements**
- [ ] `firstName` is required, `lastName` optional (default `''`).
- [ ] `message` is derived without any hook.
- [ ] Also log `"firstName changed from X to Y"` to the console each time `firstName` changes **after** the first
      value (side effect).

<details><summary>Hints</summary>

- `input.required<string>()`, `computed()`.
- For the previous value: `linkedSignal({ source, computation: (value, previous) => ... })` or keep a plain field
  inside an `effect`.
</details>

---

## Exercise 3 ⭐⭐ — SSR-safe autofocus directive

**Goal:** a directive `[appAutofocus]` that focuses its host element once it is in the DOM.

**Requirements**
- [ ] Works on `<input appAutofocus>`.
- [ ] Optional boolean input `appAutofocus` (`<input [appAutofocus]="false">` disables it).
- [ ] Must not crash under SSR (no `document`/`focus()` call on the server).
- [ ] Uses the right render phase.

<details><summary>Hints</summary>

- `afterNextRender` never runs on the server.
- Focusing is a DOM **write**.
- Boolean attribute: `input(true, { transform: booleanAttribute })` — but the bare attribute `appAutofocus` yields `''`.
</details>

---

## Exercise 4 ⭐⭐ — Lifecycle tracer

**Goal:** build a small `Tracer` component with a `name` input that logs (console) every hook it receives, then use
it to answer the questions below **before** running the code — then check.

**Requirements**
- [ ] `Tracer` implements all 8 hook methods + constructor + `afterNextRender` + `DestroyRef`.
- [ ] Sandbox template: `<app-tracer name="outer"><app-tracer name="inner" /></app-tracer>` (`Tracer`'s template
      has an `<ng-content>`, so `inner` is **projected** into `outer`), followed by `<app-tracer-host />`, a component
      that logs its own hooks as `host` and whose **own template** contains `<app-tracer name="view-child" />`.
- [ ] Predict, then observe: in which order do `outer` and `inner` get `ngOnInit`? And `host` / `view-child` for
      `ngOnInit`, `ngAfterContentInit`, `ngAfterViewInit`?
- [ ] Click a button in the sandbox that changes nothing. Which hooks run? Why?

<details><summary>Hints</summary>

- Projected content is part of the **parent's** (sandbox's) template, not of `outer`'s view.
- Content hooks of a component run before its view is processed.
</details>

---

## Exercise 5 ⭐⭐⭐ — Component-scoped polling service

**Goal:** a `Poller` service that polls a mock endpoint every 3 s, with one instance per widget and no leaks.

**Requirements**
- [ ] `Poller` is **not** root-provided; each `StatusWidget` provides its own instance.
- [ ] `Poller` exposes `readonly count: Signal<number>` (number of polls done) and starts polling in its constructor.
- [ ] The interval stops when the widget is destroyed — show it with two widgets toggled independently.
- [ ] Explain in a comment why `ngOnInit` in `Poller` would never be called.

<details><summary>Hints</summary>

- `@Injectable()` without `providedIn` + `@Component({ providers: [Poller] })`.
- A service can implement `ngOnDestroy` or inject `DestroyRef`.
</details>

---

## Exercise 6 ⭐⭐⭐ — Interview debugging challenge: NG0103

A colleague wants to display, in the app shell, how many times a widget's view was checked. The console shows
`NG0103: Infinite change detection while trying to refresh views`. **Explain out loud** what happens step by step,
then fix it.

```ts
@Injectable({ providedIn: 'root' })
export class Stats {
  readonly checks = signal(0);
}

@Component({ selector: 'app-widget', template: `<p>widget</p>` })
export class Widget implements AfterViewChecked {
  private readonly stats = inject(Stats);
  ngAfterViewChecked() {
    this.stats.checks.update((n) => n + 1);
  }
}

@Component({
  selector: 'app-shell',
  imports: [Widget],
  template: `<p>Widget checked {{ stats.checks() }} times</p> <app-widget />`,
})
export class Shell {
  protected readonly stats = inject(Stats);
}
```

**Requirements**
- [ ] Describe the loop in terms of: who calls `Widget.ngAfterViewChecked`, signal write → view marked dirty →
      re-check → hook again.
- [ ] Bonus: explain why moving the `{{ checks() }}` display **inside `Widget`'s own template** makes the error
      disappear (try it!).
- [ ] Fix it so the shell still shows a (possibly slightly delayed) count, without any loop.
- [ ] Discuss: is counting checks a good idea at all? What tool would you use instead?

<details><summary>Hints</summary>

- `Widget`'s view hooks are run as part of `Shell`'s check.
- Count in a plain field, publish to the signal later, outside change detection, and only when asked (button),
  or throttled.
- Angular DevTools has a profiler showing change detection cycles.
</details>
