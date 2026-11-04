import { Component, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, interval, map } from 'rxjs';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

const FRUITS = ['apple', 'apricot', 'banana', 'blueberry', 'cherry', 'grape', 'kiwi', 'mango', 'melon'];

/**
 * toSignal / toObservable in a nutshell (details in module 06 · RxJS).
 * Docs: https://angular.dev/ecosystem/rxjs-interop
 */
@Component({
  selector: 'app-interop-demo',
  imports: [LogPanel],
  templateUrl: './interop-demo.html',
})
export class InteropDemo {
  protected readonly log = new EventLog();

  // Observable -> Signal. Subscribes immediately, unsubscribes when the component is destroyed.
  protected readonly seconds = toSignal(interval(1000), { initialValue: 0 });

  // Signal -> Observable -> RxJS operators (time-based!) -> Signal.
  protected readonly query = signal('');
  protected readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      map((q) => FRUITS.filter((f) => f.includes(q.trim().toLowerCase()))),
    ),
    { initialValue: FRUITS },
  );

  private readonly burst = signal(0);

  constructor() {
    // toObservable emits only once the signal "stabilizes": 3 sync sets -> 1 emission (the last value).
    // Docs: https://angular.dev/ecosystem/rxjs-interop#timing-of-toobservable
    toObservable(this.burst)
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.log.add(`toObservable(burst) emitted ${v}`, 'hook'));
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected setBurst(): void {
    const base = this.burst();
    this.burst.set(base + 1);
    this.burst.set(base + 2);
    this.burst.set(base + 3);
    this.log.add(`burst.set() ×3 synchronously (${base + 1}, ${base + 2}, ${base + 3})`);
  }
}
