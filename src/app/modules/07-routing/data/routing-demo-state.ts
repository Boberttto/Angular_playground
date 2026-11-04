import { Injectable, InjectionToken, signal } from '@angular/core';

/**
 * Toggles used by the guard demos (fake auth + fake feature flag).
 * providedIn: 'root' so guards (which run in the route's injection context) can inject it.
 */
@Injectable({ providedIn: 'root' })
export class RoutingDemoState {
  readonly loggedIn = signal(false);
  readonly betaDashboard = signal(false);
}

/** Token only provided by the `scoped` route's `providers` array (see routing.routes.ts). */
export const ROUTE_GREETING = new InjectionToken<string>('ROUTE_GREETING');

/**
 * NOT providedIn root: only available to the `scoped` route subtree.
 * Docs: https://angular.dev/guide/routing/define-routes#route-level-providers-for-dependency-injection
 */
@Injectable()
export class ScopedVisitCounter {
  readonly visits = signal(0);
}
