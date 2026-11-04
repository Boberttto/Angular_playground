import { Component, inject, signal } from '@angular/core';
import { HookTrace } from '../hook-trace/hook-trace';
import { HookTraceView } from '../hook-trace/hook-trace-view';
import { HookSpy } from './hook-spy';

/** Toggles an element carrying the HookSpy directive and changes its input. */
@Component({
  selector: 'app-directive-hooks-demo',
  imports: [HookSpy, HookTraceView],
  providers: [HookTrace],
  templateUrl: './directive-hooks-demo.html',
})
export class DirectiveHooksDemo {
  private readonly trace = inject(HookTrace);
  protected readonly show = signal(false);
  protected readonly value = signal(1);

  protected toggle(): void {
    this.trace.begin(this.show() ? 'remove host element' : 'add host element');
    this.show.update((v) => !v);
  }

  protected change(): void {
    this.trace.begin('change directive input');
    this.value.update((v) => v + 1);
  }
}
