import { AfterViewInit, Component, inject, input } from '@angular/core';
import { StatusState } from './status-state';

/** Child that writes state its PARENT already rendered, from ngAfterViewInit. */
@Component({
  selector: 'app-status-reporter',
  template: `<p class="muted">child: sets the status in ngAfterViewInit via a {{ useSignal() ? 'signal' : 'plain field' }}</p>`,
})
export class StatusReporter implements AfterViewInit {
  readonly useSignal = input(false);
  private readonly state = inject(StatusState);

  ngAfterViewInit(): void {
    if (this.useSignal()) {
      // ✅ Signal: Angular knows the parent must be refreshed again -> no error.
      this.state.sig.set('ready');
    } else {
      // ❌ Plain field the parent already rendered -> NG0100 in dev mode (see the console).
      this.state.plain = 'ready';
    }
  }
}
