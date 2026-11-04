# 07 · Routing — Solutions

All solutions use Angular 22 APIs (standalone, signals, functional guards). They were type-checked by
temporarily placing them in the module folder.

---

## Solution 1 — Master/detail with input binding

```ts
// sandbox/books.ts
export interface Book { readonly id: number; readonly title: string; readonly year: number; }
export const BOOKS: readonly Book[] = [
  { id: 1, title: 'Refactoring', year: 1999 },
  { id: 2, title: 'Clean Code', year: 2008 },
  { id: 3, title: 'DDD', year: 2003 },
];
```

```ts
// sandbox/sandbox.routes.ts
export default [
  { path: 'books', loadComponent: () => import('./book-list') },
  { path: 'books/:id', loadComponent: () => import('./book-detail') },
  { path: '', redirectTo: 'books', pathMatch: 'full' },
] satisfies Routes;
```

```ts
// sandbox/book-list.ts
@Component({
  selector: 'app-book-list',
  imports: [RouterLink, RouterLinkActive],
  template: `@for (b of books; track b.id) {
    <a [routerLink]="[b.id]" routerLinkActive="active">{{ b.title }}</a>
  }`,
})
export default class BookList {
  protected readonly books = BOOKS;
}
```

```ts
// sandbox/book-detail.ts
@Component({
  selector: 'app-book-detail',
  imports: [RouterLink],
  template: `<h3>{{ book()?.title ?? 'Unknown' }}</h3>
    <a [routerLink]="['..', nextId()]">Next book</a>`,
})
export default class BookDetail {
  readonly id = input.required<string>();
  protected readonly book = computed(() => BOOKS.find((b) => b.id === Number(this.id())));
  protected readonly nextId = computed(() => (Number(this.id()) % BOOKS.length) + 1);
}
```

**Why:** the router binds `:id` to the `id` input on **every** navigation, even when it reuses the
component, so the `computed()` re-evaluates. `'..'` is resolved relative to the detail route
(`/sandbox/books/1` → `/sandbox/books`), then the next id is appended.

---

## Solution 2 — Query params for sorting and paging

```ts
@Component({
  selector: 'app-sorted-books',
  imports: [RouterLink],
  template: `
    <a routerLink="." [queryParams]="{ sort: 'title' }" queryParamsHandling="merge">by title</a>
    <a routerLink="." [queryParams]="{ sort: 'year' }" queryParamsHandling="merge">by year</a>
    <button type="button" (click)="goToPage(page() + 1)">next page</button>
    <p>sort={{ sortKey() }} page={{ page() }}</p>`,
})
export default class SortedBooks {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Unmatched query params are bound as undefined -> default them.
  readonly sort = input<string | undefined>();
  readonly page = input(1, { transform: (v: string | undefined) => Number(v ?? 1) || 1 });

  protected readonly sortKey = computed(() => (this.sort() === 'year' ? 'year' : 'title'));

  protected goToPage(page: number): void {
    // [] + relativeTo = "current URL"; merge keeps ?sort
    this.router.navigate([], { relativeTo: this.route, queryParams: { page }, queryParamsHandling: 'merge' });
  }
}
```

**Why:** the URL is the single source of truth (shareable, back button works). `merge` keeps the other
query params; the default `replace` would drop `sort` when changing `page`.

---

## Solution 3 — Role guard + unsaved changes

```ts
@Injectable({ providedIn: 'root' })
export class UserStore {
  readonly role = signal<'guest' | 'admin'>('guest');
}

/** Guard FACTORY: returns a new CanActivateFn configured with a role. */
export function roleGuard(role: 'admin'): CanActivateFn {
  return () => {
    const store = inject(UserStore);
    const router = inject(Router);
    return store.role() === role || new RedirectCommand(router.parseUrl('/sandbox/forbidden'));
  };
}

export interface CanLeave { canLeave(): boolean; }
export const confirmLeaveGuard: CanDeactivateFn<CanLeave> = (c) =>
  c.canLeave() || window.confirm('Discard changes?');

@Component({
  selector: 'app-edit-page',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
  template: `<input [value]="text()" (input)="text.set(inputValue($event))" />`,
})
export default class EditPage implements CanLeave {
  private readonly initial = 'hello';
  protected readonly text = signal(this.initial);

  canLeave(): boolean {
    return this.text() === this.initial;
  }
  protected inputValue(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
  protected onBeforeUnload(e: BeforeUnloadEvent): void {
    if (!this.canLeave()) e.preventDefault(); // browser shows its own generic dialog
  }
}

// routes
// { path: 'admin', canActivate: [roleGuard('admin')], loadComponent: ... },
// { path: 'edit', canDeactivate: [confirmLeaveGuard], loadComponent: () => import('./edit-page') },
```

**Why:** a factory keeps guards reusable without classes. The guard reads a signal synchronously; the
`RedirectCommand` cancels the current navigation and starts a new one. `beforeunload` covers what
`CanDeactivate` can't (closing the tab, typing a URL).

---

## Solution 4 — Resolver with error handling + dynamic title

```ts
export const bookResolver: ResolveFn<Book> = async (route) => {
  const router = inject(Router); // before any await
  const id = Number(route.paramMap.get('id'));
  await new Promise((r) => setTimeout(r, 500));
  const book = BOOKS.find((b) => b.id === id);
  return book ?? new RedirectCommand(router.createUrlTree(['/sandbox/books'], { queryParams: { notFound: id } }));
};

export const bookTitle: ResolveFn<string> = (route) =>
  `${BOOKS.find((b) => b.id === Number(route.paramMap.get('id')))?.title ?? 'Book'} · Library`;

// { path: 'books/:id', resolve: { book: bookResolver }, title: bookTitle, loadComponent: () => import('./book-page') }

@Component({ selector: 'app-book-page', template: `<h3>{{ book().title }} ({{ book().year }})</h3>` })
export default class BookPage {
  readonly book = input.required<Book>(); // same name as the resolve key
}
```

**Why:** returning a `RedirectCommand` turns "not found" into a normal redirect instead of a
`NavigationError`. Resolved data has priority over params in input binding, and the title resolver keeps
`document.title` accessible.

---

## Solution 5 — Custom preloading strategy

```ts
@Injectable({ providedIn: 'root' })
export class FlagPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return route.data?.['preload'] === true ? load() : of(null);
  }
}
```

```ts
// flag-preloading.spec.ts
describe('FlagPreloadingStrategy', () => {
  const strategy = new FlagPreloadingStrategy();

  it('loads flagged routes', async () => {
    const load = vi.fn(() => of('loaded'));
    expect(await firstValueFrom(strategy.preload({ data: { preload: true } }, load))).toBe('loaded');
    expect(load).toHaveBeenCalledOnce();
  });

  it('skips other routes', async () => {
    const load = vi.fn(() => of('loaded'));
    expect(await firstValueFrom(strategy.preload({}, load))).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });
});
```

Registration (in a real app): `provideRouter(routes, withPreloading(FlagPreloadingStrategy))`.

**Why not change `app.config.ts` here?** It's shared by all modules; enabling preloading would also hide
the lazy-loading behaviour (`RouteConfigLoadStart` events) that the routing demo relies on.

---

## Solution 6 — Debugging challenge

1. **Why:** `/products/1` → `/products/2` matches the **same route config**, so the default
   `BaseRouteReuseStrategy` **reuses the component instance**. `ngOnInit` doesn't run again and the
   snapshot was read once → stale id. ([API](https://angular.dev/api/router/BaseRouteReuseStrategy))
2. **Fixes:**

   ```ts
   // a) ActivatedRoute observable + switchMap (cancels the previous request)
   protected readonly product = toSignal(
     this.route.paramMap.pipe(switchMap((p) => this.service.load(Number(p.get('id'))))),
   );

   // b) Input binding + rxResource (v22 stable): reloads whenever id() changes
   readonly id = input.required<string>();
   protected readonly product = rxResource({
     params: () => Number(this.id()),
     stream: ({ params }) => this.service.load(params),
   });
   ```

3. **Second bug:** in v22 components are OnPush by default and the app is zoneless. Assigning a **plain
   field** inside `subscribe` does not notify Angular, so the view may not update even on the first
   load. Signals (`toSignal`, `resource`, `signal.set`) mark the view for refresh
   ([zoneless guide](https://angular.dev/guide/zoneless)).
