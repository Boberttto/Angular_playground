import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncSubject, BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

interface SubjectRow {
  readonly name: string;
  readonly subject: Subject<number>;
}

/**
 * Subject variants and what a LATE subscriber receives.
 * Docs: https://rxjs.dev/guide/subject
 */
@Component({
  selector: 'app-subjects-demo',
  imports: [LogPanel],
  templateUrl: './subjects-demo.html',
})
export class SubjectsDemo {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly log = new EventLog();
  protected readonly next = signal(1);
  protected readonly lateCount = signal(0);
  protected readonly completed = signal(false);
  private rows: SubjectRow[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.rows.forEach((r) => r.subject.complete());
    this.rows = [
      // Plain Subject: multicast, no memory. Late subscribers only get FUTURE values.
      { name: 'Subject', subject: new Subject<number>() },
      // BehaviorSubject: requires an initial value, replays the CURRENT value.
      { name: 'BehaviorSubject(0)', subject: new BehaviorSubject<number>(0) },
      // ReplaySubject(2): replays the last 2 values (buffer size).
      { name: 'ReplaySubject(2)', subject: new ReplaySubject<number>(2) },
      // AsyncSubject: emits only the LAST value, and only when it completes.
      { name: 'AsyncSubject', subject: new AsyncSubject<number>() },
    ];
    this.next.set(1);
    this.lateCount.set(0);
    this.completed.set(false);
    this.log.clear();
    this.subscribe('A (early)');
  }

  emit(): void {
    const value = this.next();
    this.log.add(`── next(${value}) on all subjects`, 'hook');
    this.rows.forEach((r) => r.subject.next(value));
    this.next.update((v) => v + 1);
  }

  addLateSubscriber(): void {
    this.lateCount.update((n) => n + 1);
    const name = `L${this.lateCount()} (late)`;
    this.log.add(`── ${name} subscribes now`, 'hook');
    this.subscribe(name);
  }

  completeAll(): void {
    this.log.add('── complete() on all subjects', 'hook');
    this.rows.forEach((r) => r.subject.complete());
    this.completed.set(true);
  }

  private subscribe(subscriber: string): void {
    for (const row of this.rows) {
      row.subject.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (v) => this.log.add(`${subscriber} ← ${row.name}: ${v}`, 'success'),
        complete: () => this.log.add(`${subscriber} ← ${row.name}: complete`),
      });
    }
  }
}
