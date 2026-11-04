import { Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Product } from './product';

/**
 * PRESENTATIONAL ("dumb") component: data in via inputs, events out via outputs.
 * No injected services → trivially reusable and testable.
 */
@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe],
  template: `
    <ul>
      @for (p of products(); track p.id) {
        <li>{{ p.name }} — {{ p.price | currency }} <button type="button" (click)="addToCart.emit(p)">Add</button></li>
      }
    </ul>
  `,
})
export class ProductList {
  readonly products = input.required<readonly Product[]>();
  readonly addToCart = output<Product>();
}
