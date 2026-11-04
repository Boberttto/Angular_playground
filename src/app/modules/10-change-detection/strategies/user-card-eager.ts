import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { injectRenderCounter } from '../render-counter';
import { User } from './user';

/**
 * Eager (formerly "Default" / CheckAlways): its template is re-evaluated every time the
 * change detection traversal reaches it.
 * Docs: https://angular.dev/api/core/ChangeDetectionStrategy
 */
@Component({
  selector: 'app-user-card-eager',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'eager' },
  template: `<span class="render-count"></span>{{ renders.mark() }}
    <div class="name">Eager child</div>
    user.name = <strong>{{ user().name }}</strong>`,
  styleUrl: '../cd-card.scss',
})
export class UserCardEager {
  readonly user = input.required<User>();
  protected readonly renders = injectRenderCounter();
}
