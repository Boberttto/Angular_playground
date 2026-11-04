import { Component, inject, signal } from '@angular/core';
import { CounterStore } from './counter-store';
import { GreetingCard } from './greeting-card';
import { RatingBadge } from './rating-badge';
import { TruncatePipe } from './truncate.pipe';

/** Shows on screen the units that the *.spec.ts files in this folder test. */
@Component({
  selector: 'app-testing-showcase',
  imports: [TruncatePipe, RatingBadge, GreetingCard],
  templateUrl: './testing-showcase.html',
})
export class TestingShowcase {
  protected readonly store = inject(CounterStore);
  protected readonly lastSelected = signal<number | null>(null);
  protected readonly longText = 'Vitest is the default unit test runner for new Angular CLI projects';
}
