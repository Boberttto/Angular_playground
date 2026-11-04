import { inject } from '@angular/core';
import { mapToCanActivate, Router, Routes } from '@angular/router';
import { ROUTE_GREETING, ScopedVisitCounter } from './data/routing-demo-state';
import { authGuard, betaDashboardGuard, LegacyAuthGuard, unsavedChangesGuard } from './guards/guards';
import { productResolver, productTitleResolver } from './guards/resolvers';

/**
 * Child routes of /routing. This whole file is itself lazy loaded by app.routes.ts
 * (`loadChildren: () => import('./modules/07-routing/routing.routes')`, default export).
 * Every child below uses `loadComponent`, so each page is its own lazy chunk too.
 * Docs: https://angular.dev/guide/routing/loading-strategies
 */
export default [
  {
    path: '',
    loadComponent: () => import('./routing-page'),
    children: [
      // Static redirect. pathMatch 'full' is required for an empty-path redirect,
      // otherwise '' would match (as a prefix) every URL.
      // Docs: https://angular.dev/guide/routing/redirecting-routes
      { path: '', redirectTo: 'products', pathMatch: 'full' },

      // Route `title` -> document.title (static string).
      { path: 'products', title: 'Products · Routing', loadComponent: () => import('./product-list/product-list') },

      {
        path: 'products/:id',
        // Dynamic title with a ResolveFn<string>.
        title: productTitleResolver,
        // Resolved data; with withComponentInputBinding() it is bound to the `product` input.
        resolve: { product: productResolver },
        // Static data, also bound to an input of the same name.
        data: { section: 'catalog' },
        loadComponent: () => import('./product-detail/product-detail'),
      },

      // Function redirect (v18+): runs in an injection context and can read params.
      // Docs: https://angular.dev/api/router/RedirectFunction
      {
        path: 'legacy-product/:id',
        redirectTo: ({ params }) =>
          inject(Router).createUrlTree(['/routing/products', params['id']], { queryParams: { from: 'legacy' } }),
      },

      // CanActivate (functional).
      { path: 'admin', title: 'Admin · Routing', canActivate: [authGuard], loadComponent: () => import('./demo-pages/admin-panel') },

      // Legacy class-based guard adapted with mapToCanActivate.
      {
        path: 'legacy-admin',
        canActivate: mapToCanActivate([LegacyAuthGuard]),
        loadComponent: () => import('./demo-pages/admin-panel'),
      },
      { path: 'denied', title: 'Denied · Routing', loadComponent: () => import('./demo-pages/access-denied') },

      // CanDeactivate: "unsaved changes" protection.
      {
        path: 'editor',
        title: 'Editor · Routing',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./editor/unsaved-editor'),
      },

      // CanMatch: same path twice. If the guard returns false the router falls through
      // to the next matching route instead of cancelling the navigation.
      { path: 'dashboard', canMatch: [betaDashboardGuard], loadComponent: () => import('./demo-pages/beta-dashboard') },
      { path: 'dashboard', loadComponent: () => import('./demo-pages/stable-dashboard') },

      // Route-level providers: only this route subtree can inject them.
      // Docs: https://angular.dev/guide/routing/define-routes#route-level-providers-for-dependency-injection
      {
        path: 'scoped',
        providers: [{ provide: ROUTE_GREETING, useValue: 'Hello from the route injector 👋' }, ScopedVisitCounter],
        loadComponent: () => import('./demo-pages/scoped-provider-demo'),
      },

      // Wildcard inside the feature: unknown /routing/xyz -> products list.
      { path: '**', redirectTo: 'products' },
    ],
  },
] satisfies Routes;
