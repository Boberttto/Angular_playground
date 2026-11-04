import { provideHttpClient, withInterceptors, withRequestsMadeViaParent } from '@angular/common/http';
import { Routes } from '@angular/router';
import { fakeBackendInterceptor } from './fake-backend.interceptor';

export default [
  {
    path: '',
    loadComponent: () => import('./http-page'),
    // Route-level HttpClient configuration (child EnvironmentInjector of this lazy route):
    // - withInterceptors([fakeBackendInterceptor]) adds an interceptor ONLY for this feature;
    // - withRequestsMadeViaParent() then forwards requests to the ROOT HttpClient, so they also go
    //   through the root interceptors (loggingInterceptor). Without it, this config would REPLACE the root one.
    // Docs: https://angular.dev/guide/http/setup#withrequestsmadeviaparent
    providers: [provideHttpClient(withInterceptors([fakeBackendInterceptor]), withRequestsMadeViaParent())],
  },
] satisfies Routes;
