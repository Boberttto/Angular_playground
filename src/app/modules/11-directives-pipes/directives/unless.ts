import { Directive, TemplateRef, ViewContainerRef, effect, inject, input, untracked } from '@angular/core';

/**
 * STRUCTURAL directive: the opposite of @if. Usage: <p *appUnless="condition">…</p>
 * The `*` is sugar for: <ng-template [appUnless]="condition"><p>…</p></ng-template>
 * Docs: https://angular.dev/guide/directives/structural-directives
 */
@Directive({
  selector: '[appUnless]',
})
export class Unless {
  // The <ng-template> this directive sits on, and the place where we can stamp it.
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private hasView = false;

  readonly appUnless = input.required<boolean>();

  constructor() {
    effect(() => {
      const condition = this.appUnless();
      // untracked: creating the view must not make this effect depend on other signals.
      untracked(() => {
        if (!condition && !this.hasView) {
          this.viewContainer.createEmbeddedView(this.templateRef);
          this.hasView = true;
        } else if (condition && this.hasView) {
          this.viewContainer.clear();
          this.hasView = false;
        }
      });
    });
  }
}
