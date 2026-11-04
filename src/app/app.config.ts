import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { loggingInterceptor } from './modules/09-http/logging.interceptor';

/**
 * Application-wide providers (root environment injector).
 * Note: Angular 22 apps are zoneless by default — no zone.js, no provideZoneChangeDetection().
 * Docs: https://angular.dev/guide/zoneless
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding(): route params / query params / data are bound to component inputs.
    // Docs: https://angular.dev/guide/routing/read-route-state#use-input-binding
    provideRouter(routes, withComponentInputBinding()),
    // Angular 22: the fetch backend is the default (`withFetch()` is deprecated, `withXhr()` opts back
    // into XMLHttpRequest). provideHttpClient() is still needed here to register interceptors.
    // Docs: https://angular.dev/guide/http/setup
    provideHttpClient(withInterceptors([loggingInterceptor])),
  ],
};
