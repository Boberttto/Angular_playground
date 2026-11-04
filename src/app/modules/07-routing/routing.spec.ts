import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  PartialMatchRouteSnapshot,
  RedirectCommand,
  Route,
  RouterStateSnapshot,
  UrlSegment,
  provideRouter,
} from '@angular/router';
import { RoutingDemoState } from './data/routing-demo-state';
import { authGuard, betaDashboardGuard, unsavedChangesGuard } from './guards/guards';
import { productResolver } from './guards/resolvers';

// Functional guards/resolvers need an injection context -> TestBed.runInInjectionContext().
// Docs: https://angular.dev/api/core/testing/TestBed#runInInjectionContext
describe('07-routing guards & resolvers', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('authGuard redirects to /routing/denied when logged out', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBeInstanceOf(RedirectCommand);
    expect((result as RedirectCommand).redirectTo.toString()).toBe('/routing/denied');
  });

  it('authGuard allows navigation when logged in', () => {
    TestBed.inject(RoutingDemoState).loggedIn.set(true);
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
  });

  it('betaDashboardGuard follows the feature flag', () => {
    // v22: CanMatchFn also receives a 3rd argument, the partial route snapshot being matched.
    const run = () =>
      TestBed.runInInjectionContext(() =>
        betaDashboardGuard({} as Route, [] as UrlSegment[], {} as PartialMatchRouteSnapshot),
      );
    expect(run()).toBe(false);
    TestBed.inject(RoutingDemoState).betaDashboard.set(true);
    expect(run()).toBe(true);
  });

  it('unsavedChangesGuard lets you leave a clean component without asking', () => {
    const component = { hasUnsavedChanges: () => false };
    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(component, route, state, state),
    );
    expect(result).toBe(true);
  });

  it('productResolver redirects for an unknown id', async () => {
    const snapshot = { paramMap: new Map([['id', '99999']]) } as unknown as ActivatedRouteSnapshot;
    const result = await TestBed.runInInjectionContext(() => productResolver(snapshot, state));
    expect(result).toBeInstanceOf(RedirectCommand);
  });
});
