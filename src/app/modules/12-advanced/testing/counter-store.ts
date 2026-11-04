import { computed, Injectable, signal } from '@angular/core';

/** Small signal-based store used to demo service + signal testing. */
@Injectable({ providedIn: 'root' })
export class CounterStore {
  readonly max = 5;
  private readonly _count = signal(0);
  readonly count = this._count.asReadonly();
  readonly double = computed(() => this._count() * 2);
  readonly isMax = computed(() => this._count() >= this.max);

  increment(): void {
    if (!this.isMax()) this._count.update((c) => c + 1);
  }

  reset(): void {
    this._count.set(0);
  }
}
