import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./di-services-page') },
] satisfies Routes;
