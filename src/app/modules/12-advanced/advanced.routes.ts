import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./advanced-page') },
] satisfies Routes;
