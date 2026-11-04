import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { Product, ProductService } from '../data/products';

/**
 * Functional resolver: navigation waits for the Promise, then the value is exposed in
 * `ActivatedRoute.data` under the key used in `resolve: { product: ... }` — and, thanks to
 * withComponentInputBinding(), bound to an input named `product`.
 * Docs: https://angular.dev/guide/routing/data-resolvers
 */
export const productResolver: ResolveFn<Product> = async (route) => {
  // inject() only works synchronously in the injection context -> call it BEFORE any await.
  const router = inject(Router);
  const products = inject(ProductService);
  const product = await products.getById(Number(route.paramMap.get('id')));
  // Unknown id -> redirect instead of rendering an empty page.
  return product ?? new RedirectCommand(router.parseUrl('/routing/products?missing=1'));
};

/**
 * A route `title` can be a ResolveFn<string> -> dynamic document.title.
 * Docs: https://angular.dev/guide/routing/define-routes#page-titles
 */
export const productTitleResolver: ResolveFn<string> = (route) => {
  const name = inject(ProductService).nameOf(Number(route.paramMap.get('id')));
  return name ? `${name} · Routing` : 'Product · Routing';
};
