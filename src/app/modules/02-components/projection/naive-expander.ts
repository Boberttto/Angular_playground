import { Component, signal } from '@angular/core';

/**
 * ⚠️ Anti-pattern: <ng-content> inside @if. The projected content is STILL created
 * (constructors run) even while hidden — the parent owns it, not this component.
 */
@Component({
  selector: 'app-naive-expander',
  template: `
    <button type="button" class="secondary" (click)="open.set(!open())">{{ open() ? '▼' : '▶' }} naive (ng-content in &#64;if)</button>
    @if (open()) {
      <div class="content"><ng-content /></div>
    }
  `,
  styles: `.content { padding: 8px; border-left: 3px solid #c62828; }`,
})
export class NaiveExpander {
  protected readonly open = signal(false);
}
