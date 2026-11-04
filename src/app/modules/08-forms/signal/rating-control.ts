import { Component, input, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

/**
 * Custom control for SIGNAL FORMS: no ControlValueAccessor, no providers.
 * Implementing FormValueControl<T> only requires a `value` model(); the [formField] directive
 * binds the field value to it, and fills the optional inputs (disabled, errors, touched...).
 * Emitting `touch` marks the field as touched.
 * Docs: https://angular.dev/guide/forms/signals/custom-controls
 */
@Component({
  selector: 'app-rating-control',
  template: `@for (n of stars; track n) {
    <button type="button" class="star" [class.on]="n <= value()" [disabled]="disabled()"
      (click)="value.set(n)" (blur)="touch.emit()" [attr.aria-label]="n + ' stars'">★</button>
  }`,
  styleUrl: '../star-rating/star-rating.scss',
})
export class RatingControl implements FormValueControl<number> {
  readonly value = model(0); // required by FormValueControl
  readonly disabled = input(false); // optional, bound automatically from the field state
  readonly touch = output<void>(); // optional, the FormField directive listens to it

  protected readonly stars = [1, 2, 3, 4, 5];
}
