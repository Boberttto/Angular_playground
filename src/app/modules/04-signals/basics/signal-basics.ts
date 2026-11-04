import { Component, computed, inject, signal } from '@angular/core';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { CartStore } from './cart-store';

interface User {
  readonly id: number;
  readonly name: string;
}

/**
 * signal / set / update / asReadonly / equality function.
 * Docs: https://angular.dev/guide/signals#writable-signals
 */
@Component({
  selector: 'app-signal-basics',
  imports: [LogPanel],
  providers: [CartStore],
  templateUrl: './signal-basics.html',
})
export class SignalBasics {
  protected readonly log = new EventLog();
  protected readonly store = inject(CartStore);

  protected readonly count = signal(0);

  // Default equality is Object.is. Custom equality: same id => "equal" => no notification.
  // Docs: https://angular.dev/guide/signals#signal-equality-functions
  protected readonly userDefault = signal<User>({ id: 1, name: 'Ada' });
  protected readonly userById = signal<User>({ id: 1, name: 'Ada' }, { equal: (a, b) => a.id === b.id });

  private defaultRuns = 0;
  private byIdRuns = 0;
  // computed side effects are a bad idea in real code; here we only count to make re-evaluation visible.
  protected readonly defaultLabel = computed(() => `${this.userDefault().name} (computed ran ${++this.defaultRuns}×)`);
  protected readonly byIdLabel = computed(() => `${this.userById().name} (computed ran ${++this.byIdRuns}×)`);

  protected increment(): void {
    this.count.update((n) => n + 1);
    this.log.add(`count.update(n => n + 1) -> ${this.count()} (read synchronously right after)`);
  }

  protected reset(): void {
    this.count.set(0);
    this.log.add('count.set(0)');
  }

  protected renameBoth(): void {
    const name = this.userDefault().name === 'Ada' ? 'Grace' : 'Ada';
    this.userDefault.set({ id: 1, name });
    this.userById.set({ id: 1, name });
    this.log.add(`set({ id: 1, name: '${name}' }) on both. Custom-equality signal ignored it (same id).`, 'warning');
  }

  protected mutate(): void {
    this.store.mutateInPlace();
    // The click itself refreshes this view, so @for (which diffs the array content) may show the new row,
    // but the signal never notified: the memoized computed totalQty is NOT recomputed -> stale total.
    this.log.add('Mutated in place + set(sameRef): signal did not notify -> totalQty (computed) is stale.', 'error');
  }
}
