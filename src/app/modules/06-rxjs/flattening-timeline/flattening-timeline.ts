import { Component, DestroyRef, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  OperatorFunction,
  Subject,
  concatMap,
  defer,
  exhaustMap,
  finalize,
  map,
  mergeMap,
  switchMap,
  timer,
} from 'rxjs';

type RequestState = 'queued' | 'running' | 'done' | 'cancelled' | 'ignored';

interface Lane {
  readonly name: 'switchMap' | 'mergeMap' | 'concatMap' | 'exhaustMap';
  readonly rule: string;
  readonly states: WritableSignal<ReadonlyMap<number, RequestState>>;
}

const REQUEST_MS = 1500;

/**
 * Visual comparison of the 4 flattening (higher-order mapping) operators.
 * Each click = 1 fake request of 1.5 s. Click quickly several times!
 * Docs: https://rxjs.dev/api/operators/switchMap
 */
@Component({
  selector: 'app-flattening-timeline',
  templateUrl: './flattening-timeline.html',
  styleUrl: './flattening-timeline.scss',
})
export class FlatteningTimeline {
  private readonly destroyRef = inject(DestroyRef);
  private readonly clicks$ = new Subject<number>();
  private clickId = 0;

  protected readonly lanes: readonly Lane[] = [
    { name: 'switchMap', rule: 'cancels the previous request (latest wins) → search, autocomplete', states: signal(new Map()) },
    { name: 'mergeMap', rule: 'runs all requests in parallel (order not guaranteed) → independent writes', states: signal(new Map()) },
    { name: 'concatMap', rule: 'queues requests, one at a time, in order → ordered saves', states: signal(new Map()) },
    { name: 'exhaustMap', rule: 'ignores clicks while busy → login / submit button', states: signal(new Map()) },
  ];

  constructor() {
    const operators: Record<Lane['name'], (p: (id: number) => Observable<number>) => OperatorFunction<number, number>> = {
      switchMap: (p) => switchMap(p),
      mergeMap: (p) => mergeMap(p),
      concatMap: (p) => concatMap(p),
      exhaustMap: (p) => exhaustMap(p),
    };
    for (const lane of this.lanes) {
      this.clicks$
        .pipe(
          operators[lane.name]((id) => this.fakeRequest(lane, id)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe();
    }
  }

  fire(): void {
    const id = ++this.clickId;
    this.lanes.forEach((lane) => this.setState(lane, id, 'queued'));
    // Subject.next() is synchronous: operators that start immediately have already
    // subscribed to the inner request when next() returns.
    this.clicks$.next(id);
    // exhaustMap never calls the project function for clicks arriving while busy.
    const exhaust = this.lanes[3];
    if (exhaust.states().get(id) === 'queued') this.setState(exhaust, id, 'ignored');
  }

  reset(): void {
    // Simplest reset: clear the visual state (in-flight requests will still finish).
    this.clickId = 0;
    this.lanes.forEach((lane) => lane.states.set(new Map()));
  }

  protected entries(lane: Lane): [number, RequestState][] {
    return [...lane.states().entries()];
  }

  /** A cold "HTTP request": starts on subscribe, can be cancelled by unsubscribing. */
  private fakeRequest(lane: Lane, id: number): Observable<number> {
    return defer(() => {
      this.setState(lane, id, 'running');
      let completed = false;
      return timer(REQUEST_MS).pipe(
        map(() => {
          completed = true;
          this.setState(lane, id, 'done');
          return id;
        }),
        // finalize runs on complete, error AND unsubscribe → detect cancellation.
        finalize(() => {
          if (!completed) this.setState(lane, id, 'cancelled');
        }),
      );
    });
  }

  private setState(lane: Lane, id: number, state: RequestState): void {
    if (state !== 'queued' && !lane.states().has(id)) return; // after reset
    lane.states.update((m) => new Map(m).set(id, state));
  }
}
