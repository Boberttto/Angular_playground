import { Component, signal } from '@angular/core';
import { StarRating } from './star-rating';

/** Parent side of two-way binding with a signal: [(value)]="rating". */
@Component({
  selector: 'app-inputs-model-demo',
  imports: [StarRating],
  template: `
    <app-star-rating label="Two-way with a signal" [(value)]="rating" max="7" />
    <app-star-rating label="Read-only (disabled)" [value]="rating()" disabled />
    <p>Parent signal <code>rating()</code> = <strong>{{ rating() }}</strong></p>
    <button type="button" class="secondary" (click)="rating.set(0)">Parent: rating.set(0)</button>
  `,
})
export class InputsModelDemo {
  protected readonly rating = signal(3);
}
