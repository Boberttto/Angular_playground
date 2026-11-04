import { Component, signal } from '@angular/core';
import { FlakyWidget } from './flaky-widget';

/**
 * @boundary (developer preview in v22): catches errors thrown while rendering / change
 * detecting its content and shows the @error block instead of breaking the whole app.
 * Docs: https://angular.dev/guide/templates/error-boundaries
 */
@Component({
  selector: 'app-boundary-demo',
  imports: [FlakyWidget],
  templateUrl: './boundary-demo.html',
})
export class BoundaryDemo {
  protected readonly explode = signal(false);
}
