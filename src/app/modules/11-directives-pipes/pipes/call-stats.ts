import { Injectable, signal } from '@angular/core';

export type CallKind = 'pure' | 'impure' | 'method';
export type CallCounts = Record<CallKind, number>;

/**
 * Counts how many times transform()/methods run.
 * Counting happens DURING rendering, so we must not write a signal synchronously there.
 * We publish a snapshot in a microtask, read ONLY by a separate child component
 * (CallStatsPanel): refreshing that child does not re-render the component using the pipes,
 * so there is no infinite loop.
 */
@Injectable()
export class CallStats {
  private readonly counts: CallCounts = { pure: 0, impure: 0, method: 0 };
  private readonly _snapshot = signal<CallCounts>({ ...this.counts });
  readonly snapshot = this._snapshot.asReadonly();
  private scheduled = false;

  increment(kind: CallKind): void {
    this.counts[kind]++;
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this._snapshot.set({ ...this.counts });
    });
  }

  reset(): void {
    this.counts.pure = this.counts.impure = this.counts.method = 0;
    this._snapshot.set({ ...this.counts });
  }
}
