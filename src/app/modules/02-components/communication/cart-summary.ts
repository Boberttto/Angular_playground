import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartStore } from './cart-store';

/** Communicates through the shared service instead of inputs/outputs. */
@Component({
  selector: 'app-cart-summary',
  imports: [CurrencyPipe],
  template: `
    <p>🛒 {{ cart.items().length }} item(s) — total <strong>{{ cart.total() | currency }}</strong>
      <button type="button" class="secondary" (click)="cart.clear()">Empty</button></p>
  `,
})
export class CartSummary {
  protected readonly cart = inject(CartStore);
}
