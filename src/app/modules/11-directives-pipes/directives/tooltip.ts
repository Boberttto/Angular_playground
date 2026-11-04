import { Directive, input, signal } from '@angular/core';

/** Reusable behaviour #1: a tiny CSS tooltip driven by host bindings. */
@Directive({
  selector: '[appTooltip]',
  host: {
    '[attr.data-tooltip]': 'appTooltip()',
    '[attr.aria-label]': 'appTooltip()',
    '[class.tooltip-visible]': 'visible()',
    '(mouseenter)': 'visible.set(true)',
    '(mouseleave)': 'visible.set(false)',
    '(focus)': 'visible.set(true)',
    '(blur)': 'visible.set(false)',
  },
})
export class Tooltip {
  readonly appTooltip = input('');
  readonly visible = signal(false);
}
