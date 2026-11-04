import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Route, provideRouter } from '@angular/router';
import { routes } from '../app.routes';
import { PLAYGROUND_MODULES } from './modules.registry';

/**
 * Smoke test: every module page (the '' child route of each lazy module) must render
 * without throwing and must stabilise (no infinite render loop).
 * Pending HTTP requests are failed with a network error so pages that fetch on init
 * (module 09) can stabilise — this also checks they handle errors gracefully.
 */
describe('Module pages (smoke)', () => {
  for (const mod of PLAYGROUND_MODULES) {
    it(`renders ${mod.folder}`, async () => {
      const parent = routes.find((r) => r.path === mod.path) as Route;
      const loaded = await (parent.loadChildren as () => Promise<Route[] | { default: Route[] }>)();
      const children = Array.isArray(loaded) ? loaded : loaded.default;
      const pageRoute = children.find((r) => r.path === '') as Route;
      const page = (await (pageRoute.loadComponent as () => Promise<Type<unknown> | { default: Type<unknown> }>)());
      const component = 'default' in page ? page.default : page;

      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      });
      const fixture = TestBed.createComponent(component);
      const http = TestBed.inject(HttpTestingController);
      for (let i = 0; i < 20 && !fixture.isStable(); i++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        http.match(() => true).forEach((req) => req.error(new ProgressEvent('error')));
      }
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('app-page-header h1')?.textContent).toContain(mod.title.split(' ')[0]);
    });
  }
});
