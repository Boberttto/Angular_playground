import { Injectable, computed, signal } from '@angular/core';

export interface CartItem {
  readonly id: number;
  readonly name: string;
  readonly qty: number;
}

/**
 * Tiny signal store: private writable state, public read-only view.
 * Provided at component level in the demo (one store per demo instance).
 * Docs: https://angular.dev/guide/signals#converting-writable-signals-to-readonly
 */
@Injectable()
export class CartStore {
  private readonly _items = signal<readonly CartItem[]>([{ id: 1, name: 'Keyboard', qty: 1 }]);
  /** Consumers can read but not .set()/.update() (no compile-time access to the writable API). */
  readonly items = this._items.asReadonly();
  readonly totalQty = computed(() => this._items().reduce((sum, i) => sum + i.qty, 0));

  add(name: string): void {
    // Immutable update: a NEW array -> Object.is sees a change.
    this._items.update((list) => [...list, { id: Date.now(), name, qty: 1 }]);
  }

  increment(id: number): void {
    this._items.update((list) => list.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  }

  /** ⚠️ Anti-pattern on purpose: mutates in place, same reference -> no notification. */
  mutateInPlace(): void {
    const list = this._items() as CartItem[];
    list.push({ id: Date.now(), name: 'Mutated (invisible)', qty: 1 });
    // set() with the SAME reference: Object.is(old, new) === true -> ignored.
    this._items.set(list);
  }
}
