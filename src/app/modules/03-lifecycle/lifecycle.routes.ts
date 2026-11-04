import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./lifecycle-page') },
] satisfies Routes;
