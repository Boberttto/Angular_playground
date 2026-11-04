# 07 · Routing — Exercises

Work in `src/app/sandbox/` (the sandbox page is routed at `/sandbox`). For exercises that need routes,
create a `sandbox.routes.ts` with child routes and temporarily point the `sandbox` entry of
`app.routes.ts` to it with `loadChildren` (revert afterwards), or test your routes with
`RouterTestingHarness` in a `*.spec.ts` file.

---

## Exercise 1 ⭐ — Master/detail with input binding

**Goal:** a list of 3 books and a detail page reading `:id` with an input.

- [ ] Routes: `books` (list) and `books/:id` (detail), both with `loadComponent`.
- [ ] The list uses relative `[routerLink]="[book.id]"` links and `routerLinkActive`.
- [ ] The detail component declares `id = input.required<string>()` and derives the book with `computed()`.
- [ ] A "Next book" link navigates to the next id **without** leaving the detail page.

**Where:** `src/app/sandbox/`

<details><summary>Hints</summary>

- `withComponentInputBinding()` is already enabled in `app.config.ts`.
- `[routerLink]="['..', nextId()]"` goes up one level then down to the next id.
- Param values are strings: `Number(this.id())`.
</details>

---

## Exercise 2 ⭐ — Query params for sorting and paging

**Goal:** keep list state in the URL.

- [ ] `?sort=title|year` and `?page=N` drive the list.
- [ ] Changing the sort keeps the current page (`queryParamsHandling: 'merge'`).
- [ ] Read both values as inputs with sensible defaults when the param is missing.

**Where:** `src/app/sandbox/`

<details><summary>Hints</summary>

- Missing query params bind as `undefined`: `page = input(1, { transform: (v: string | undefined) => Number(v ?? 1) })`.
- `router.navigate([], { relativeTo: route, queryParams: { sort }, queryParamsHandling: 'merge' })`.
</details>

---

## Exercise 3 ⭐⭐ — Role guard + unsaved changes

**Goal:** protect an `admin` route and an `edit` route.

- [ ] A `roleGuard(role: string): CanActivateFn` **factory** that checks a `UserStore` signal and
      redirects to `/sandbox/forbidden` with a `RedirectCommand` otherwise.
- [ ] An `edit` page with a text input; a `CanDeactivateFn` asks for confirmation if the text changed.
- [ ] Bonus: also warn on tab close with a `beforeunload` listener (`host: { '(window:beforeunload)': ... }`).

**Where:** `src/app/sandbox/`

<details><summary>Hints</summary>

- A guard factory is just `(role) => () => inject(UserStore).role() === role || new RedirectCommand(...)`.
- `CanDeactivateFn<T>` receives the component instance as first argument.
</details>

---

## Exercise 4 ⭐⭐ — Resolver with error handling + dynamic title

**Goal:** load a book before showing the detail page.

- [ ] `bookResolver: ResolveFn<Book>` with a 500 ms fake delay.
- [ ] Unknown id → redirect to the list with `?notFound=<id>` (no `NavigationError`).
- [ ] `title` is a `ResolveFn<string>` producing `"<book title> · Library"`.
- [ ] The detail page receives the book through an input named like the resolve key.

**Where:** `src/app/sandbox/`

<details><summary>Hints</summary>

- Call every `inject()` **before** the first `await`.
- A resolver may return `RedirectCommand` in v22.
</details>

---

## Exercise 5 ⭐⭐⭐ — Custom preloading strategy

**Goal:** preload only routes flagged `data: { preload: true }`, and prove it.

- [ ] Write `FlagPreloadingStrategy implements PreloadingStrategy`.
- [ ] Write a spec with `provideRouter(routes, withPreloading(FlagPreloadingStrategy))` that checks
      `preload()` calls `load()` only for flagged routes (unit test the class directly).
- [ ] Explain in a comment why you would NOT change `app.config.ts` of this playground to test it.

**Where:** `src/app/sandbox/`

<details><summary>Hints</summary>

- `preload(route, load)` returns `load()` to preload, `of(null)` to skip.
- Unit test: `new FlagPreloadingStrategy().preload({ data: { preload: true } }, () => of('loaded'))`.
</details>

---

## Exercise 6 ⭐⭐⭐ — Debugging challenge (explain out loud)

A colleague's product page shows the right product the first time, but after clicking "Next product"
the URL changes and **the page still shows the old product**. Their code:

```ts
export class ProductPage implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(ProductService);
  product?: Product;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.load(id).subscribe((p) => (this.product = p));
  }
}
```

- [ ] Explain **why** (name the router mechanism involved).
- [ ] Give two fixes (one with `ActivatedRoute`, one with input binding + signals).
- [ ] Name a second bug that appears in a zoneless + OnPush-by-default app with this code.

<details><summary>Hints</summary>

- What does `BaseRouteReuseStrategy.shouldReuseRoute` return for `/products/1` → `/products/2`?
- In v22 components are OnPush by default and apps are zoneless: what notifies Angular when a plain
  field is assigned inside a `subscribe`?
</details>
