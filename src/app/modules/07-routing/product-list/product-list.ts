import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../data/products';

type SortKey = 'name' | 'price';

/**
 * Query params read with component input binding: `?sort=price` -> `sort` input,
 * `?missing=1` (set by the resolver redirect) -> `missing` input.
 * Unmatched inputs are set to `undefined`, so include it in the type.
 * Docs: https://angular.dev/guide/routing/common-router-tasks#add-an-input-to-the-component
 */
@Component({
  selector: 'app-product-list',
  imports: [RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export default class ProductList {
  readonly sort = input<string | undefined>();
  readonly missing = input<string | undefined>();

  private readonly products = inject(ProductService).all;

  protected readonly sortKey = computed<SortKey>(() => (this.sort() === 'price' ? 'price' : 'name'));
  protected readonly sorted = computed(() => {
    const key = this.sortKey();
    return [...this.products].sort((a, b) => (key === 'price' ? a.price - b.price : a.name.localeCompare(b.name)));
  });
}
