import { Component, inject, signal } from '@angular/core';
import { HookTrace } from '../hook-trace/hook-trace';
import { HookTraceView } from '../hook-trace/hook-trace-view';
import { ServiceHost } from './service-host';

/** Creates / destroys a component that provides a service, and logs what the service gets. */
@Component({
  selector: 'app-service-hooks-demo',
  imports: [ServiceHost, HookTraceView],
  providers: [HookTrace],
  template: `
    <button type="button" (click)="toggle()">{{ show() ? 'Destroy' : 'Create' }} host component</button>
    @if (show()) {
      <app-service-host />
    }
    <app-hook-trace-view title="Service hook calls" />
  `,
})
export class ServiceHooksDemo {
  private readonly trace = inject(HookTrace);
  protected readonly show = signal(false);

  protected toggle(): void {
    this.trace.begin(this.show() ? 'destroy host (service destroyed with it)' : 'create host');
    this.show.update((v) => !v);
  }
}
