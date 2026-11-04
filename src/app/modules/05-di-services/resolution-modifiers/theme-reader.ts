import { Component, inject, input } from '@angular/core';
import { THEME } from './theme';

/** Displays which THEME it receives (used to compare providers vs viewProviders). */
@Component({
  selector: 'app-theme-reader',
  template: `<div>{{ label() }} → <strong>{{ theme }}</strong></div>`,
})
export class ThemeReader {
  readonly label = input.required<string>();
  protected readonly theme = inject(THEME, { optional: true }) ?? 'null (not visible)';
}
