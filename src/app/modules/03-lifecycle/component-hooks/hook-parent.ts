import { Component, inject, signal, viewChild } from '@angular/core';
import { HookTrace } from '../hook-trace/hook-trace';
import { HookTraceView } from '../hook-trace/hook-trace-view';
import { HookChild } from './hook-child';

/**
 * Parent with controls that drive the child's lifecycle.
 * It provides its own HookTrace (component-level provider) shared with the child.
 * IMPORTANT: this template never reads the trace signals (HookTraceView does), otherwise
 * flushing the log would re-render this parent and call the child's hooks again.
 */
@Component({
  selector: 'app-hook-parent',
  imports: [HookChild, HookTraceView],
  providers: [HookTrace],
  templateUrl: './hook-parent.html',
  styleUrl: './hook-parent.scss',
})
export class HookParent {
  private readonly trace = inject(HookTrace);
  private readonly child = viewChild(HookChild);

  protected readonly showChild = signal(true);
  protected readonly label = signal('Ada');
  protected readonly count = signal(0);
  protected readonly projectedText = signal('Hello from the parent');
  private readonly names = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan'];

  constructor() {
    this.trace.begin('initial render (child created)');
  }

  protected changeLabel(): void {
    this.trace.begin('parent changes [label] binding');
    const next = this.names[(this.names.indexOf(this.label()) + 1) % this.names.length];
    this.label.set(next);
  }

  protected incrementViaBinding(): void {
    this.trace.begin('parent changes [legacyCount] binding');
    this.count.update((n) => n + 1);
  }

  protected setDirectly(): void {
    this.trace.begin('parent sets child.legacyCount = 999 DIRECTLY in TypeScript');
    const c = this.child();
    // No ngOnChanges, and the OnPush child is not refreshed (the value shown stays stale).
    // Docs: https://angular.dev/best-practices/skipping-subtrees#edge-cases
    if (c) c.legacyCount = 999;
  }

  protected changeProjected(): void {
    this.trace.begin('parent changes PROJECTED content');
    this.projectedText.set(`Projected @ ${new Date().toLocaleTimeString()}`);
  }

  protected toggleChild(): void {
    this.trace.begin(this.showChild() ? 'hide child (@if → false)' : 'show child (@if → true)');
    this.showChild.update((v) => !v);
  }

  protected noop(): void {
    // A template listener alone schedules change detection: hooks run although nothing changed.
    this.trace.begin('parent click handler that changes NOTHING');
  }
}
