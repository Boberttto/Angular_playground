import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./rxjs-page') },
] satisfies Routes;
