# 12 · Advanced — Exercises

Work in `src/app/sandbox/`. Spec files you write there are picked up by `npx ng test --watch=false`.

---

## Exercise 1 ⭐ — A deferred comments section

**Goal:** defer a `CommentsList` component until it is visible, prefetching it when the browser is idle.

- [ ] `@defer (on viewport; prefetch on idle)` with a `@placeholder` that has the same height as the content.
- [ ] `@loading (after 150ms; minimum 500ms)` with a skeleton.
- [ ] `@error` block.
- [ ] Verify in DevTools › Network (run `ng serve --no-hmr`) that the chunk is fetched before you scroll.

<details><summary>Hints</summary>

- The viewport trigger observes the placeholder: it needs a single root element.
- Don't import `CommentsList` anywhere else in the same file (no `viewChild(CommentsList)`), or it stays eager.
</details>

---

## Exercise 2 ⭐ — Test a pipe and a signal service

**Goal:** write two spec files.

- [ ] `InitialsPipe` (`'Ada Lovelace' → 'AL'`) tested without TestBed (3 cases incl. empty string).
- [ ] `CartStore` with `items = signal<Item[]>`, `total = computed(...)`, `add()`: test via `TestBed.inject`.
- [ ] One test with an `effect()` that records `total()` values, flushed with `TestBed.tick()`.

<details><summary>Hints</summary>

- `effect()` needs `TestBed.runInInjectionContext(() => effect(...))`.
- Effects don't run synchronously: tick before asserting.
</details>

---

## Exercise 3 ⭐⭐ — Toast service with dynamic components

**Goal:** a `ToastService.show(message, kind)` that renders a `Toast` component dynamically.

- [ ] A `ToastHost` component with `<ng-container #outlet />` registers its `ViewContainerRef` in the service.
- [ ] `show()` uses `createComponent(Toast, { bindings: [inputBinding(...), outputBinding('dismissed', ...)] })`.
- [ ] Toasts auto-dismiss after 3 s (`ref.destroy()`), and on click.
- [ ] Bonus: write a spec checking that two calls render two toasts and a click removes one.

<details><summary>Hints</summary>

- Store the `ViewContainerRef` in a `signal<ViewContainerRef | null>` in the service.
- `inputBinding('message', () => message)` works with a plain getter too.
</details>

---

## Exercise 4 ⭐⭐ — Data table with a projected row template

**Goal:** a generic `DataTable<T>` whose rows are rendered by the parent.

- [ ] Inputs: `rows = input.required<readonly T[]>()`.
- [ ] Parent projects `<ng-template #row let-item let-i="index">` and a header via `<ng-content select="[table-header]">`.
- [ ] Empty state: fallback content inside `<ng-content select="[table-empty]">No data</ng-content>` when `rows()` is empty.
- [ ] Explain in a comment why `ng-template` is needed for rows but not for the header.

<details><summary>Hints</summary>

- `contentChild<TemplateRef<RowContext<T>>>('row')` reads a template by reference name.
- Projected content is created once; a row template must be stamped N times.
</details>

---

## Exercise 5 ⭐⭐⭐ — Test a component with a mocked HTTP-like service and @defer

**Goal:** `UserCard` injects `UserApi` (returns `Promise<User>`) and shows details inside `@defer (on interaction)`.

- [ ] Spec 1: mock `UserApi` with `{ provide: UserApi, useValue: { load: vi.fn(...) } }`, set the `id` input
      with `setInput`, `await whenStable()`, check the name renders.
- [ ] Spec 2: `deferBlockBehavior: DeferBlockBehavior.Manual`, assert the placeholder, then
      `render(DeferBlockState.Complete)` and assert the details.
- [ ] Use a `resource()` for loading and explain why `whenStable()` waits for it.

<details><summary>Hints</summary>

- `resource({ params: () => this.id(), loader: ({ params }) => this.api.load(params) })`.
- `fixture.getDeferBlocks()` returns blocks in template order.
</details>

---

## Exercise 6 ⭐⭐⭐ — Interview: explain out loud / debug

1. A teammate binds `[innerHTML]="userBio"` and sees `onclick` attributes disappear, so they wrap it in
   `bypassSecurityTrustHtml`. Explain the risk and a safe alternative.
2. A component reads `window.innerWidth` in its constructor; the team is adding SSR. What breaks, and what
   do you change?
3. A test using `fakeAsync(() => { ...; tick(1000); })` fails after migrating to Vitest. Why, and how do you
   rewrite it?
4. After enabling SSR, a hero image is the LCP element and the score is bad. Name two Angular features to fix it.
