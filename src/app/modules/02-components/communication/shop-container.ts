import { Component, inject, viewChild } from '@angular/core';
import { CartStore } from './cart-store';
import { CartSummary } from './cart-summary';
import { PRODUCTS, Product } from './product';
import { ProductList } from './product-list';
import { Stopwatch } from './stopwatch';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/**
 * SMART ("container") component: owns state, talks to services, wires children together.
 * Shows the 3 classic parent↔child patterns:
 *   1. inputs down / outputs up  (ProductList)
 *   2. shared service            (CartStore provided here, used by CartSummary)
 *   3. viewChild() to call a child's public API (Stopwatch)
 */
@Component({
  selector: 'app-shop-container',
  imports: [ProductList, CartSummary, Stopwatch, LogPanel],
  providers: [CartStore],
  templateUrl: './shop-container.html',
  styleUrl: './shop-container.scss',
})
export class ShopContainer {
  protected readonly products = PRODUCTS;
  private readonly cart = inject(CartStore);
  protected readonly log = new EventLog();

  // Signal query: always up to date, no lifecycle hook needed. .required → never undefined.
  // Docs: https://angular.dev/api/core/viewChild
  private readonly stopwatch = viewChild.required(Stopwatch);

  protected onAdd(product: Product): void {
    this.log.add(`(addToCart) ${product.name} → parent calls CartStore.add()`, 'success');
    this.cart.add(product);
  }

  protected start(): void {
    this.stopwatch().start();
    this.log.add('parent → stopwatch().start() via viewChild');
  }

  protected stop(): void {
    this.stopwatch().stop();
    this.log.add(`parent read stopwatch().elapsed() = ${this.stopwatch().elapsed() / 10}s`);
  }

  protected reset(): void {
    this.stopwatch().reset();
  }
}
