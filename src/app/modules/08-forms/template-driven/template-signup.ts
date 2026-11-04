import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { StarRating } from '../star-rating/star-rating';

/**
 * Template-driven forms: the template (ngModel + validation attributes) creates the
 * FormControls for you. NgForm is attached automatically to every <form> once FormsModule is imported.
 * Docs: https://angular.dev/guide/forms/template-driven-forms
 */
@Component({
  selector: 'app-template-signup',
  imports: [FormsModule, JsonPipe, StarRating, LogPanel],
  templateUrl: './template-signup.html',
  styleUrl: './template-signup.scss',
})
export class TemplateSignup {
  // [(ngModel)] supports two-way binding to a WritableSignal.
  protected readonly username = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly rating = signal(3);
  protected readonly log = new EventLog(10);

  protected onSubmit(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.log.add('Submit blocked: form invalid', 'error');
      return;
    }
    this.log.add(`Submitted: ${JSON.stringify(form.value)}`, 'success');
    form.resetForm({ rating: 3 });
  }
}
