import { Routes } from '@angular/router';

/**
 * Every module is lazy loaded with `loadChildren` so each one gets its own JS chunk.
 * Docs: https://angular.dev/guide/routing/define-routes#lazily-loaded-components-and-routes
 */
export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home') },
  { path: 'basics', title: 'Basics', loadChildren: () => import('./modules/01-basics/basics.routes') },
  { path: 'components', title: 'Components', loadChildren: () => import('./modules/02-components/components.routes') },
  { path: 'lifecycle', title: 'Lifecycle hooks', loadChildren: () => import('./modules/03-lifecycle/lifecycle.routes') },
  { path: 'signals', title: 'Signals', loadChildren: () => import('./modules/04-signals/signals.routes') },
  { path: 'di-services', title: 'DI & services', loadChildren: () => import('./modules/05-di-services/di-services.routes') },
  { path: 'rxjs', title: 'RxJS', loadChildren: () => import('./modules/06-rxjs/rxjs.routes') },
  { path: 'routing', title: 'Routing', loadChildren: () => import('./modules/07-routing/routing.routes') },
  { path: 'forms', title: 'Forms', loadChildren: () => import('./modules/08-forms/forms.routes') },
  { path: 'http', title: 'HTTP & resources', loadChildren: () => import('./modules/09-http/http.routes') },
  { path: 'change-detection', title: 'Change detection', loadChildren: () => import('./modules/10-change-detection/change-detection.routes') },
  { path: 'directives-pipes', title: 'Directives & pipes', loadChildren: () => import('./modules/11-directives-pipes/directives-pipes.routes') },
  { path: 'advanced', title: 'Advanced', loadChildren: () => import('./modules/12-advanced/advanced.routes') },
  { path: 'sandbox', title: 'Sandbox', loadComponent: () => import('./sandbox/sandbox') },
  { path: '**', redirectTo: '' },
];
