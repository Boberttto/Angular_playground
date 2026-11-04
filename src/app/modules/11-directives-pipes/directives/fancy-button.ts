import { Component, inject } from '@angular/core';
import { ClickCounter } from './click-counter';
import { Tooltip } from './tooltip';

/**
 * Directive composition API: behaviours are attached to the HOST of this component at compile time.
 * Their inputs/outputs are private unless re-exposed (optionally with an alias).
 * Docs: https://angular.dev/guide/directives/directive-composition-api
 */
@Component({
  selector: 'app-fancy-button',
  hostDirectives: [
    { directive: Tooltip, inputs: ['appTooltip: tip'] }, // exposed as [tip]
    { directive: ClickCounter, outputs: ['countChange'] }, // exposed as (countChange)
  ],
  host: { role: 'button', tabindex: '0' },
  template: `<ng-content /> <small>({{ counter.count() }})</small>`,
  styleUrl: './fancy-button.scss',
})
export class FancyButton {
  // A component can inject its host directives (and vice-versa).
  protected readonly counter = inject(ClickCounter);
}
