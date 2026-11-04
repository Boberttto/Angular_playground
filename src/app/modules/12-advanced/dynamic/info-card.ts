import { Component, input } from '@angular/core';

/** Second dynamic component, used to show NgComponentOutlet switching component types. */
@Component({
  selector: 'app-info-card',
  template: `<p>ℹ️ InfoCard says: <strong>{{ message() }}</strong></p>`,
})
export class InfoCard {
  readonly message = input('');
}
