import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateFn,
  CanDeactivateFn,
  CanMatchFn,
  GuardResult,
  MaybeAsync,
  RedirectCommand,
  Router,
} from '@angular/router';
import { RoutingDemoState } from '../data/routing-demo-state';

// Docs: https://angular.dev/guide/routing/route-guards
// Functional guards are plain functions run in an injection context, so `inject()` works.

/** CanActivate: blocks /admin unless "logged in"; redirects with a RedirectCommand. */
export const authGuard: CanActivateFn = () => {
  const state = inject(RoutingDemoState);
  const router = inject(Router);
  if (state.loggedIn()) return true;
  // RedirectCommand (v18+) = redirect + NavigationBehaviorOptions. Returning a UrlTree also works.
  // Docs: https://angular.dev/api/router/RedirectCommand
  return new RedirectCommand(router.parseUrl('/routing/denied'));
};

/** Contract implemented by components protected by `unsavedChangesGuard`. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * CanDeactivate: receives the component instance being left.
 * Docs: https://angular.dev/api/router/CanDeactivateFn
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() || window.confirm('You have unsaved changes. Leave anyway?');

/**
 * CanMatch: when it returns false the router does NOT block — it tries the next route
 * with the same path (here: the stable dashboard). Great for feature flags / A-B tests.
 * Docs: https://angular.dev/api/router/CanMatchFn
 */
export const betaDashboardGuard: CanMatchFn = () => inject(RoutingDemoState).betaDashboard();

// Legacy syntax (still supported): class-based guard. Passing the class token directly in
// `canActivate: [LegacyAuthGuard]` is deprecated; `mapToCanActivate` adapts it to a CanActivateFn.
// Docs: https://angular.dev/api/router/mapToCanActivate
@Injectable({ providedIn: 'root' })
export class LegacyAuthGuard implements CanActivate {
  private readonly state = inject(RoutingDemoState);
  private readonly router = inject(Router);

  canActivate(_route: ActivatedRouteSnapshot): MaybeAsync<GuardResult> {
    return this.state.loggedIn() ? true : this.router.createUrlTree(['/routing/denied']);
  }
}
