import { DestroyRef, Injectable, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, interval } from 'rxjs';
import { DiLog } from '../di-log';

let nextInstanceId = 1;

/**
 * A stateful service used to show WHERE an instance lives and WHEN it is destroyed.
 *
 * `providedIn: 'root'` registers a default, tree-shakable provider in the root injector.
 * A component can still shadow it with `providers: [CounterStore]` → it then gets its OWN
 * instance, created with the component and destroyed with it.
 * Docs: https://angular.dev/guide/di/hierarchical-dependency-injection#elementinjector
 */
@Injectable({ providedIn: 'root' })
export class CounterStore implements OnDestroy {
  readonly instanceId = nextInstanceId++;
  readonly count = signal(0);
  /** Seconds since creation — driven by an RxJS interval cleaned up with takeUntilDestroyed(). */
  readonly ageSeconds = signal(0);

  private readonly log = inject(DiLog).log;
  // DestroyRef injected in a service = the DestroyRef of the injector that CREATED the service:
  // - root provider      → root EnvironmentInjector (destroyed with the app)
  // - component provider → the component's node injector (destroyed with the component)
  // Docs: https://angular.dev/api/core/DestroyRef
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // The constructor is NOT a lifecycle hook: it is just where DI creates the instance.
    // addDeferred(): instances are created during rendering, so we defer the signal write.
    this.log.addDeferred(`CounterStore #${this.instanceId} created`, 'success');

    // Cleanup way #1: DestroyRef.onDestroy() — works in services, components, directives, pipes.
    this.destroyRef.onDestroy(() =>
      this.log.addDeferred(`CounterStore #${this.instanceId}: DestroyRef.onDestroy() callback`, 'hook'),
    );

    // Cleanup way #2: takeUntilDestroyed() — uses the same DestroyRef under the hood.
    // Docs: https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed
    interval(1000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() =>
          this.log.addDeferred(`CounterStore #${this.instanceId}: interval unsubscribed (takeUntilDestroyed)`, 'hook'),
        ),
      )
      .subscribe(() => this.ageSeconds.update((s) => s + 1));
  }

  increment(): void {
    this.count.update((c) => c + 1);
  }

  /** Cleanup way #3: the only lifecycle hook a service gets. */
  // Docs: https://angular.dev/api/core/OnDestroy
  ngOnDestroy(): void {
    this.log.addDeferred(`CounterStore #${this.instanceId}: ngOnDestroy()`, 'warning');
  }
}
