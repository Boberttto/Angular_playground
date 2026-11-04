# 11 · Directives & pipes — solutions

Every solution was compiled with strict template type checking and tested in a temporary TestBed spec
(Angular 22.2): autofocus, click-outside, role switching, file sizes, and host-directive order were all
asserted.

---

## Solution 1 — `appAutofocus`

```ts
import { Directive, ElementRef, afterNextRender, booleanAttribute, inject, input } from '@angular/core';

@Directive({ selector: '[appAutofocus]' })
export class Autofocus {
  readonly enabled = input(true, { alias: 'appAutofocus', transform: booleanAttribute });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Runs once, after Angular rendered the DOM (never on the server).
    afterNextRender(() => {
      if (this.enabled()) this.el.nativeElement.focus();
    });
  }
}
```

**Why:**
- The input is aliased to the selector name so `appAutofocus` (bare) and `[appAutofocus]="false"` both
  work; `booleanAttribute` turns the bare attribute `''` into `true`.
- `afterNextRender` is the documented place for DOM work: the element exists, and it never runs during
  SSR. Calling `focus()` in the constructor would run before the element is attached/rendered.
- Docs: [DOM APIs](https://angular.dev/guide/components/dom-apis).

---

## Solution 2 — `appClickOutside`

```ts
import { Component, Directive, ElementRef, HostListener, inject, output, signal } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class ClickOutside {
  readonly appClickOutside = output<MouseEvent>();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.appClickOutside.emit(event);
    }
  }
}

// Legacy syntax (still supported)
@Directive({ selector: '[appLegacyClickOutside]' })
export class LegacyClickOutside {
  readonly appLegacyClickOutside = output<MouseEvent>();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) this.appLegacyClickOutside.emit(event);
  }
}

@Component({
  selector: 'app-dropdown-demo',
  imports: [ClickOutside],
  template: `
    <div class="dropdown" (appClickOutside)="open.set(false)">
      <button type="button" (click)="open.set(!open())">Menu</button>
      @if (open()) { <ul class="menu"><li>Profile</li><li>Logout</li></ul> }
    </div>
    <p id="outside">outside</p>
  `,
})
export class DropdownDemo {
  readonly open = signal(false);
}
```

**Why:**
- `'(document:click)'` is a host listener on a **global target** — Angular adds and removes the
  listener with the directive's lifecycle, no manual cleanup.
- Naming the output like the selector lets `(appClickOutside)="…"` both apply the directive and listen
  (bound outputs also take part in selector matching — the spec confirms it).
- The legacy version is identical in behaviour; the docs recommend `host`.

---

## Solution 3 — `*appHasRole` with `else`

```ts
import { Component, Directive, Injectable, TemplateRef, ViewContainerRef, effect, inject, input, signal, untracked } from '@angular/core';

export type Role = 'guest' | 'user' | 'admin';

@Injectable({ providedIn: 'root' })
export class RoleService {
  readonly role = signal<Role>('guest');
}

@Directive({ selector: '[appHasRole]' })
export class HasRole {
  readonly appHasRole = input.required<Role>();
  readonly appHasRoleElse = input<TemplateRef<unknown> | null>(null);

  private readonly templateRef = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly roles = inject(RoleService);

  constructor() {
    effect(() => {
      const allowed = this.roles.role() === this.appHasRole();
      const elseTpl = this.appHasRoleElse();
      untracked(() => {
        this.vcr.clear();
        if (allowed) this.vcr.createEmbeddedView(this.templateRef);
        else if (elseTpl) this.vcr.createEmbeddedView(elseTpl);
      });
    });
  }
}

@Component({
  selector: 'app-has-role-demo',
  imports: [HasRole],
  template: `
    <select (change)="roles.role.set($any($event.target).value)">
      <option>guest</option><option>user</option><option>admin</option>
    </select>
    <button *appHasRole="'admin'; else denied" type="button">Delete</button>
    <ng-template #denied><em>Admins only</em></ng-template>

    <!-- Desugared: 'else denied' → [appHasRoleElse]="denied" -->
    <ng-template [appHasRole]="'admin'" [appHasRoleElse]="denied">
      <button type="button">Delete (desugared)</button>
    </ng-template>
  `,
})
export class HasRoleDemo {
  protected readonly roles = inject(RoleService);
}
```

**Why:**
- Microsyntax: `*appHasRole="'admin'; else denied"` → `[appHasRole]="'admin'" [appHasRoleElse]="denied"`
  (the key `else` is PascalCased and prefixed with the selector).
- The `effect` reads the role signal **and** both inputs, so the view updates when any of them changes;
  `untracked` prevents view creation from adding dependencies.
- `vcr.clear()` before creating the next view keeps exactly one rendered branch.

---

## Solution 4 — `fileSize` pipe

```ts
import { Component, Injectable, Pipe, PipeTransform, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';

export type SizeMode = 'binary' | 'si';

export function formatFileSize(bytes: number, decimals = 1, mode: SizeMode = 'binary'): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const base = mode === 'si' ? 1000 : 1024;
  const units = mode === 'si' ? ['B', 'kB', 'MB', 'GB', 'TB'] : ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(base)));
  return `${Number((bytes / base ** i).toFixed(decimals))} ${units[i]}`;
}

@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  transform(bytes: number | null | undefined, decimals = 1, mode: SizeMode = 'binary'): string {
    return formatFileSize(bytes ?? 0, decimals, mode);
  }
}

/** Reuses the function, NOT the pipe class. */
@Injectable({ providedIn: 'root' })
export class UploadMessages {
  tooBig(bytes: number): string {
    return `File too big (${formatFileSize(bytes)})`;
  }
}

@Component({
  selector: 'app-file-size-demo',
  imports: [FileSizePipe, UpperCasePipe],
  template: `
    <p id="a">{{ 1536 | fileSize }}</p>
    <p id="b">{{ 1048576 | fileSize: 0 }}</p>
    <p id="c">{{ 0 | fileSize }}</p>
    <p id="d">{{ 1500 | fileSize: 1 : 'si' }}</p>
    <p id="e">{{ 1536 | fileSize | uppercase }}</p>
    <p id="f">{{ messages.tooBig(5000000) }}</p>
  `,
})
export class FileSizeDemo {
  protected readonly messages = inject(UploadMessages);
}
```

**Why:**
- Pure: the output depends only on `(bytes, decimals, mode)`, so Angular can skip `transform` when
  none of them changed — the whole point of a pipe.
- The logic is a plain function reused by `UploadMessages`; injecting the pipe class into a service is
  discouraged by the docs ([pipes](https://angular.dev/guide/templates/pipes#using-pipe-logic-outside-templates)).
- Chaining `| fileSize | uppercase` applies left to right.

---

## Solution 5 — `hostDirectives` composition

```ts
import { Component, Directive, booleanAttribute, inject, input, output } from '@angular/core';

export const constructionOrder: string[] = [];

@Directive({
  selector: '[appDisableable]',
  host: {
    '[attr.aria-disabled]': 'disabled()',
    '[class.is-disabled]': 'disabled()',
    '[attr.tabindex]': 'disabled() ? -1 : 0',
  },
})
export class Disableable {
  readonly disabled = input(false, { transform: booleanAttribute });
  constructor() {
    constructionOrder.push('Disableable');
  }
}

@Directive({
  selector: '[appClickTracker]',
  host: { '(click)': 'track()' },
})
export class ClickTracker {
  readonly trackId = input('');
  readonly tracked = output<string>();
  private readonly disableable = inject(Disableable, { optional: true });

  constructor() {
    constructionOrder.push('ClickTracker');
  }

  protected track(): void {
    if (this.disableable?.disabled()) return;
    this.tracked.emit(this.trackId());
  }
}

@Component({
  selector: 'app-action-button',
  hostDirectives: [
    { directive: Disableable, inputs: ['disabled'] },
    { directive: ClickTracker, inputs: ['trackId'], outputs: ['tracked'] },
  ],
  host: { role: 'button' },
  template: `<ng-content />`,
})
export class ActionButton {
  constructor() {
    constructionOrder.push('ActionButton');
  }
}

@Component({
  selector: 'app-action-button-demo',
  imports: [ActionButton],
  template: `
    <app-action-button trackId="save" (tracked)="last = $event">Save</app-action-button>
    <app-action-button trackId="delete" disabled (tracked)="last = $event">Delete</app-action-button>
    <p id="last">{{ last }}</p>
  `,
})
export class ActionButtonDemo {
  last = '';
}
```

**Why:**
- The spec asserted the construction order **Disableable → ClickTracker → ActionButton**: host
  directives are created before their host component, as documented
  ([directive execution order](https://angular.dev/guide/directives/directive-composition-api#directive-execution-order)).
- `ClickTracker` injects `Disableable` from the same element injector (`optional` keeps it reusable on its own).
- Only the listed inputs/outputs become part of `<app-action-button>`'s API.

---

## Solution 6 — Debugging challenge

Fixed version:

```ts
import { Component, Pipe, PipeTransform, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Order {
  readonly id: number;
  readonly customer: string;
  readonly amount: number;
  readonly visible: boolean;
}

/** Splits a text around the search term — the template renders <mark> safely (no innerHTML). */
@Pipe({ name: 'highlightParts' })
export class HighlightPartsPipe implements PipeTransform {
  transform(text: string, term: string): { text: string; match: boolean }[] {
    if (!term) return [{ text, match: false }];
    return text
      .split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'))
      .filter((part) => part !== '')
      .map((part) => ({ text: part, match: part.toLowerCase() === term.toLowerCase() }));
  }
}

@Component({
  selector: 'app-orders',
  imports: [FormsModule, HighlightPartsPipe],
  template: `
    <input [(ngModel)]="search" />
    <p>Total: {{ total() }}</p>
    <ul>
      @for (o of filtered(); track o.id) {
        <li>
          @for (part of o.customer | highlightParts: search(); track $index) {
            @if (part.match) { <mark>{{ part.text }}</mark> } @else { {{ part.text }} }
          }
        </li>
      }
    </ul>
  `,
})
export class Orders {
  protected readonly search = signal('');
  protected readonly orders = signal<readonly Order[]>(
    Array.from({ length: 5000 }, (_, i) => ({ id: i, customer: `Customer ${i}`, amount: i % 100, visible: i % 3 !== 0 })),
  );
  protected readonly filtered = computed(() => {
    const term = this.search().toLowerCase();
    return this.orders().filter((o) => o.visible && o.customer.toLowerCase().includes(term));
  });
  protected readonly total = computed(() => this.orders().reduce((sum, o) => sum + o.amount, 0));
}
```

| # | Problem | Why it hurts | Fix |
| --- | --- | --- | --- |
| 1 | `filterBy` is **impure** and returns a **new array** each call | runs on every check over 5 000 items, and `*ngFor` receives a new array each time | filter in a `computed()` (or a pure pipe with immutable data) |
| 2 | `{{ computeTotal(orders) }}` | a template method runs on every check | `computed()` |
| 3 | `*ngFor` and `*ngIf` on the same `<li>` | compile error: one structural directive per element | filter `visible` in the computed, or nest with `<ng-container>` / `@for` + `@if` |
| 4 | `innerHTML` built from user input | XSS: the search text is injected as HTML; also fights with Angular's own text binding | render `<mark>` from the template (pipe returning parts) — Angular escapes text |
| 5 | `ngOnChanges` + `nativeElement` mutation | DOM changed behind Angular's back; breaks hydration | declarative template |
| 6 | no tracking / `*ngFor` without `trackBy` | identity tracking on re-filtered data | `@for … track o.id` |

References: [pipes](https://angular.dev/guide/templates/pipes#change-detection-with-pipes),
[structural directives](https://angular.dev/guide/directives/structural-directives#one-structural-directive-per-element),
[DOM APIs](https://angular.dev/guide/components/dom-apis), [security](https://angular.dev/best-practices/security).
