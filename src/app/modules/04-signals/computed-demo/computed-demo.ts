import { Component, computed, signal } from '@angular/core';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/**
 * computed(): lazy, memoized, dynamic dependency tracking.
 * Docs: https://angular.dev/guide/signals#computed-signals-are-both-lazily-evaluated-and-memoized
 */
@Component({
  selector: 'app-computed-demo',
  imports: [LogPanel],
  templateUrl: './computed-demo.html',
})
export class ComputedDemo {
  protected readonly log = new EventLog();

  protected readonly count = signal(1);
  protected readonly showCount = signal(false);
  protected readonly displayed = signal(true);

  // Expensive derivation. The log write is deferred (microtask): writing a signal synchronously
  // inside computed() is forbidden.
  protected readonly doubled = computed(() => {
    this.log.addDeferred(`doubled: derivation ran (count=${this.count()})`, 'hook');
    return this.count() * 2;
  });

  // Dynamic dependencies: `count` is only a dependency while showCount() is true.
  // Docs: https://angular.dev/guide/signals#computed-signal-dependencies-are-dynamic
  protected readonly conditional = computed(() => {
    const show = this.showCount();
    this.log.addDeferred(`conditional: derivation ran (showCount=${show})`, 'hook');
    return show ? `The count is ${this.count()}.` : 'Nothing to see here!';
  });

  protected inc(): void {
    this.count.update((n) => n + 1);
    this.log.add(`count -> ${this.count()}`);
  }

  protected readTwice(): void {
    // Second read is served from the cache: only ONE "derivation ran" line (if count changed at all).
    this.log.add(`read doubled() twice in a row: ${this.doubled()} / ${this.doubled()}`);
  }
}
