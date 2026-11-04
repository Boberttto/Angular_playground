import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./signals-page') },
] satisfies Routes;
