import { Component, inject, signal } from '@angular/core';
import { CallStats } from './call-stats';
import { CallStatsPanel } from './call-stats-panel';
import { JoinImpurePipe, JoinPurePipe } from './join-pipes';
import { TruncatePipe } from './truncate-pipe';

/**
 * Pure vs impure pipe vs method call, with live call counters.
 * Docs: https://angular.dev/guide/templates/pipes#change-detection-with-pipes
 */
@Component({
  selector: 'app-custom-pipes-demo',
  imports: [TruncatePipe, JoinPurePipe, JoinImpurePipe, CallStatsPanel],
  providers: [CallStats],
  templateUrl: './pipes-demo.html',
  styleUrl: './pipes-demo.scss',
})
export class CustomPipesDemo {
  private readonly stats = inject(CallStats);

  // Truncate demo
  protected readonly text = signal('Angular pipes transform values declaratively in templates.');
  protected readonly limit = signal(20);

  // A plain MUTABLE array on purpose, to show what pure pipes miss.
  protected fruits: string[] = ['apple', 'banana'];
  protected readonly unrelated = signal(0);
  private nextFruit = 1;

  // ⚠️ A method called from the template runs on EVERY check of this view (like an impure pipe).
  protected joinViaMethod(items: readonly string[]): string {
    this.stats.increment('method');
    return items.join(', ');
  }

  protected mutate(): void {
    // Same reference → a pure pipe does NOT see this change.
    this.fruits.push(`fruit${this.nextFruit++}`);
  }

  protected replace(): void {
    // New reference → every approach sees it.
    this.fruits = [...this.fruits, `fruit${this.nextFruit++}`];
  }

  protected bumpUnrelated(): void {
    this.unrelated.update((n) => n + 1);
  }
}
