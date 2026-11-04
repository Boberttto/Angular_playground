import { Component, inject } from '@angular/core';
import { ROUTE_GREETING, ScopedVisitCounter } from '../data/routing-demo-state';

/**
 * Injects providers declared on its route. The route's EnvironmentInjector is NOT destroyed
 * when you navigate away (unless withAutoCleanupInjectors() is configured, v22.2), so the counter
 * keeps its value between visits while the component itself is recreated.
 */
@Component({
  selector: 'app-scoped-provider-demo',
  template: `<h3>🧩 Route-level providers</h3>
    <p>{{ greeting }}</p>
    <p>Visits of this route (state lives in the route injector): <strong>{{ counter.visits() }}</strong></p>`,
})
export default class ScopedProviderDemo {
  protected readonly greeting = inject(ROUTE_GREETING);
  protected readonly counter = inject(ScopedVisitCounter);

  constructor() {
    this.counter.visits.update((v) => v + 1);
  }
}
