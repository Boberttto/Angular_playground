import { Component, inject } from '@angular/core';
import { HookTrace } from '../hook-trace/hook-trace';
import { ScopedService } from './scoped-service';

/** Component that PROVIDES ScopedService: one service instance per ServiceHost instance. */
@Component({
  selector: 'app-service-host',
  providers: [ScopedService],
  template: `<p><code>&lt;app-service-host&gt;</code> alive · provides <code>ScopedService</code></p>`,
})
export class ServiceHost {
  private readonly trace = inject(HookTrace);

  constructor() {
    this.trace.record('host component', 'constructor (about to inject the service)');
    inject(ScopedService);
  }

  ngOnInit(): void {
    this.trace.record('host component', 'ngOnInit');
  }

  ngOnDestroy(): void {
    this.trace.record('host component', 'ngOnDestroy');
  }
}
