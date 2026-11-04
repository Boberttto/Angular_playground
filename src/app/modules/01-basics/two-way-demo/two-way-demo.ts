import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Two-way binding = property binding + event binding ("banana in a box" [( )]).
 * Docs: https://angular.dev/guide/templates/two-way-binding
 */
@Component({
  selector: 'app-two-way-demo',
  // FormsModule provides the NgModel directive.
  imports: [FormsModule],
  templateUrl: './two-way-demo.html',
  styleUrl: './two-way-demo.scss',
})
export class TwoWayDemo {
  // 1. Classic: plain mutable field.
  protected plainName = 'Grace';

  // 2. Modern: a WritableSignal. [(ngModel)]="signalName" receives the SIGNAL (no parentheses):
  //    Angular reads it for the property side and calls .set() for the event side.
  protected readonly signalName = signal('Linus');

  // 3. Manual desugaring, to understand what [( )] does.
  protected readonly manualName = signal('Margaret');
}
