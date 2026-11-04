import { Component, TemplateRef, contentChild, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

/** Context exposed to the consumer's <ng-template let-count>. */
export interface ExpanderContext {
  $implicit: number;
}

/**
 * ✅ Conditional / lazy projection: the consumer passes an <ng-template>, we render it with
 * ngTemplateOutlet only when open. Nothing is instantiated until then, and it is destroyed on close.
 * Docs: https://angular.dev/guide/templates/ng-template
 */
@Component({
  selector: 'app-lazy-expander',
  imports: [NgTemplateOutlet],
  template: `
    <button type="button" class="secondary" (click)="toggle()">{{ open() ? '▼' : '▶' }} lazy (ng-template + ngTemplateOutlet)</button>
    @if (open()) {
      <div class="content">
        <ng-container [ngTemplateOutlet]="content() ?? null" [ngTemplateOutletContext]="{ $implicit: openCount() }" />
      </div>
    }
  `,
  styles: `.content { padding: 8px; border-left: 3px solid #1f8a4c; }`,
})
export class LazyExpander {
  // Content query: the first <ng-template> placed between <app-lazy-expander> tags.
  protected readonly content = contentChild<TemplateRef<ExpanderContext>>(TemplateRef);
  protected readonly open = signal(false);
  protected readonly openCount = signal(0);

  protected toggle(): void {
    if (!this.open()) this.openCount.update((n) => n + 1);
    this.open.update((o) => !o);
  }
}
