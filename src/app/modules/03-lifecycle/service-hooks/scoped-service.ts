import { DestroyRef, Injectable, OnDestroy, inject } from '@angular/core';
import { HookTrace } from '../hook-trace/hook-trace';

const SRC = 'service';

/**
 * A service that DEFINES every hook method, to prove Angular only calls ngOnDestroy on it.
 * Not providedIn: 'root' -> it is provided by ServiceHost, so it lives and dies with that
 * component instance.
 * Docs: https://angular.dev/api/core/OnDestroy  ("directive, pipe, or service is destroyed")
 * Docs: https://angular.dev/guide/di/hierarchical-dependency-injection
 */
@Injectable()
export class ScopedService implements OnDestroy {
  private readonly trace = inject(HookTrace);

  constructor() {
    // Not a hook: just the moment the injector instantiates the service (lazily, on first inject).
    this.trace.record(SRC, 'constructor (first inject())');
    inject(DestroyRef).onDestroy(() => this.trace.record(SRC, 'DestroyRef.onDestroy callback'));
  }

  // ⚠️ Never called on a service: these are directive/component hooks only.
  ngOnInit(): void {
    this.trace.record(SRC, 'ngOnInit (should NEVER appear)');
  }
  ngDoCheck(): void {
    this.trace.record(SRC, 'ngDoCheck (should NEVER appear)');
  }
  ngAfterViewInit(): void {
    this.trace.record(SRC, 'ngAfterViewInit (should NEVER appear)');
  }

  // ✅ The only lifecycle hook a service gets.
  ngOnDestroy(): void {
    this.trace.record(SRC, 'ngOnDestroy');
  }
}
