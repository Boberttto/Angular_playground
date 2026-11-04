import { Component, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, delay, of, throwError } from 'rxjs';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { Countdown } from './countdown';

interface Book {
  readonly id: number;
  readonly title: string;
}

const BOOKS: Record<number, string> = { 1: 'Dune', 2: 'Neuromancer', 3: 'Hyperion' };

/** Fake Observable-based API (like an HttpClient call). */
function loadBook(id: number): Observable<Book> {
  return BOOKS[id]
    ? of({ id, title: BOOKS[id] }).pipe(delay(700))
    : throwError(() => new Error(`Book ${id} not found`)).pipe(delay(400));
}

/**
 * rxResource: a signal-based resource whose loader returns an Observable.
 * Docs: https://angular.dev/ecosystem/rxjs-interop#using-rxresource-for-async-data
 */
@Component({
  selector: 'app-interop-demo',
  imports: [LogPanel, Countdown],
  templateUrl: './interop-demo.html',
})
export class InteropDemo {
  protected readonly log = new EventLog();
  protected readonly bookId = signal(1);
  protected readonly from = signal(3);

  protected readonly book = rxResource({
    // params: reactive. When bookId changes, the previous stream is unsubscribed (cancelled).
    params: () => this.bookId(),
    // stream: receives { params, abortSignal, previous } and returns an Observable.
    stream: ({ params }) => loadBook(params),
  });

  protected onTick(value: number): void {
    this.log.add(`(tick) output from child: ${value}`, value === 0 ? 'success' : 'info');
  }

  protected onFromChange(event: Event): void {
    this.from.set(Number((event.target as HTMLInputElement).value) || 1);
  }
}
