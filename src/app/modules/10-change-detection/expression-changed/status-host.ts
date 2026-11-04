import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { StatusReporter } from './status-reporter';
import { StatusState } from './status-state';

/**
 * Parent rendering a value that its child changes in ngAfterViewInit, i.e. AFTER the parent's
 * bindings were checked. Docs: https://angular.dev/errors/NG0100
 */
@Component({
  selector: 'app-status-host',
  imports: [StatusReporter],
  providers: [StatusState],
  // Eager: the dev-mode checkNoChanges pass re-checks this template and spots the change.
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <p>{{ useSignal() ? 'signal status' : 'plain status' }} = <strong>{{ useSignal() ? state.sig() : state.plain }}</strong></p>
    <app-status-reporter [useSignal]="useSignal()" />
  `,
})
export class StatusHost {
  readonly useSignal = input(false);
  protected readonly state = inject(StatusState);
}
