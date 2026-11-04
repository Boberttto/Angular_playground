import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Product } from '../data/products';

let instanceCount = 0;

/**
 * Three ways to read the same `:id` param, side by side.
 * Docs: https://angular.dev/guide/routing/read-route-state
 */
@Component({
  selector: 'app-product-detail',
  imports: [RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export default class ProductDetail {
  // 1) Component input binding (withComponentInputBinding() in app.config.ts).
  //    The input name must match the param / query param / data key.
  readonly id = input.required<string>();
  readonly product = input.required<Product>(); // resolved data (resolve: { product })
  readonly section = input<string>(); // static route data (data: { section })
  readonly from = input<string>(); // query param ?from=legacy (set by the function redirect)

  private readonly route = inject(ActivatedRoute);

  // 2) Observable API: emits on every navigation that changes the param, even if
  //    the component instance is reused.
  protected readonly idFromParamMap = toSignal(this.route.paramMap.pipe(map((p) => p.get('id'))));
  protected readonly fragment = toSignal(this.route.fragment);

  // 3) Snapshot: read ONCE here. If the router reuses this instance (same route config,
  //    only the param changes: /products/1 -> /products/2), this value becomes stale.
  protected readonly idFromSnapshot = this.route.snapshot.paramMap.get('id');

  /** Increments only when Angular creates a NEW instance — proves the reuse. */
  protected readonly instanceNo = ++instanceCount;

  protected readonly nextId = computed(() => (Number(this.id()) % 4) + 1);
}
