import { Component, computed, contentChildren, inject, input, signal } from '@angular/core';

/**
 * <app-tabs> discovers its <app-tab> children with contentChildren() — the classic
 * "compound component" pattern (like mat-tab-group / mat-tab).
 * Docs: https://angular.dev/guide/components/queries#content-queries
 */
@Component({
  selector: 'app-tabs',
  template: `
    <div class="headers" role="tablist">
      @for (tab of tabs(); track tab; let i = $index) {
        <button type="button" role="tab" [class.secondary]="i !== activeIndex()" (click)="activeIndex.set(i)">{{ tab.label() }}</button>
      }
    </div>
    <div class="panel"><ng-content /></div>
    <small class="muted">contentChildren found {{ tabs().length }} tab(s)</small>
  `,
  styles: `.headers { display: flex; gap: 4px; } .panel { border: 1px solid #e2e2ec; padding: 8px; margin-top: 4px; }`,
})
export class Tabs {
  // Signal of a ReadonlyArray, updated when tabs are added/removed (e.g. by @if in the parent).
  readonly tabs = contentChildren(Tab);
  readonly activeIndex = signal(0);
  readonly activeTab = computed(() => this.tabs()[this.activeIndex()]);
}

@Component({
  selector: 'app-tab',
  // The tab itself decides to show its content by reading the parent state:
  // no parent writes into child state (avoids ExpressionChanged errors).
  template: `@if (active()) { <ng-content /> }`,
})
export class Tab {
  readonly label = input.required<string>();
  // A child can inject an ancestor component/directive instance.
  private readonly tabsParent = inject(Tabs);
  protected readonly active = computed(() => this.tabsParent.activeTab() === this);
}
