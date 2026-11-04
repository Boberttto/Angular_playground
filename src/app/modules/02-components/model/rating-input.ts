import { Component, input, model } from '@angular/core';

/**
 * A custom "form-like" control supporting [(rating)].
 * model() = a writable input + an implicit output named `ratingChange`.
 * Docs: https://angular.dev/api/core/model
 */
@Component({
  selector: 'app-rating-input',
  template: `
    @for (star of stars(); track star) {
      <button type="button" class="star" [class.on]="star <= rating()" (click)="rating.set(star)" [attr.aria-label]="star + ' stars'">★</button>
    }
    <button type="button" class="secondary" (click)="rating.set(0)">reset</button>
  `,
  styles: `.star { background: none; border: none; color: #ccc; font-size: 1.4rem; padding: 0 2px; } .on { color: #b26a00; }`,
})
export class RatingInput {
  readonly rating = model(0);
  readonly max = input(5);
  protected stars(): number[] {
    return Array.from({ length: this.max() }, (_, i) => i + 1);
  }
}
