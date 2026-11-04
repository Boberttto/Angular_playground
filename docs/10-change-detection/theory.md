# 10 · Change detection

**Change detection (CD)** is the process through which Angular checks whether application state changed and whether
the DOM must be updated ([docs](https://angular.dev/best-practices/runtime-performance)). Angular 22 changes the
defaults most tutorials (and many interviewers) still assume:

- **Zoneless by default** (since v21): no zone.js; CD is scheduled by explicit notifications
  ([docs](https://angular.dev/guide/zoneless#enabling-zoneless-in-an-application)).
- **OnPush by default** (since v22); the old "Default" strategy is now called **`Eager`** (`Default` is a deprecated
  alias) ([docs](https://angular.dev/best-practices/skipping-subtrees#using-onpush),
  [API](https://angular.dev/api/core/ChangeDetectionStrategy)).

Know both the modern model and the zone.js history: interviews ask both.

Demo: [`src/app/modules/10-change-detection/`](../../src/app/modules/10-change-detection/) — every demo component shows
a `rendered N×` badge. Claims marked "(spec)" are proven by
[`change-detection.spec.ts`](../../src/app/modules/10-change-detection/change-detection.spec.ts).

## Table of contents

1. [How change detection works](#1-how-change-detection-works)
2. [What schedules change detection (zoneless)](#2-what-schedules-change-detection-zoneless)
3. [Strategies: OnPush (default) vs Eager](#3-strategies-onpush-default-vs-eager)
4. [Mutable vs immutable inputs](#4-mutable-vs-immutable-inputs)
5. [ChangeDetectorRef: markForCheck, detectChanges, detach, reattach](#5-changedetectorref-markforcheck-detectchanges-detach-reattach)
6. [Signals and fine-grained updates](#6-signals-and-fine-grained-updates)
7. [ExpressionChangedAfterItHasBeenCheckedError (NG0100)](#7-expressionchangedafterithasbeencheckederror-ng0100)
8. [History: zone.js and NgZone](#8-history-zonejs-and-ngzone)
9. [Testing and debugging](#9-testing-and-debugging)
10. [🎯 Likely interview questions](#-likely-interview-questions)
11. [📚 References](#-references)

---

## 1. How change detection works

- The app is a **tree of views** (each component has a view; `@if`/`@for` create embedded views).
- A CD pass walks the tree **top to bottom**, evaluating each checked view's template bindings, comparing with the
  previous values, and updating only the DOM nodes whose binding changed. Lifecycle hooks run during this traversal,
  which visits each component once ([docs](https://angular.dev/guide/components/lifecycle)).
- Which views are actually re-evaluated depends on their **strategy** and **dirty state** (§3) and on signals (§6).
- In **dev mode**, after each pass Angular runs an extra verification pass and throws NG0100 if a binding changed
  ([docs](https://angular.dev/errors/NG0100)). Production builds skip it.

> 💡 **Interview tip:** CD is **unidirectional**: data flows parent → child during a pass. A child must not change
> something its parent already rendered in the same pass — that's exactly what NG0100 detects (§7).

## 2. What schedules change detection (zoneless)

Without zone.js, Angular does not know that "something async happened". It runs CD only after a **notification**.
The official list ([docs](https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility)):

1. `ChangeDetectorRef.markForCheck()` (called automatically by `AsyncPipe`)
2. `ComponentRef.setInput()`
3. Updating a **signal that's read in a template**
4. Bound **host or template listener** callbacks (`(click)`, `host: {'(keydown)': ...}`)
5. Attaching a view that was marked dirty by one of the above

Everything else — `setTimeout`, `fetch`, a resolved Promise, a WebSocket message, a third-party callback — updates
your fields **silently**. Demo [`zoneless-triggers.ts`](../../src/app/modules/10-change-detection/zoneless-triggers/zoneless-triggers.ts):
a plain field incremented in `setTimeout` never reaches the screen, while a signal, `markForCheck()` and `async` pipe
do (spec).

Other zoneless facts:
- Enabled by default since v21: just make sure `provideZoneChangeDetection` isn't used; v20 needed
  `provideZonelessChangeDetection()` ([docs](https://angular.dev/guide/zoneless#enabling-zoneless-in-an-application)).
- `NgZone.onMicrotaskEmpty`, `onUnstable`, `onStable` never emit and `isStable` is always `true`; replace with
  `afterNextRender`/`afterEveryRender` or DOM observers
  ([docs](https://angular.dev/guide/zoneless#remove-ngzoneonmicrotaskempty-ngzoneonunstable-ngzoneisstable-or-ngzoneonstable)).
- `NgZone.run` / `runOutsideAngular` remain compatible (no-ops for scheduling) — keep them in libraries
  ([docs](https://angular.dev/guide/zoneless)).
- SSR: use `PendingTasks` (or `pendingUntilEvent`) so serialization waits for your async work
  ([docs](https://angular.dev/guide/zoneless#pendingtasks-for-server-side-rendering-ssr)).
- Reactive forms model updates (`setValue`, `patchValue`, …) do **not** schedule CD by themselves; read form state
  through signals or call `markForCheck()` ([docs](https://angular.dev/guide/zoneless#reactive-forms-in-zoneless-applications)).
- Benefits: performance (CD only when needed), Core Web Vitals (no zone.js payload), clearer stack traces, no
  monkey-patching of browser APIs (`async/await` can't be patched by zone.js) ([docs](https://angular.dev/guide/zoneless#why-use-zoneless)).

> ⚠️ **Pitfall:** "it works in my old zone app but not after migrating" — usually a field updated in a callback with
> no notification. Fix: store it in a signal (preferred) or call `markForCheck()`.

## 3. Strategies: OnPush (default) vs Eager

```ts
@Component({ selector: 'app-a', template: '…' })                                   // OnPush (v22 default)
@Component({ selector: 'app-b', template: '…', changeDetection: ChangeDetectionStrategy.Eager }) // always checked
```

**Eager** (formerly `Default`, "CheckAlways"): "the component is checked eagerly when the change detection traversal
reaches it" ([API](https://angular.dev/api/core/ChangeDetectionStrategy)).

**OnPush** ("CheckOnce"): the subtree is only checked when ([docs](https://angular.dev/best-practices/skipping-subtrees#using-onpush)):
- its root component receives **new inputs from a template binding** (compared with `Object.is`);
- Angular handles an **event** (event binding, output binding, `@HostListener`) in that component or any of its
  children — which also marks its ancestors;
- plus: a **signal read in its template** changes ([docs](https://angular.dev/guide/signals#reading-signals-in-onpush-components)),
  `markForCheck()` is called (or `AsyncPipe` does it), or `ComponentRef.setInput()`.

Scenarios from the official guide ([docs](https://angular.dev/best-practices/skipping-subtrees#common-change-detection-scenarios)):

| Event happens in… | What is checked |
| --- | --- |
| an Eager component | the whole tree, **skipping** OnPush subtrees that didn't get new inputs |
| an OnPush component | the whole tree incl. that component; other OnPush subtrees outside it are skipped |
| a descendant of an OnPush component | that component's ancestors too (they're marked), even if OnPush |
| (no event) parent passes a new input to an OnPush child | that child; its OnPush descendants only if they get new inputs too |

> ⚠️ **Pitfall:** `ngDoCheck` (and the `*Checked` hooks) of an OnPush child still run when its **parent** is checked,
> even if the child's template is skipped — they are called by the parent's check (verified in module 03's spec).

> 💡 **Interview tip:** "Why is OnPush now the default?" — It's compatible with zoneless (state changes must notify),
> cheaper (skips subtrees), and with signals there's little reason to check everything eagerly. `Eager` remains for
> components relying on mutable state, or library hosts of user components that might not be OnPush-compatible
> ([docs](https://angular.dev/guide/zoneless#onpush-compatible-components)).

The OnPush strategy "applies to all child directives and cannot be overridden"
([API](https://angular.dev/api/core/ChangeDetectionStrategy)).

## 4. Mutable vs immutable inputs

Demo [`strategies-demo.ts`](../../src/app/modules/10-change-detection/strategies/strategies-demo.ts) (spec):

| Parent action | Eager child | OnPush child |
| --- | --- | --- |
| `user.name = 'Grace'` (same reference) + parent re-renders | ✅ shows "Grace" | ❌ stale "Ada" (same reference, `Object.is` → no change) |
| `user = { ...user, name }` (new reference) | ✅ | ✅ |
| click handler that changes nothing in the parent | re-rendered (badge +1) | skipped |
| `childCdr.markForCheck()` | — | ✅ re-rendered, now shows the mutated value |

"In case an input receives a mutable object as value and you modify the object but preserve the reference, Angular
will not invoke change detection" ([docs](https://angular.dev/best-practices/skipping-subtrees#edge-cases)). Same for
setting an `@Input` property from TypeScript via a `@ViewChild` reference: call `markForCheck()`
([docs](https://angular.dev/best-practices/skipping-subtrees#edge-cases)).

> 💡 **Interview tip:** OnPush + immutable data (spread, `map`, `filter`) or signals is the idiomatic combo.

## 5. ChangeDetectorRef: markForCheck, detectChanges, detach, reattach

([API](https://angular.dev/api/core/ChangeDetectorRef))

| Method | Effect | Typical use |
| --- | --- | --- |
| `markForCheck()` | marks this view **and its ancestors** dirty; in zoneless it also schedules CD | OnPush component updated from a callback (non-signal state) |
| `detectChanges()` | **synchronously** checks this view and its children, now | local check of a detached view; rare otherwise |
| `detach()` | removes the view from the CD tree: "not checked until it is reattached… even if they are marked as dirty" | throttle a very frequently changing widget |
| `reattach()` | puts it back | |

Demo [`detachable-ticker.ts`](../../src/app/modules/10-change-detection/detach/detachable-ticker.ts): a signal ticks every
second; after `detach()` the screen freezes even though the signal changes; `detectChanges()` renders once; `reattach()`
resumes (spec).

> ⚠️ **Pitfall:** `markForCheck` ≠ `detectChanges`. The first only **schedules**; the second runs synchronously and
> is easy to misuse (calling it inside another CD pass, or relying on it instead of fixing the data flow).

`ApplicationRef.tick()` runs CD for the whole application ([API](https://angular.dev/api/core/ApplicationRef)).

## 6. Signals and fine-grained updates

When a template reads a signal, the component becomes a **consumer** of it; when the signal changes, Angular marks that
component for refresh ([docs](https://angular.dev/guide/signals#reading-signals-in-onpush-components)). Combined with
OnPush and zoneless, this gives **targeted** refreshes:

- Demo [`fine-grained-demo.ts`](../../src/app/modules/10-change-detection/fine-grained/fine-grained-demo.ts): a timer
  updates counter #2's signal → **only** counter #2 re-renders; the parent and siblings keep their badge (spec).
- A click in the parent (event) re-renders the parent; the OnPush children whose input references didn't change are
  skipped, except the one whose signal changed.

Why this matters:
- No more "check everything after every async task" (zone.js era).
- The framework knows **which** view depends on **which** state — no need for `markForCheck` or the `async` pipe.
- Derived values (`computed`) are memoized and glitch-free (see [04 · Signals](../04-signals/theory.md)).

> ⚠️ Not confirmed by official docs / opinion: the docs say signal changes mark the consuming component; that ancestors
> are traversed **without** re-evaluating their templates is what the demo/spec observe (parent badge unchanged), not an
> explicitly documented guarantee. Angular's granularity today is the **component view**, not individual DOM nodes.

## 7. ExpressionChangedAfterItHasBeenCheckedError (NG0100)

"Angular throws an ExpressionChangedAfterItHasBeenCheckedError when an expression value has been changed after change
detection has completed. Angular only throws this error in development mode" — it runs an additional check after each
pass to ensure bindings haven't changed ([docs](https://angular.dev/errors/NG0100)).

Common causes ([docs](https://angular.dev/errors/NG0100)):
- a method/getter in a template returning a **different value each call** (e.g. `{{ Math.random() }}`, `new Date()`);
- a **child changing its parent's** rendered state (e.g. in `ngAfterViewInit`, or `ngOnChanges`);
- loading flags set during the pass.

Demo [`expression-changed-demo.ts`](../../src/app/modules/10-change-detection/expression-changed/expression-changed-demo.ts)
(spec): a child sets a **plain field** its parent already rendered in `ngAfterViewInit` → NG0100; the same with a
**signal** → no error (Angular knows the parent must be refreshed again).

Fixes, in order of preference:
1. Fix the data flow: compute the value earlier (constructor/`ngOnInit`) or in the parent; derive with `computed`.
2. Use a **signal** for state that's legitimately set later.
3. Last resort: defer the write (`queueMicrotask`, `afterNextRender`) — this hides a data-flow problem.

> ⚠️ **Pitfall:** the error doesn't appear in production, but the inconsistency does (the UI shows a stale value until
> the next CD). Never "fix" it by wrapping in `setTimeout` without understanding the cause.

`provideCheckNoChangesConfig({ exhaustive: true, interval })` (developer preview) can periodically verify that no
binding was updated without a notification ([docs](https://angular.dev/guide/zoneless#debug-mode-check-to-ensure-updates-are-detected)).

## 8. History: zone.js and NgZone

Before v21 (and today with `provideZoneChangeDetection()`):
- **zone.js** monkey-patches async browser APIs (events, `setTimeout`, XHR, Promises…). Angular's `NgZone` is notified
  when a task finishes and runs `ApplicationRef.tick()` → CD from the root
  ([docs](https://angular.dev/best-practices/zone-pollution)).
- It doesn't know **whether** state changed, so it triggers CD "more frequently than necessary"
  ([docs](https://angular.dev/guide/zoneless#why-use-zoneless)).
- **Zone pollution**: timers/3rd-party libraries triggering useless CD; fix with
  `ngZone.runOutsideAngular(() => …)` and re-enter with `ngZone.run(() => …)` when the UI must update
  ([docs](https://angular.dev/best-practices/zone-pollution), [API](https://angular.dev/api/core/NgZone)).
- Opt back into zones in v22: `provideZoneChangeDetection({ eventCoalescing: true })` + add `zone.js` to polyfills
  ([API](https://angular.dev/api/core/provideZoneChangeDetection)).

```ts
// Legacy syntax (still supported) — zone-based app
bootstrapApplication(App, { providers: [provideZoneChangeDetection({ eventCoalescing: true })] });

constructor() {
  const zone = inject(NgZone);
  zone.runOutsideAngular(() => setInterval(() => this.poll(), 500)); // no CD per tick
}
```

| | zone.js (legacy) | zoneless (v21+ default) |
| --- | --- | --- |
| What triggers CD | any patched async task | explicit notifications (§2) |
| `setTimeout(() => this.x++)` | rendered | **not** rendered (use a signal) |
| Bundle | + zone.js | smaller |
| `NgZone.onStable` | emits | never emits |
| Escape hatch | `runOutsideAngular` | not needed |

## 9. Testing and debugging

- TestBed is zoneless by default; prefer `await fixture.whenStable()` over `fixture.detectChanges()`; TestBed throws
  NG0100 if a template value changed without notification ([docs](https://angular.dev/guide/zoneless#using-zoneless-in-testbed)).
- `fixture.changeDetectorRef.markForCheck()` doesn't refresh an OnPush component's template (it belongs to the host
  view) ([docs](https://angular.dev/guide/zoneless#using-zoneless-in-testbed)).
- Angular DevTools' profiler shows each CD cycle and its source ([docs](https://angular.dev/tools/devtools)).

---

## 🎯 Likely interview questions

1. **What is the default change detection strategy in Angular 22?**
   <details><summary>Answer</summary>OnPush. The former "Default" is now <code>ChangeDetectionStrategy.Eager</code>; <code>Default</code> is a deprecated alias. (<a href="https://angular.dev/api/core/ChangeDetectionStrategy">docs</a>)</details>
2. **What triggers change detection in a zoneless app?**
   <details><summary>Answer</summary>markForCheck (incl. AsyncPipe), ComponentRef.setInput, a signal read in a template changing, template/host listeners, attaching a dirty view. (<a href="https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility">docs</a>)</details>
3. **When is an OnPush component checked?**
   <details><summary>Answer</summary>New input reference via template binding, an event in it or its children, a signal it reads changes, markForCheck/AsyncPipe. (<a href="https://angular.dev/best-practices/skipping-subtrees#using-onpush">docs</a>)</details>
4. **Why doesn't my OnPush child update when I push into an array input?**
   <details><summary>Answer</summary>Same reference → Object.is says unchanged. Pass a new array or use signals. (<a href="https://angular.dev/best-practices/skipping-subtrees#edge-cases">docs</a>)</details>
5. **markForCheck vs detectChanges?**
   <details><summary>Answer</summary>markForCheck marks the view and ancestors dirty and schedules CD; detectChanges synchronously checks this view and its children now. (<a href="https://angular.dev/api/core/ChangeDetectorRef">docs</a>)</details>
6. **What does detach() do?**
   <details><summary>Answer</summary>Removes the view from the CD tree; it's not checked even if dirty, until reattach(); combine with detectChanges() for manual local checks. (<a href="https://angular.dev/api/core/ChangeDetectorRef">docs</a>)</details>
7. **Explain ExpressionChangedAfterItHasBeenCheckedError.**
   <details><summary>Answer</summary>Dev-only extra check found a binding whose value changed after the pass — e.g. a child modifying parent state in ngAfterViewInit or a getter returning new values. Fix the data flow or use signals. (<a href="https://angular.dev/errors/NG0100">docs</a>)</details>
8. **What did zone.js do, and why remove it?**
   <details><summary>Answer</summary>Patched async APIs to trigger CD after every task without knowing if state changed; zoneless improves performance, payload, debugging and compatibility. (<a href="https://angular.dev/guide/zoneless#why-use-zoneless">docs</a>)</details>
9. **How do you use zone.js again in v22?**
   <details><summary>Answer</summary><code>provideZoneChangeDetection()</code> in the app providers (plus zone.js in polyfills). (<a href="https://angular.dev/api/core/provideZoneChangeDetection">docs</a>)</details>
10. **What is runOutsideAngular for?**
    <details><summary>Answer</summary>In zone apps, run code (timers, 3rd-party libs) without triggering CD; use ngZone.run to re-enter. Harmless in zoneless. (<a href="https://angular.dev/best-practices/zone-pollution">docs</a>)</details>

## 📚 References

- https://angular.dev/best-practices/runtime-performance
- https://angular.dev/best-practices/skipping-subtrees
- https://angular.dev/best-practices/zone-pollution
- https://angular.dev/guide/zoneless
- https://angular.dev/guide/signals
- https://angular.dev/guide/components/lifecycle
- https://angular.dev/api/core/ChangeDetectionStrategy
- https://angular.dev/api/core/ChangeDetectorRef
- https://angular.dev/api/core/ApplicationRef
- https://angular.dev/api/core/NgZone
- https://angular.dev/api/core/provideZoneChangeDetection
- https://angular.dev/errors/NG0100
- https://angular.dev/tools/devtools
