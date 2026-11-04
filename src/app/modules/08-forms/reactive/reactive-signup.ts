import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { StarRating } from '../star-rating/star-rating';
import { forbiddenNameValidator, passwordsMatchValidator, usernameTakenValidator } from './validators';

/**
 * Reactive (typed) forms: the form model lives in the component class, the template only binds to it.
 * Docs: https://angular.dev/guide/forms/reactive-forms
 */
@Component({
  selector: 'app-reactive-signup',
  imports: [ReactiveFormsModule, JsonPipe, StarRating, LogPanel],
  templateUrl: './reactive-signup.html',
  styleUrl: './reactive-signup.scss',
})
export class ReactiveSignup {
  // NonNullableFormBuilder: every control is created with nonNullable: true,
  // so reset() goes back to the initial value instead of null, and types have no `| null`.
  // Docs: https://angular.dev/guide/forms/typed-forms#nonnullableformbuilder
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly log = new EventLog(30);

  // Type is inferred: FormGroup<{ username: FormControl<string>; ... }>
  protected readonly form = this.fb.group({
    username: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(3), forbiddenNameValidator(/admin/i)],
      asyncValidators: [usernameTakenValidator],
    }),
    email: ['', [Validators.required, Validators.email]],
    // Nested group with a cross-field validator.
    account: this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordsMatchValidator },
    ),
    // FormArray: dynamic list of controls.
    skills: this.fb.array([this.fb.control('Angular', Validators.required)]),
    // Custom ControlValueAccessor-based control.
    rating: [3, Validators.min(1)],
  });

  constructor() {
    // valueChanges is an Observable -> any RxJS operator works.
    this.form.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed())
      .subscribe((value) => this.log.add(`valueChanges: ${JSON.stringify(value)}`));
    this.form.statusChanges
      .pipe(takeUntilDestroyed())
      .subscribe((status) => this.log.add(`statusChanges: ${status}`, status === 'VALID' ? 'success' : 'warning'));
  }

  protected get skills() {
    return this.form.controls.skills;
  }

  protected addSkill(): void {
    this.skills.push(this.fb.control('', Validators.required));
  }

  protected removeSkill(index: number): void {
    this.skills.removeAt(index);
  }

  protected toggleRating(): void {
    const rating = this.form.controls.rating;
    rating.enabled ? rating.disable() : rating.enable(); // calls setDisabledState on the CVA
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.log.add('Submit blocked: form invalid', 'error');
      return;
    }
    // getRawValue() includes disabled controls; .value excludes them.
    this.log.add(`Submitted: ${JSON.stringify(this.form.getRawValue())}`, 'success');
    this.form.reset(); // non-nullable -> back to initial values
  }
}
