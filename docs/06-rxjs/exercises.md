# 06 · RxJS — Exercises

Work in [`src/app/sandbox/`](../../src/app/sandbox/) (route `/sandbox`). Solutions: [solutions.md](./solutions.md).
Show results **on screen** (`EventLog` + `<app-log-panel>` from `src/app/shared/`).

---

## Exercise 1 ⭐ — Your first Observable and pipe

**Goal:** understand laziness, teardown, and basic operators.

**Requirements**
- [ ] Write a `countdown$ = new Observable<number>(subscriber => …)` that emits 3, 2, 1, 0 every 500 ms then completes; its teardown function clears the interval and logs `teardown`.
- [ ] Log `producer started` inside the producer: verify nothing is logged before you click **Start** (laziness).
- [ ] On the same click, build `interval(200)` → keep even indexes → multiply by 10 → take 5 values; log each value and the completion.
- [ ] Clean both subscriptions up if the component is destroyed.

<details><summary>Hints</summary>

- `filter`, `map`, `take` from `rxjs`.
- Outside an injection context: `takeUntilDestroyed(this.destroyRef)` with `destroyRef = inject(DestroyRef)`.
</details>

---

## Exercise 2 ⭐ — BehaviorSubject store → signal store

**Goal:** know the classic "service with a BehaviorSubject" pattern and its modern signal equivalent.

**Requirements**
- [ ] `CartStoreRx`: private `BehaviorSubject<readonly CartItem[]>`, public read-only `items$`, derived `total$`, `add()`, `remove()`.
- [ ] `CartStore`: the same with `signal`, `asReadonly()`, `computed` — plus an `items$` for RxJS consumers.
- [ ] Display both in a component (async pipe for the first, signals for the second).

<details><summary>Hints</summary>

- `subject.asObservable()` hides `next()`.
- `toObservable()` from `@angular/core/rxjs-interop` (field initializer = injection context).
</details>

---

## Exercise 3 ⭐⭐ — A robust search box

**Goal:** the typeahead every interviewer asks for.

**Requirements**
- [ ] A `signal` for the term, updated on `(input)`.
- [ ] Pipeline: trim + lowercase → `debounceTime(250)` → `distinctUntilChanged()` → ignore < 2 chars → `switchMap` to a fake `searchCountries(term)` with a **random** delay.
- [ ] The fake API fails for the term `xx`: show the error, and prove the search still works afterwards.
- [ ] Expose the result as a signal with `toSignal`.

<details><summary>Hints</summary>

- Random delays + `mergeMap` would show stale results; `switchMap` cancels them.
- Where does `catchError` go so that one failure doesn't kill the stream?
</details>

---

## Exercise 4 ⭐⭐ — Pick the right flattening operator

**Goal:** apply concurrency policies to writes.

**Requirements**
- [ ] A **Submit** button: double/triple-clicking during a 1 s fake save must send **one** save.
- [ ] An **Autosave** button that emits `v1`, `v2`, `v3`…: every version must be saved, **in order**, never in parallel.
- [ ] Log every save result. Justify your operator choices in a comment.

<details><summary>Hints</summary>

- Drive each button with a `Subject` subscribed in the constructor.
- Why not `switchMap` for saves?
</details>

---

## Exercise 5 ⭐⭐⭐ — Live dashboard with combination + polling

**Goal:** combine streams with different rhythms and expose them as signals.

**Requirements**
- [ ] `prices$`: polls every 2 s (`timer(0, 2000)`), each poll is a fake 300 ms request (use `switchMap`).
- [ ] `rate$`: a currency rate refreshed every 5 s.
- [ ] Display prices converted with the latest rate; it must update when **either** changes.
- [ ] The converted list must be a signal with **no `undefined`** in its type.
- [ ] Count and display the number of price refreshes.

<details><summary>Hints</summary>

- `combineLatest([prices$, rate$])`.
- `toSignal(obs$, { requireSync: true })` requires a synchronous first value: `startWith(...)`.
</details>

---

## Exercise 6 🎤 — Interview: spot the bugs

Explain out loud **every** problem in this component, then rewrite it.

```ts
@Component({ selector: 'app-user-search', template: `…` })
export class UserSearch implements OnInit {
  private http = inject(HttpClient);
  term$ = new Subject<string>();
  users: User[] = [];

  ngOnInit() {
    this.term$
      .pipe(
        takeUntilDestroyed(),
        debounceTime(300),
        mergeMap((t) => this.http.get<User[]>(`/api/users?q=${t}`)),
        catchError(() => of([])),
      )
      .subscribe((users) => {
        this.users = users;
        this.http.get(`/api/audit?q=${users.length}`).subscribe();
      });
  }
}
```

<details><summary>Hints</summary>

There are at least 7 issues: injection context, operator order, concurrency policy, error placement,
nested subscribe, change detection (OnPush default in v22, zoneless), URL encoding.
</details>
