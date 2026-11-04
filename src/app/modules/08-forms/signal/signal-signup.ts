import { JsonPipe } from '@angular/common';
import { Component, resource, signal } from '@angular/core';
import {
  applyEach,
  email,
  form,
  FormField,
  FormRoot,
  min,
  minLength,
  required,
  validate,
  validateAsync,
} from '@angular/forms/signals';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { fakeDelay, SignUp, TAKEN_USERNAMES } from '../shared/sign-up';
import { FieldErrors } from './field-errors';
import { RatingControl } from './rating-control';

const INITIAL: SignUp = { username: '', email: '', password: '', confirmPassword: '', skills: ['Angular'], rating: 3 };

/**
 * Signal Forms (stable in v22, `@angular/forms/signals`).
 * The model is a plain WritableSignal; form() wraps it in a FieldTree. The form does NOT
 * copy the data: editing a field writes straight into `model`.
 * Docs: https://angular.dev/guide/forms/signals/overview
 */
@Component({
  selector: 'app-signal-signup',
  imports: [FormField, FormRoot, JsonPipe, FieldErrors, RatingControl, LogPanel],
  templateUrl: './signal-signup.html',
  styleUrl: './signal-signup.scss',
})
export class SignalSignup {
  protected readonly log = new EventLog(10);
  protected readonly model = signal<SignUp>({ ...INITIAL, skills: [...INITIAL.skills] });

  // form(model, schemaFn, options). The schema function runs once (non-reactive);
  // the rules it declares are reactive.
  // Docs: https://angular.dev/guide/forms/signals/validation
  protected readonly signUpForm = form(
    this.model,
    (s) => {
      required(s.username, { message: 'Username is required' });
      minLength(s.username, 3, { message: 'Min 3 characters' });
      // Custom sync rule: return an error object, or null when valid.
      validate(s.username, ({ value }) =>
        /admin/i.test(value()) ? { kind: 'forbiddenName', message: '"admin" is reserved' } : null,
      );
      // Async rule backed by a resource(); only runs once all sync rules pass.
      // Docs: https://angular.dev/guide/forms/signals/async-operations
      validateAsync(s.username, {
        params: ({ value }) => value(),
        factory: (username) =>
          resource({
            params: username,
            loader: async ({ params, abortSignal }) => {
              await fakeDelay(500, abortSignal); // simulated server call, cancelled on new input
              return TAKEN_USERNAMES.includes(params.toLowerCase());
            },
          }),
        onSuccess: (taken) => (taken ? { kind: 'usernameTaken', message: 'Already taken (async rule)' } : null),
        onError: () => ({ kind: 'networkError', message: 'Could not check the username' }),
      });

      required(s.email, { message: 'Email is required' });
      email(s.email, { message: 'Invalid email' });

      required(s.password, { message: 'Password is required' });
      minLength(s.password, 8, { message: 'Min 8 characters' });

      // Cross-field rule: valueOf() reads another field; re-runs when either changes.
      // Docs: https://angular.dev/guide/forms/signals/cross-field-logic
      validate(s.confirmPassword, ({ value, valueOf }) =>
        value() !== valueOf(s.password) ? { kind: 'passwordMismatch', message: 'Passwords do not match' } : null,
      );

      // Rules for every item of an array field.
      applyEach(s.skills, (skill) => required(skill, { message: 'Skill cannot be empty' }));

      min(s.rating, 1, { message: 'Please rate us' });
    },
    {
      // Used by the FormRoot directive on <form [formRoot]>: on submit it marks fields
      // touched, stops if invalid, otherwise runs `action` (submitting() is true meanwhile).
      // Docs: https://angular.dev/guide/forms/signals/form-submission
      submission: {
        action: async (field) => {
          await fakeDelay(800);
          if (field.username().value() === 'server') {
            // Errors returned by the action are routed to the target field.
            return { kind: 'server', message: 'Rejected by the "server"', fieldTree: field.username };
          }
          this.log.add(`Submitted: ${JSON.stringify(field().value())}`, 'success');
          return undefined;
        },
        onInvalid: () => this.log.add('Submit blocked: form invalid', 'error'),
      },
    },
  );

  protected addSkill(): void {
    this.model.update((m) => ({ ...m, skills: [...m.skills, ''] }));
  }

  protected removeSkill(index: number): void {
    this.model.update((m) => ({ ...m, skills: m.skills.filter((_, i) => i !== index) }));
  }

  protected reset(): void {
    // reset() clears touched/dirty; the data model is reset separately (or via reset(value)).
    this.signUpForm().reset({ ...INITIAL, skills: [...INITIAL.skills] });
  }
}
