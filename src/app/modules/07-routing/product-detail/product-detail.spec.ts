import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import routingRoutes from '../routing.routes';
import { RoutingDemoState } from '../data/routing-demo-state';

// Verifies the claims made in docs/07-routing/theory.md with the REAL route config.
// Docs: https://angular.dev/api/router/testing/RouterTestingHarness
describe('07-routing route config', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'routing', children: routingRoutes }], withComponentInputBinding())],
    });
  });

  it('reuses ProductDetail when only :id changes -> snapshot becomes stale', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/routing/products/1');
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.textContent).toContain('Mechanical keyboard');
    const rowsBefore = el.querySelectorAll('tr');
    const instanceBefore = rowsBefore[4].textContent;

    await harness.navigateByUrl('/routing/products/2');
    const el2 = harness.routeNativeElement as HTMLElement;
    const cells = Array.from(el2.querySelectorAll('tr')).map((r) => r.textContent ?? '');
    expect(el2.textContent).toContain('Ultrawide monitor');
    expect(cells[1]).toContain('2'); // input binding: fresh
    expect(cells[2]).toContain('2'); // paramMap observable: fresh
    expect(cells[3]).toContain('1'); // snapshot: still the OLD id
    expect(cells[3]).toContain('stale');
    expect(cells[4]).toBe(instanceBefore); // same component instance
  });

  it('function redirectTo builds a UrlTree with query params', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/routing/legacy-product/3');
    expect(TestBed.inject(Router).url).toBe('/routing/products/3?from=legacy');
  });

  it('authGuard redirects with a RedirectCommand when logged out', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/routing/admin');
    expect(TestBed.inject(Router).url).toBe('/routing/denied');

    TestBed.inject(RoutingDemoState).loggedIn.set(true);
    await harness.navigateByUrl('/routing/admin');
    expect(TestBed.inject(Router).url).toBe('/routing/admin');
  });

  it('canMatch falls through to the next route with the same path', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/routing/dashboard');
    expect(harness.routeNativeElement?.textContent).toContain('Stable dashboard');

    TestBed.inject(RoutingDemoState).betaDashboard.set(true);
    await harness.navigateByUrl('/routing/products'); // leave, then come back
    await harness.navigateByUrl('/routing/dashboard');
    expect(harness.routeNativeElement?.textContent).toContain('Beta dashboard');
  });

  it('resolver redirects unknown products', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/routing/products/999');
    expect(TestBed.inject(Router).url).toBe('/routing/products?missing=1');
  });
});
