import { Component, signal } from '@angular/core';
import { RatingInput } from './rating-input';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/**
 * Three ways to bind a model() input from the parent.
 * Docs: https://angular.dev/guide/components/inputs#model-inputs
 */
@Component({
  selector: 'app-model-demo',
  imports: [RatingInput, LogPanel],
  templateUrl: './model-demo.html',
})
export class ModelDemo {
  protected readonly log = new EventLog();
  // 1. Bind a WritableSignal: pass the signal itself (no parentheses).
  protected readonly movieRating = signal(3);
  // 2. Bind a plain property: also supported.
  protected bookRating = 4;
  // 3. One-way + explicit change event.
  protected readonly gameRating = signal(2);

  protected onGameChange(value: number): void {
    this.log.add(`(ratingChange) emitted ${value}`);
    this.gameRating.set(value);
  }
}
