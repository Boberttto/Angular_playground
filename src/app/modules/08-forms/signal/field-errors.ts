import { Component, input } from '@angular/core';
import { ValidationError } from '@angular/forms/signals';

/** Displays the `message` of signal-forms validation errors once the field is touched. */
@Component({
  selector: 'app-field-errors',
  template: `@if (show()) {
    @for (error of errors(); track error.kind) {
      <small class="error">{{ error.message ?? error.kind }}</small>
    }
  }`,
  styles: `:host { display: flex; flex-direction: column; }`,
})
export class FieldErrors {
  readonly errors = input.required<readonly ValidationError[]>();
  readonly show = input(true);
}
