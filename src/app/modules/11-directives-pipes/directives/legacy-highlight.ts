import { Directive, ElementRef, HostBinding, HostListener, Input, Renderer2, inject } from '@angular/core';

/**
 * Legacy syntax (still supported): @Input, @HostBinding, @HostListener.
 * The docs say these decorators "exist exclusively for backwards compatibility" → prefer `host: {}`.
 * Docs: https://angular.dev/guide/components/host-elements#the-hostbinding-and-hostlistener-decorators
 */
@Directive({
  selector: '[appLegacyHighlight]',
})
export class LegacyHighlight {
  @Input() appLegacyHighlight = '';

  // Same as host: { '[class.is-hovered]': 'hovered' }
  @HostBinding('class.is-hovered') hovered = false;

  // Imperative DOM access through Renderer2. For simple style changes the docs say it is equivalent
  // to the native DOM API; Renderer2 matters when CREATING elements (style encapsulation) or for animations.
  // Docs: https://angular.dev/guide/components/dom-apis#using-a-components-renderer
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  // Same as host: { '(mouseenter)': 'onEnter()' }
  @HostListener('mouseenter')
  onEnter(): void {
    this.hovered = true;
    this.renderer.setStyle(this.el.nativeElement, 'background-color', this.appLegacyHighlight || 'lightyellow');
  }

  // The second argument maps template locals ($event) to method parameters.
  @HostListener('mouseleave', ['$event'])
  onLeave(event: MouseEvent): void {
    this.hovered = false;
    this.renderer.removeStyle(this.el.nativeElement, 'background-color');
    void event; // shown only to illustrate the ['$event'] argument
  }
}
