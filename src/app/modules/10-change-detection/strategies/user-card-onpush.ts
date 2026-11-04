import { ChangeDetectorRef, Component, inject, input } from '@angular/core';
import { injectRenderCounter } from '../render-counter';
import { User } from './user';

/**
 * OnPush: the DEFAULT since Angular 22 (no `changeDetection` needed). Refreshed only when dirty:
 * new input reference (Object.is), event in its subtree, signal it reads, markForCheck().
 * Docs: https://angular.dev/best-practices/skipping-subtrees#using-onpush
 */
@Component({
  selector: 'app-user-card-onpush',
  host: { class: 'onpush' },
  template: `<span class="render-count"></span>{{ renders.mark() }}
    <div class="name">OnPush child (default)</div>
    user.name = <strong>{{ user().name }}</strong>`,
  styleUrl: '../cd-card.scss',
})
export class UserCardOnPush {
  readonly user = input.required<User>();
  protected readonly renders = injectRenderCounter();
  private readonly cdr = inject(ChangeDetectorRef);

  /** Called by the parent: marks this view (and ancestors) dirty and schedules CD. */
  markForCheck(): void {
    // Docs: https://angular.dev/api/core/ChangeDetectorRef#markForCheck
    this.cdr.markForCheck();
  }
}
