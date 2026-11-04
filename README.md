# Angular Playground

A hands-on playground to practise **Angular 22** — from the very basics to advanced topics — and to
prepare for technical interviews. Every module has live demos, theory notes with links to the official
documentation, exercises, and separate solutions.

## Prerequisites

- **Node.js 24** (Angular 22 requires Node `^22.22.3 || ^24.15.0 || >=26`). With [nvm](https://github.com/nvm-sh/nvm):

  ```bash
  nvm install   # reads .nvmrc
  nvm use
  ```

## Getting started

```bash
npm install
npm start          # ng serve → http://localhost:4200
npm test           # unit tests (Vitest)
npm run build      # production build
npm run check-links  # verify every documentation URL still resolves
```

## What's inside

| #   | Module             | Topics                                                        |
| --- | ------------------ | ------------------------------------------------------------- |
| 01  | Basics             | Templates, bindings, events, `@if`/`@for`/`@switch`, `@let`, pipes |
| 02  | Components         | `input()`, `output()`, `model()`, content projection, queries, encapsulation |
| 03  | Lifecycle hooks    | Hook order, `afterNextRender`/`afterEveryRender`, `DestroyRef` |
| 04  | Signals            | `signal`, `computed`, `effect`, `linkedSignal`, `untracked`   |
| 05  | DI & services      | Providers, hierarchical injectors, `inject()`, service lifetime |
| 06  | RxJS               | Observables, Subjects, flattening operators, signals interop  |
| 07  | Routing            | Params, guards, resolvers, lazy loading                       |
| 08  | Forms              | Template-driven, reactive (typed), Signal Forms, CVA          |
| 09  | HTTP & resources   | `HttpClient`, interceptors, `resource()`, `httpResource()`    |
| 10  | Change detection   | OnPush (default in v22), `Eager`, zoneless                    |
| 11  | Directives & pipes | Attribute/structural directives, host bindings, pure/impure pipes |
| 12  | Advanced           | `@defer`, dynamic components, SSR/hydration, security, testing |

## Project structure

```
src/app/
  modules/NN-topic/     live demos for each module (lazy-loaded routes)
  shared/               reusable demo helpers (EventLog, LogPanel, DemoSection, PageHeader)
  sandbox/              👉 YOUR space to do the exercises (route /sandbox)
src/styles/             shared SCSS variables & mixins (@use 'variables' as v;)
docs/
  NN-topic/             theory.md · exercises.md · solutions.md
  interview/            Q&A bank, lifecycle cheat sheet, trick questions, what's new v17→v22
```

## Suggested learning path

See [`docs/README.md`](docs/README.md).

## Tech choices

- Angular 22 defaults: standalone components, **zoneless** change detection, **OnPush by default**, signals,
  built-in control flow, Vitest.
- TypeScript in strict mode (+ `strictTemplates`), SCSS for all styles.
