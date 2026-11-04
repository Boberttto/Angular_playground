import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./directives-pipes-page') },
] satisfies Routes;
