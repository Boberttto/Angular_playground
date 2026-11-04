import { Routes } from '@angular/router';

export default [
  { path: '', loadComponent: () => import('./change-detection-page') },
] satisfies Routes;
