import { Component } from '@angular/core';
import { ThemeReader } from './theme-reader';
import { THEME } from './theme';

/**
 * providers vs viewProviders:
 * - `providers`     → visible to the component's view AND to projected content (<ng-content>).
 * - `viewProviders` → visible ONLY to the component's own view (template), not to projected content.
 * When both define the same token, the view sees the viewProviders value.
 * Docs: https://angular.dev/guide/di/hierarchical-dependency-injection#providers-vs-viewproviders
 */
@Component({
  selector: 'app-view-providers-host',
  providers: [{ provide: THEME, useValue: 'from providers 🌍' }],
  viewProviders: [{ provide: THEME, useValue: 'from viewProviders 🔒' }],
  imports: [ThemeReader],
  template: `
    <app-theme-reader label="Child declared in the host's template" />
    <ng-content />
  `,
})
export class ViewProvidersHost {}
