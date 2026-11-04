import { Component, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, filter, map, of, startWith, switchMap, tap } from 'rxjs';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { fakeSearch } from './fake-search';

interface SearchState {
  readonly loading: boolean;
  readonly results: readonly string[];
  readonly error?: string;
}

const INITIAL_STATE: SearchState = { loading: false, results: [] };

/**
 * The classic interview pipeline: signal → Observable → operators → signal.
 * Docs: https://angular.dev/ecosystem/rxjs-interop
 */
@Component({
  selector: 'app-typeahead',
  imports: [LogPanel],
  templateUrl: './typeahead.html',
})
export class Typeahead {
  protected readonly log = new EventLog();
  protected readonly query = signal('');

  protected readonly state = toSignal(
    // toObservable(): signal → Observable (emits asynchronously, after the signal settles).
    toObservable(this.query).pipe(
      map((q) => q.trim()),
      // Wait for 300 ms of silence before searching (no request per keystroke).
      debounceTime(300),
      // Skip if the (trimmed) term didn't change, e.g. "ng " → "ng".
      distinctUntilChanged(),
      tap((q) => this.log.add(`debounced & distinct: "${q}"`)),
      // Don't hit the server for terms that are too short.
      filter((q) => q.length >= 2),
      // switchMap: a new term CANCELS the in-flight search → no out-of-order results.
      switchMap((q) =>
        fakeSearch(q).pipe(
          map((results): SearchState => ({ loading: false, results })),
          tap((s) => this.log.add(`results for "${q}": ${s.results.length}`, 'success')),
          // catchError INSIDE switchMap: the outer stream survives the error.
          catchError((err: Error) => {
            this.log.add(err.message, 'error');
            return of<SearchState>({ loading: false, results: [], error: err.message });
          }),
          startWith<SearchState>({ loading: true, results: [] }),
        ),
      ),
    ),
    { initialValue: INITIAL_STATE },
  );

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
