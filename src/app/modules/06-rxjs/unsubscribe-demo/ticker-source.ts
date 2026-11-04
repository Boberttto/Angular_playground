import { Service, signal } from '@angular/core';
import { Observable, Subject, takeUntil } from 'rxjs';

/**
 * A ticking source that COUNTS its live subscriptions, so leaks are visible on screen.
 * Each subscription owns its own setInterval (cold Observable).
 */
@Service()
export class TickerSource {
  readonly active = signal(0);
  private readonly killAll$ = new Subject<void>();

  readonly tick$: Observable<number> = new Observable<number>((subscriber) => {
    this.active.update((n) => n + 1);
    let i = 0;
    const id = setInterval(() => subscriber.next(++i), 1000);
    // Teardown logic: runs on unsubscribe, complete or error.
    return () => {
      clearInterval(id);
      this.active.update((n) => n - 1);
    };
  }).pipe(takeUntil(this.killAll$));

  /** Emergency button for the demo: completes every subscription (leaked ones included). */
  killAll(): void {
    this.killAll$.next();
  }
}
