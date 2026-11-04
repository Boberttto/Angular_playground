import { DestroyRef, Directive, ElementRef, Renderer2, effect, inject, input } from '@angular/core';

/**
 * A directive that CREATES a DOM node (a badge) with Renderer2.
 * Elements created by a component's Renderer2 participate in that component's style encapsulation.
 * Never set innerHTML yourself (XSS): we write text with textContent.
 * ⚠️ With SSR hydration, appending nodes outside the template causes hydration errors
 * (https://angular.dev/guide/hydration#direct-dom-manipulation) — prefer a component in that case.
 * Docs: https://angular.dev/guide/components/dom-apis
 */
@Directive({
  selector: '[appBadge]',
  host: { '[style.position]': '"relative"' },
})
export class Badge {
  readonly appBadge = input.required<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly badge: HTMLElement = this.renderer.createElement('span');

  constructor() {
    this.renderer.setAttribute(this.badge, 'aria-hidden', 'true');
    for (const [prop, value] of Object.entries({
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      background: '#c3002f',
      color: '#fff',
      'border-radius': '10px',
      padding: '0 6px',
      'font-size': '0.75rem',
    })) {
      this.renderer.setStyle(this.badge, prop, value);
    }
    this.renderer.appendChild(this.host, this.badge);

    // Re-run whenever the input signal changes. setProperty avoids innerHTML (safe text only).
    effect(() => this.renderer.setProperty(this.badge, 'textContent', String(this.appBadge())));

    // Clean up what we created ourselves.
    inject(DestroyRef).onDestroy(() => this.renderer.removeChild(this.host, this.badge));
  }
}
