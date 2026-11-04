import { Injectable, computed, signal } from '@angular/core';
import { Product } from './product';

/**
 * Shared state for siblings that are not parent/child.
 * NOT providedIn: 'root' on purpose: ShopContainer provides it, so each container instance
 * gets its own store, shared by all its descendants (hierarchical DI).
 * Docs: https://angular.dev/guide/di/hierarchical-dependency-injection
 */
@Injectable()
export class CartStore {
  private readonly _items = signal<readonly Product[]>([]);
  readonly items = this._items.asReadonly();
  readonly total = computed(() => this._items().reduce((sum, p) => sum + p.price, 0));

  add(product: Product): void {
    this._items.update((list) => [...list, product]);
  }

  clear(): void {
    this._items.set([]);
  }
}
