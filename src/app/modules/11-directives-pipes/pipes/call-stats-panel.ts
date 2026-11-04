import { Component, inject } from '@angular/core';
import { CallStats } from './call-stats';

/** Isolated view that displays the counters (see CallStats for why it must be separate). */
@Component({
  selector: 'app-call-stats-panel',
  template: `
    <div class="stats">
      <span>pure pipe: <strong>{{ stats.snapshot().pure }}</strong></span>
      <span>impure pipe: <strong>{{ stats.snapshot().impure }}</strong></span>
      <span>method in template: <strong>{{ stats.snapshot().method }}</strong></span>
      <button type="button" class="secondary" (click)="stats.reset()">Reset counters</button>
    </div>
  `,
  styles: `.stats { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-family: monospace; }`,
})
export class CallStatsPanel {
  protected readonly stats = inject(CallStats);
}
