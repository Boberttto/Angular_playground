import { Directive, TemplateRef, ViewContainerRef, effect, inject, input, untracked } from '@angular/core';

/** Variables offered to the template: let i = index, let last = last, let n (=$implicit). */
export interface RepeatContext {
  $implicit: number;
  index: number;
  count: number;
  last: boolean;
}

/**
 * Structural directive WITH a context, to understand the microsyntax:
 *   <li *appRepeat="3; let i = index; let isLast = last">
 * desugars to
 *   <ng-template [appRepeat]="3" let-i="index" let-isLast="last"><li>…</li></ng-template>
 */
@Directive({
  selector: '[appRepeat]',
})
export class Repeat {
  private readonly templateRef = inject<TemplateRef<RepeatContext>>(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);

  readonly appRepeat = input.required<number>();

  /** Tells the template type checker the type of the context → `let i = index` is a number. */
  static ngTemplateContextGuard(_dir: Repeat, ctx: unknown): ctx is RepeatContext {
    return true;
  }

  constructor() {
    effect(() => {
      const count = Math.max(0, Math.floor(this.appRepeat()));
      untracked(() => {
        this.viewContainer.clear();
        for (let index = 0; index < count; index++) {
          this.viewContainer.createEmbeddedView(this.templateRef, {
            $implicit: index,
            index,
            count,
            last: index === count - 1,
          });
        }
      });
    });
  }
}
