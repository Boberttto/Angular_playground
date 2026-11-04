import { Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Custom form control for REACTIVE and TEMPLATE-DRIVEN forms via ControlValueAccessor (CVA).
 * The forms API talks to the control only through these 4 methods.
 * Docs: https://angular.dev/api/forms/ControlValueAccessor
 */
@Component({
  selector: 'app-star-rating',
  // Register this component as the value accessor of its host element.
  // forwardRef because the class is not defined yet when the decorator is evaluated.
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarRating), multi: true }],
  template: `@for (n of stars; track n) {
    <button type="button" class="star" [class.on]="n <= value()" [disabled]="disabled()"
      (click)="rate(n)" (blur)="onTouched()" [attr.aria-label]="n + ' stars'">★</button>
  }`,
  styleUrl: './star-rating.scss',
})
export class StarRating implements ControlValueAccessor {
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly value = signal(0);
  protected readonly disabled = signal(false);

  private onChange: (value: number) => void = () => {};
  protected onTouched: () => void = () => {};

  /** Model -> view (called by the forms API, e.g. setValue / initial value). */
  writeValue(value: number | null): void {
    this.value.set(value ?? 0);
  }

  /** Gives us the callback to notify view -> model changes. */
  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  /** Gives us the callback to mark the control as touched. */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** Optional: called when control.disable() / enable() is used. */
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected rate(n: number): void {
    this.value.set(n);
    this.onChange(n);
  }
}
