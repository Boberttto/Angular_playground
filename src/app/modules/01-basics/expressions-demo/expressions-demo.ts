import { Component, signal } from '@angular/core';

interface Address {
  readonly city: string;
}
interface Person {
  readonly name: string;
  readonly address?: Address;
}

/**
 * Template expressions are a SUBSET of JavaScript (+ a few Angular-only operators).
 * Docs: https://angular.dev/guide/templates/expression-syntax
 */
@Component({
  selector: 'app-expressions-demo',
  templateUrl: './expressions-demo.html',
  styleUrl: './expressions-demo.scss',
})
export class ExpressionsDemo {
  protected readonly person = signal<Person | null>(null);
  protected readonly tasks = signal([
    { title: 'Learn @for', done: true },
    { title: 'Learn pipes', done: false },
    { title: 'Learn signals', done: false },
  ]);

  // Typed as possibly undefined, but WE know it is set in the constructor.
  // The non-null assertion `!` in the template tells the type checker "trust me".
  protected config: { theme: string } | undefined;

  constructor() {
    this.config = { theme: 'dark' };
  }

  protected cycle(): void {
    this.person.update((p) =>
      p === null
        ? { name: 'Ada' }
        : p.address
          ? null
          : { ...p, address: { city: 'London' } },
    );
  }
}
