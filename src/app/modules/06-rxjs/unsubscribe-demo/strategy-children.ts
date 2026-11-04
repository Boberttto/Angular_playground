import { AsyncPipe } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { TickerSource } from './ticker-source';

// Each child subscribes to the same source with a different strategy.
// Docs: https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed

/** ❌ LEAK: subscribes and never unsubscribes. The interval keeps running after destroy. */
@Component({ selector: 'app-leaky-child', template: `❌ leaky: {{ value() }}` })
export class LeakyChild {
  protected readonly value = signal(0);
  constructor() {
    inject(TickerSource).tick$.subscribe((v) => this.value.set(v));
  }
}

/** ✅ Manual: keep the Subscription, unsubscribe in ngOnDestroy (legacy but valid). */
@Component({ selector: 'app-manual-child', template: `✅ manual: {{ value() }}` })
export class ManualChild implements OnDestroy {
  protected readonly value = signal(0);
  private readonly sub: Subscription = inject(TickerSource).tick$.subscribe((v) => this.value.set(v));
  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}

/** ✅ takeUntilDestroyed(): completes the stream when the component's DestroyRef fires. */
@Component({ selector: 'app-take-until-destroyed-child', template: `✅ takeUntilDestroyed: {{ value() }}` })
export class TakeUntilDestroyedChild {
  protected readonly value = signal(0);
  constructor() {
    // No argument needed in an injection context; elsewhere pass inject(DestroyRef).
    inject(TickerSource)
      .tick$.pipe(takeUntilDestroyed())
      .subscribe((v) => this.value.set(v));
  }
}

/** ✅ async pipe: subscribes in the template, unsubscribes automatically on destroy. */
@Component({
  selector: 'app-async-pipe-child',
  imports: [AsyncPipe],
  template: `✅ async pipe: {{ tick$ | async }}`,
})
export class AsyncPipeChild {
  protected readonly tick$ = inject(TickerSource).tick$;
}

/** ✅ toSignal(): subscribes immediately, unsubscribes when the injection context is destroyed. */
@Component({ selector: 'app-to-signal-child', template: `✅ toSignal: {{ value() }}` })
export class ToSignalChild {
  protected readonly value = toSignal(inject(TickerSource).tick$, { initialValue: 0 });
}
