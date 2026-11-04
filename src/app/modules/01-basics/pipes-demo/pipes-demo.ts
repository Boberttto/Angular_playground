import { Component, signal } from '@angular/core';
import {
  AsyncPipe,
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  JsonPipe,
  KeyValuePipe,
  LowerCasePipe,
  PercentPipe,
  SlicePipe,
  TitleCasePipe,
  UpperCasePipe,
} from '@angular/common';
import { map, take, timer } from 'rxjs';

/**
 * Built-in pipes from @angular/common. Each pipe must be imported (standalone), like a component.
 * Docs: https://angular.dev/guide/templates/pipes
 */
@Component({
  selector: 'app-pipes-demo',
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    JsonPipe,
    KeyValuePipe,
    LowerCasePipe,
    PercentPipe,
    SlicePipe,
    TitleCasePipe,
    UpperCasePipe,
  ],
  templateUrl: './pipes-demo.html',
  styleUrl: './pipes-demo.scss',
})
export class PipesDemo {
  protected readonly now = new Date(2026, 0, 15, 14, 5, 9);
  protected readonly amount = 1234.5;
  protected readonly ratio = 0.4567;
  protected readonly title = 'the lord of the rings';
  protected readonly user = { name: 'Ada', roles: ['admin', 'dev'], active: true };
  protected readonly scores: Record<string, number> = { zoe: 12, adam: 30, mia: 21 };
  protected readonly ordered = new Map<string, number>([
    ['zoe', 12],
    ['adam', 30],
    ['mia', 21],
  ]);

  // AsyncPipe subscribes for you, marks the view for check on each value, and unsubscribes on destroy.
  // Docs: https://angular.dev/api/common/AsyncPipe
  protected readonly clock$ = timer(0, 1000).pipe(
    take(600), // stop after 10 min so the demo does not tick forever
    map(() => new Date()),
  );
  protected readonly promise = signal<Promise<string> | null>(null);

  protected startPromise(): void {
    this.promise.set(new Promise((resolve) => setTimeout(() => resolve('Promise resolved ✅'), 1500)));
  }

  // keyvalue sorts by key by default; this comparator sorts by value DESC instead.
  protected byValueDesc(a: { value: number }, b: { value: number }): number {
    return b.value - a.value;
  }
}
