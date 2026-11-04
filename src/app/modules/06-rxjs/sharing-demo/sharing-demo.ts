import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  combineLatest,
  defer,
  delay,
  forkJoin,
  of,
  shareReplay,
  startWith,
  take,
  timer,
  map,
  withLatestFrom,
} from 'rxjs';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/**
 * Cold vs hot (shareReplay) and the combination operators.
 * Docs: https://rxjs.dev/api/operators/shareReplay
 */
@Component({
  selector: 'app-sharing-demo',
  imports: [LogPanel],
  templateUrl: './sharing-demo.html',
})
export class SharingDemo {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly log = new EventLog();
  private executions = 0;

  /** COLD: the producer (the "request") runs once PER subscriber. */
  private readonly cold$: Observable<string> = defer(() => {
    const n = ++this.executions;
    this.log.add(`🔥 producer executed (#${n})`, 'warning');
    return of(`config v${n}`).pipe(delay(300));
  });

  /** HOT-ish: shareReplay(1) shares ONE execution and replays the last value to late subscribers. */
  private readonly shared$ = this.cold$.pipe(shareReplay({ bufferSize: 1, refCount: false }));

  // Combination sources
  private readonly a$ = new Subject<number>();
  private readonly b$ = new Subject<string>();
  private aCount = 0;
  private bCount = 0;

  constructor() {
    // combineLatest: emits when ANY source emits, once ALL have emitted at least once.
    combineLatest([this.a$, this.b$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([a, b]) => this.log.add(`combineLatest → [${a}, ${b}]`, 'success'));

    // withLatestFrom: emits ONLY when the primary source (a$) emits, sampling b$'s latest value.
    this.a$
      .pipe(withLatestFrom(this.b$), takeUntilDestroyed(this.destroyRef))
      .subscribe(([a, b]) => this.log.add(`a$.withLatestFrom(b$) → [${a}, ${b}]`, 'info'));
  }

  subscribeTwiceCold(): void {
    this.log.add('── cold$: 2 subscribers', 'hook');
    this.cold$.subscribe((v) => this.log.add(`cold sub 1 ← ${v}`));
    this.cold$.subscribe((v) => this.log.add(`cold sub 2 ← ${v}`));
  }

  subscribeTwiceShared(): void {
    this.log.add('── shared$ (shareReplay(1)): 2 subscribers (+1 late after 1s)', 'hook');
    this.shared$.subscribe((v) => this.log.add(`shared sub 1 ← ${v}`));
    this.shared$.subscribe((v) => this.log.add(`shared sub 2 ← ${v}`));
    timer(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.shared$.subscribe((v) => this.log.add(`late shared sub ← ${v} (replayed)`)));
  }

  emitA(): void {
    this.a$.next(++this.aCount);
  }

  emitB(): void {
    this.b$.next(String.fromCharCode(96 + (++this.bCount % 26 || 26)));
  }

  runForkJoin(): void {
    this.log.add('── forkJoin: user (500ms) + settings (1000ms)', 'hook');
    // forkJoin: waits for ALL sources to COMPLETE, emits once with their LAST values (like Promise.all).
    forkJoin({
      user: timer(500).pipe(map(() => 'Ada')),
      settings: timer(1000).pipe(map(() => 'dark mode')),
      // ⚠️ A never-completing source (interval, Subject…) would block forkJoin forever:
      lastTick: timer(0, 100).pipe(take(3), startWith(-1)),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => this.log.add(`forkJoin → ${JSON.stringify(r)}`, 'success'));
  }
}
