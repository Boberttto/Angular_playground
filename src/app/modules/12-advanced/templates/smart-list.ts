import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, input, TemplateRef } from '@angular/core';

/** Context object passed to the consumer's <ng-template let-item let-i="index">. */
export interface ListItemContext<T> {
  $implicit: T; // bound by `let-item` (no name)
  index: number; // bound by `let-i="index"`
}

/**
 * Generic list: the PARENT decides how an item looks by projecting an <ng-template>.
 * The list grabs it with contentChild(TemplateRef) and stamps it with ngTemplateOutlet + context.
 * Docs: https://angular.dev/guide/templates/ng-template
 */
@Component({
  selector: 'app-smart-list',
  imports: [NgTemplateOutlet],
  template: `<ul>
    @for (item of items(); track $index) {
      <li><ng-container [ngTemplateOutlet]="itemTemplate() ?? fallback" [ngTemplateOutletContext]="{ $implicit: item, index: $index }" /></li>
    }
  </ul>
  <ng-template #fallback let-item>{{ item }}</ng-template>`,
})
export class SmartList<T> {
  readonly items = input.required<readonly T[]>();
  protected readonly itemTemplate = contentChild<TemplateRef<ListItemContext<T>>>(TemplateRef);
}
