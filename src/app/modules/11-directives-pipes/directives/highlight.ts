import { Directive, input, signal } from '@angular/core';

/**
 * ATTRIBUTE directive: changes the look/behaviour of its host element. No template.
 * Everything is declarative through `host` metadata (preferred over @HostBinding/@HostListener).
 * Docs: https://angular.dev/guide/directives/attribute-directives
 */
@Directive({
  selector: '[appHighlight]',
  // Lets a template grab the directive instance: <p appHighlight #h="appHighlight">
  exportAs: 'appHighlight',
  host: {
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
    '[style.background-color]': 'hovered() ? color() : null',
    '[style.transition]': '"background-color 150ms"',
    '[class.is-hovered]': 'hovered()',
  },
})
export class Highlight {
  // Input named like the selector: [appHighlight]="'gold'" applies the directive AND sets the color.
  readonly appHighlight = input('');
  readonly defaultColor = input('#fde8ee');
  readonly hovered = signal(false);

  // Read by the host binding above. A method is fine here: called only when the host is checked.
  protected color(): string {
    return this.appHighlight() || this.defaultColor();
  }
}
