import { Component, DestroyRef, inject, input } from '@angular/core';
import { ProjectionLog } from './projection-log';

/**
 * Logs when it is created/destroyed, to SEE when projected content is instantiated.
 * Note: projected content is resolved by the injector of the template that DECLARES it
 * (ProjectionDemo here), not the component that receives it.
 */
@Component({
  selector: 'app-spy',
  template: `<span class="spy">🕵️ spy “{{ name() }}”</span>`,
  styles: `.spy { background: #fde8ee; padding: 0 4px; border-radius: 4px; }`,
})
export class Spy {
  readonly name = input.required<string>();
  private readonly projectionLog = inject(ProjectionLog).log;

  constructor() {
    // Inputs are not set yet in the constructor → log in a microtask (also avoids writing a
    // signal while the parent template is rendering).
    queueMicrotask(() => this.projectionLog.add(`Spy "${this.name()}" CREATED`, 'hook'));
    inject(DestroyRef).onDestroy(() => this.projectionLog.addDeferred(`Spy "${this.name()}" destroyed`, 'warning'));
  }
}
