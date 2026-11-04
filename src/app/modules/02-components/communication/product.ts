export interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
}

export const PRODUCTS: readonly Product[] = [
  { id: 1, name: 'Keyboard', price: 79 },
  { id: 2, name: 'Mouse', price: 29 },
  { id: 3, name: 'Monitor', price: 249 },
];
