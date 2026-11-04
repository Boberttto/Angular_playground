# 10 · Change detection — Exercises

Work in [`src/app/sandbox/`](../../src/app/sandbox/). Solutions: [solutions.md](./solutions.md).
Theory: [theory.md](./theory.md).

---

## Exercise 1 ⭐ — "It worked with zone.js"

This component, copied from an Angular 16 app, never shows "Loaded" in our zoneless app. Fix it **two ways**.

```ts
@Component({
  selector: 'app-loader',
  template: `<p>{{ status }}</p>`,
})
export class Loader {
  status = 'Loading…';
  constructor() {
    setTimeout(() => (this.status = 'Loaded'), 1000);
  }
}
```

**Requirements**
- [ ] Fix A: signals (preferred).
- [ ] Fix B: keep the plain field, use `ChangeDetectorRef`.
- [ ] In a comment, explain why it worked with zone.js.

<details><summary>Hints</summary>

- zone.js patched `setTimeout`. Zoneless only reacts to notifications.
</details>

---

## Exercise 2 ⭐ — The list that does not grow

`TodoList` (OnPush, default) receives `@Input() items: string[]`. The parent does `this.items.push(newItem)` on click,
yet the list never shows the new item.

**Requirements**
- [ ] Reproduce it (parent + child) in the sandbox.
- [ ] Fix it in the parent with an immutable update.
- [ ] Then rewrite the parent's state as a `signal<string[]>` and the child with `input()`.
- [ ] Explain why making the child `Eager` "fixes" it too, and why that's the wrong fix.

<details><summary>Hints</summary>

- `Object.is(sameArray, sameArray) === true`.
</details>

---

## Exercise 3 ⭐⭐ — Throttle a noisy widget with detach()

A `PriceTicker` receives a new price ~50 times per second (simulate with `setInterval(…, 20)` writing a signal). Rendering
every update is wasteful.

**Requirements**
- [ ] The ticker detaches itself from change detection on creation.
- [ ] It renders at most every 500 ms with `detectChanges()`.
- [ ] A "Live / Throttled" toggle switches between `reattach()` and `detach()`.
- [ ] Show a render count to prove the throttling works.

<details><summary>Hints</summary>

- A detached view is not checked even when the signals it reads change.
- Clean the intervals with `DestroyRef`.
</details>

---

## Exercise 4 ⭐⭐ — A non-Angular callback

Simulate a third-party library: `class FakeMapLib { onMove(cb: (lat: number) => void) { … setInterval … } }`.
A component displays the latest latitude.

**Requirements**
- [ ] Version 1: store the latitude in a plain field → observe it doesn't render.
- [ ] Version 2: fix with a signal.
- [ ] Bonus: in a zone-based app (`provideZoneChangeDetection()`), how would you avoid running CD for **every** callback
      and only update the UI every second? (Explain, no need to switch the playground to zones.)

<details><summary>Hints</summary>

- `NgZone.runOutsideAngular` / `NgZone.run`.
</details>

---

## Exercise 5 ⭐⭐⭐ — Predict the render counts

Build this tree (all components show a render count, e.g. with the module's `injectRenderCounter()`):

```
Root (OnPush)           button "noop" + reads signal `rootSig`
├── A (Eager)
│   └── A1 (OnPush)     reads signal `a1Sig`
└── B (OnPush)          input [label]
    └── B1 (Eager)
```

**Requirements**
- [ ] For each action, **predict** which components re-render, then verify:
  1. click "noop" in Root;
  2. `a1Sig.set(...)` from a `setTimeout` (no event);
  3. Root changes B's `label` input (new string);
  4. a click handled inside B1.
- [ ] Write down the rule that explains each case.

<details><summary>Hints</summary>

- Events mark the component **and its ancestors**.
- Eager children are checked whenever their parent is checked.
- Signal changes mark the consuming view only.
</details>

---

## Exercise 6 ⭐⭐⭐ — Interview debugging: the spinner that throws NG0100

The console shows `NG0100: ExpressionChangedAfterItHasBeenCheckedError … Previous value: 'true'. Current value: 'false'`.

```ts
@Injectable({ providedIn: 'root' })
export class LoadingService {
  loading = true; // plain field
}

@Component({
  selector: 'app-shell',
  imports: [Dashboard],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `@if (loading.loading) { <p>Loading…</p> } <app-dashboard />`,
})
export class Shell {
  protected readonly loading = inject(LoadingService);
}

@Component({ selector: 'app-dashboard', template: `<p>Dashboard</p>` })
export class Dashboard {
  private readonly loading = inject(LoadingService);
  ngAfterViewInit() {
    this.loading.loading = false;
  }
}
```

**Requirements**
- [ ] **Explain out loud** the sequence that produces the error (who renders what, when, and what the dev-mode check sees).
- [ ] Why does it only happen in development?
- [ ] Fix it properly (not with `setTimeout`), and say which fix you'd pick in a real app.

<details><summary>Hints</summary>

- `Shell` evaluates `loading.loading` **before** checking `Dashboard`.
- Signals tell Angular that a view must be refreshed again.
</details>
