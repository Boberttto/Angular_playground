import { Injectable } from '@angular/core';

export interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
  readonly description: string;
}

/** Local mock data — no HTTP needed for routing demos. */
const PRODUCTS: readonly Product[] = [
  { id: 1, name: 'Mechanical keyboard', price: 129, description: 'Clicky and loud.' },
  { id: 2, name: 'Ultrawide monitor', price: 499, description: '34 inches of tabs.' },
  { id: 3, name: 'Ergonomic mouse', price: 79, description: 'Your wrist says thanks.' },
  { id: 4, name: 'USB-C dock', price: 189, description: 'One cable to rule them all.' },
];

/**
 * Fake async data source used by the resolver.
 * The artificial delay makes ResolveStart / ResolveEnd visible in the router events log.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  readonly all = PRODUCTS;

  getById(id: number): Promise<Product | undefined> {
    return new Promise((resolve) => setTimeout(() => resolve(PRODUCTS.find((p) => p.id === id)), 300));
  }

  /** Synchronous lookup (used by the title resolver). */
  nameOf(id: number): string | undefined {
    return PRODUCTS.find((p) => p.id === id)?.name;
  }
}
