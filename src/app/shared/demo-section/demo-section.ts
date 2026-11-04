import { Component, input } from '@angular/core';

/**
 * Card wrapper for one demo. Uses content projection (<ng-content>) so each
 * demo provides its own body.
 * Docs: https://angular.dev/guide/components/content-projection
 */
@Component({
  selector: 'app-demo-section',
  templateUrl: './demo-section.html',
  styleUrl: './demo-section.scss',
})
export class DemoSection {
  /** Title of the demo. */
  readonly heading = input.required<string>();
  /** Optional link to the official documentation. */
  readonly docs = input<string>();
}
