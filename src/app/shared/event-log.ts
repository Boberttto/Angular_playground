import { signal } from '@angular/core';

export type LogKind = 'info' | 'success' | 'warning' | 'error' | 'hook';

export interface LogEntry {
  readonly id: number;
  readonly time: string;
  readonly message: string;
  readonly kind: LogKind;
}

let nextId = 0;

/**
 * Tiny signal-based event log used by the demos to show what happens
 * ON SCREEN (not only in the console).
 *
 * Usage:
 *   protected readonly log = new EventLog();
 *   this.log.add('clicked!');
 *   <app-log-panel [entries]="log.entries()" (cleared)="log.clear()" />
 *
 * ⚠️ Writing a signal while Angular is rendering a template that reads it
 * (e.g. inside ngDoCheck / ngAfterViewChecked) can trigger
 * ExpressionChangedAfterItHasBeenChecked or re-render loops.
 * Use `addDeferred()` from those hooks: it queues the write in a microtask.
 */
export class EventLog {
  private readonly _entries = signal<readonly LogEntry[]>([]);
  readonly entries = this._entries.asReadonly();

  constructor(private readonly max = 100) {}

  add(message: string, kind: LogKind = 'info'): void {
    const entry: LogEntry = {
      id: nextId++,
      time: new Date().toLocaleTimeString(),
      message,
      kind,
    };
    this._entries.update((list) => [...list, entry].slice(-this.max));
  }

  /** Same as add(), but deferred to a microtask (safe from inside lifecycle hooks). */
  addDeferred(message: string, kind: LogKind = 'info'): void {
    queueMicrotask(() => this.add(message, kind));
  }

  clear(): void {
    this._entries.set([]);
  }
}
