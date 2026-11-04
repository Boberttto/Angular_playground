import { Component, computed, signal } from '@angular/core';

interface Fruit {
  readonly id: number;
  readonly name: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

let nextId = 4;

/**
 * Built-in control flow blocks (no import needed, no CommonModule).
 * Docs: https://angular.dev/guide/templates/control-flow
 */
@Component({
  selector: 'app-control-flow-demo',
  templateUrl: './control-flow-demo.html',
  styleUrl: './control-flow-demo.scss',
})
export class ControlFlowDemo {
  // --- @if ---
  protected readonly score = signal(50);
  protected readonly user = signal<{ name: string; email: string } | null>({
    name: 'Ada',
    email: 'ada@example.com',
  });

  // --- @for ---
  protected readonly fruits = signal<readonly Fruit[]>([
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Banana' },
    { id: 3, name: 'Cherry' },
  ]);

  // --- @switch ---
  protected readonly status = signal<Status>('idle');
  protected readonly statuses: readonly Status[] = ['idle', 'loading', 'success', 'error'];

  // --- @let ---
  protected readonly price = signal(20);
  protected readonly quantity = signal(3);
  protected readonly total = computed(() => this.price() * this.quantity());

  protected toggleUser(): void {
    this.user.update((u) => (u ? null : { name: 'Ada', email: 'ada@example.com' }));
  }

  protected add(): void {
    const id = nextId++;
    this.fruits.update((list) => [{ id, name: `Fruit #${id}` }, ...list]);
  }

  protected shuffle(): void {
    // A new array (immutability) so the signal notifies and @for diffs it.
    this.fruits.update((list) => [...list].sort(() => Math.random() - 0.5));
  }

  protected reverse(): void {
    this.fruits.update((list) => [...list].reverse());
  }

  protected remove(id: number): void {
    this.fruits.update((list) => list.filter((f) => f.id !== id));
  }

  protected clear(): void {
    this.fruits.set([]);
  }
}
