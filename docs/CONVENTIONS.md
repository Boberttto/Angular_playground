# Angular Playground — conventions for module authors

Project root: this repository. These are the conventions used to build the playground — follow them when adding a module.
Goal: a learning playground for a developer preparing for Angular job interviews. Content must be
**accurate, verifiable, and in English**. The user will check every claim against the official docs.

## Environment
- Angular **22.2** (CLI 22.2.5), TypeScript 6 (strict), Vitest 5, **zoneless by default** (no zone.js).
- Node 24 via nvm. Before ANY npm/ng command run: `source ~/.nvm/nvm.sh >/dev/null && nvm use 24 >/dev/null`
- **NEVER run any git command.** Do not touch `.git/`.
- Do not edit files outside your assigned folders (other agents work in parallel). Shared files
  (`src/app/shared/**`, `src/styles/**`, `app.routes.ts`, `app.config.ts`, `modules.registry.ts`) are
  read-only for you — exception explicitly granted in your task, if any.
- Do NOT run `ng build` concurrently in a way that writes to `dist/`... it is fine to run
  `npx ng build --configuration development` — just tolerate errors coming from OTHER modules' folders (not yours).
  Prefer `npx tsc -p tsconfig.app.json --noEmit` for quick type checks, then `ng build` at the end.

## Verified Angular 22 facts (from node_modules d.ts) — rely on these
- `ChangeDetectionStrategy.OnPush` is now the **default**. `ChangeDetectionStrategy.Eager` = old "Default"
  (`Default` is deprecated alias of `Eager`). So components are OnPush unless they say `Eager`.
- Standalone is default (no `standalone: true` needed). No NgModules in this project.
- Stable (`@publicApi 22.0`): `resource()` (option `params`, not `request`), `rxResource()`, `httpResource()`,
  Signal Forms in `@angular/forms/signals` (`form()`, `FormField` directive with selector `[formField]`,
  `FormRoot` with selector `form[formRoot]`, validators `required/email/minLength/min/max/pattern/validate/validateAsync/validateHttp`, `submit()`, `disabled()`, `hidden()`, `readonly()`, `debounce()`, `applyEach`, `schema`).
- `linkedSignal`, `afterEveryRender`, `afterNextRender` are stable since 20. `afterRender` no longer exists (renamed `afterEveryRender`).
- `provideZonelessChangeDetection()` exists but zoneless is the default; `provideZoneChangeDetection()` opts back into zone.js.
- `provideAppInitializer()`, `provideEnvironmentInitializer()` exist. `takeUntilDestroyed`, `toSignal`, `toObservable`, `outputFromObservable`, `outputToObservable` in `@angular/core/rxjs-interop`.
- When unsure about an API, CHECK the real typings: `grep -rn "<name>" node_modules/@angular/<pkg>/types/`.
  Do not invent APIs. If a newer API exists, show it, and mention the legacy equivalent (interviews ask both).

## Verifying documentation links
- Every `https://angular.dev/...` URL you write MUST be verified. angular.dev returns HTTP 200 even for missing
  pages but the title becomes "Home • Angular". Check with:
  `curl -sL <url> | grep -o '<title>[^<]*' | head -1` → must NOT be `Home • Angular`.
  The prerendered HTML contains the page text, so you can also read docs this way to confirm claims.
- Anchors (`#section`) are fine but the base page must exist.
- Other allowed sources: rxjs.dev, developer.mozilla.org, typescriptlang.org, blog.angular.dev, github.com/angular/angular.
- If a statement cannot be confirmed by a source, mark it `> ⚠️ Not confirmed by official docs / opinion:`.

## Code conventions (src/app/modules/<NN-folder>/)
- Each module already has a lazy routes file `<path>.routes.ts` (default export `Routes`) and a placeholder
  `<path>-page.ts` (default export component class). Replace the placeholder; you may add child routes.
- Page component: `templateUrl` + `styleUrl` in separate `.html` / `.scss` files (no inline templates except tiny child demo components ≤ 10 lines of template, which may use inline `template`).
- Split demos into small components in subfolders, e.g. `modules/03-lifecycle/hook-logger/hook-logger.ts|html|scss`.
- Use modern APIs: `input()`, `output()`, `model()`, `viewChild()`, `inject()`, signals, `@if/@for/@switch/@defer`.
  Mention legacy APIs (`@Input`, `*ngIf`, constructor injection) in docs and, where useful for interviews, show
  a small legacy example clearly labelled `// Legacy syntax (still supported)`.
- File naming follows Angular v20+ style guide: `user-card.ts` with class `UserCard` (no `.component` suffix).
- Comments in **English**, short, explaining the WHY, with a `// Docs: https://angular.dev/...` link above each concept.
- Results must be visible ON SCREEN. Use the shared helpers:
  - `EventLog` (`src/app/shared/event-log.ts`): `log = new EventLog(); log.add(msg, kind)`; `addDeferred()` from lifecycle hooks.
  - `<app-log-panel [entries]="log.entries()" (cleared)="log.clear()" title="..."/>` (`shared/log-panel/log-panel.ts`, class `LogPanel`)
  - `<app-demo-section heading="..." docs="https://angular.dev/...">...</app-demo-section>` (`shared/demo-section/demo-section.ts`, class `DemoSection`)
  - `<app-page-header heading="03 · Lifecycle hooks" docsFolder="03-lifecycle">intro text</app-page-header>` (`shared/page-header/page-header.ts`, class `PageHeader`)
- SCSS: `@use 'variables' as v;` and `@use 'mixins' as m;` (mixins: `card`, `flex-row($gap)`, `flex-col($gap)`, `mono-box`). Global classes available: `.row`, `.col`, `.muted`, `.error`, `button.secondary`. Keep component styles small (budget 6kB).
- No external npm dependencies. Mock data: local TS arrays or JSON files in `public/mock/` (served at `/mock/...`).
- Strict TypeScript: no `any`, no non-null `!` unless justified.
- Optional: one `*.spec.ts` per module for something worth testing (Vitest globals `describe/it/expect` + TestBed). Module 12 must have several.

## Docs conventions (docs/<NN-folder>/)
Three files per module, all English, GitHub-flavoured Markdown:
1. `theory.md`
   - `# NN · Title`, short intro, table of contents.
   - Sections per concept: explanation, small code snippet, "💡 Interview tip" callouts (`> 💡 **Interview tip:** ...`),
     "⚠️ Pitfall" callouts, and a link to where the concept is demoed in code (relative link, e.g. ``[demo](../../src/app/modules/03-lifecycle/hook-logger/hook-logger.ts)``).
   - Inline source links after important claims: `([docs](https://angular.dev/...))`.
   - Ends with `## 🎯 Likely interview questions` (5-10 short Q with 1-3 line answers in `<details><summary>Answer</summary>...</details>`, each with a source link)
     and `## 📚 References` (bullet list of every URL used).
2. `exercises.md` — 4-6 exercises graded ⭐ / ⭐⭐ / ⭐⭐⭐, each with: goal, requirements checklist, hints (in `<details>`), "where": `src/app/sandbox/`. Last exercise should be interview-style ("explain out loud..." or a debugging challenge).
3. `solutions.md` — full solution for each exercise (code + explanation of why), numbered to match. Solutions must compile with Angular 22 (mentally check against the real API; test-compile non-trivial ones by temporarily placing them in your module folder if needed, then remove).

## Definition of done
- `npx tsc -p tsconfig.app.json --noEmit` shows no errors in your files.
- All URLs you wrote pass the title check.
- Report back: list of files created, any facts you could NOT verify, and any API surprises discovered.

## ADDENDUM — extra verified Angular 22 facts (apply them)
- `withFetch()` is **@deprecated** in v22: FetchBackend is the default HttpBackend; `withXhr()` opts into XHR. app.config.ts no longer uses withFetch().
- HttpClient can be injected without `provideHttpClient()` since v21 (see angular.dev/guide/http/setup); provideHttpClient is still used to add interceptors/features.
- Route-level `providers` (route environment injector) are **NOT destroyed when navigating away** unless the router is configured with `withAutoCleanupInjectors()` (`@publicApi 22.2`, in @angular/router). Do not claim otherwise.
- Router `paramsInheritanceStrategy` defaults to `'always'` in v22.
- `ngDoCheck` runs even when an OnPush component is skipped (it is called by the parent's check).
- Directives also get ngAfterViewInit/ngAfterViewChecked.
- New in v22 (verify before using): `@Service()` decorator, `injectAsync()`; `debounced()` is @experimental.
- Incremental hydration is on by default in v22 (`withNoIncrementalHydration()` to opt out).
- `ComponentFactoryResolver` is removed in v22.
