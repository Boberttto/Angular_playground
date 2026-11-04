import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./basics-page') },
] satisfies Routes;
