import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { map, timer } from 'rxjs';
import { TAKEN_USERNAMES } from '../shared/sign-up';

// Docs: https://angular.dev/guide/forms/form-validation

/** Custom SYNC validator factory: returns null when valid, an error object otherwise. */
export function forbiddenNameValidator(forbidden: RegExp): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    forbidden.test(control.value) ? { forbiddenName: { value: control.value } } : null;
}

/**
 * Custom ASYNC validator: returns an Observable (or Promise) of errors|null.
 * Angular runs async validators only when all sync validators pass, and sets status to PENDING meanwhile.
 * Docs: https://angular.dev/guide/forms/form-validation
 */
export const usernameTakenValidator: AsyncValidatorFn = (control: AbstractControl<string>) =>
  // `timer` simulates an HTTP call. If the value changes, the previous subscription is cancelled.
  timer(500).pipe(
    map(() => (TAKEN_USERNAMES.includes(control.value.toLowerCase()) ? { usernameTaken: true } : null)),
  );

/**
 * CROSS-FIELD validator: attached to the parent FormGroup so it can read both children.
 * Docs: https://angular.dev/guide/forms/form-validation#cross-field-validation
 */
export const passwordsMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
};
