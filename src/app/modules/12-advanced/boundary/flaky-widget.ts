import { Component, input } from '@angular/core';

/** Throws during change detection when `explode` is true (reading a computed value in the template). */
@Component({
  selector: 'app-flaky-widget',
  template: `<p>🟢 Flaky widget rendered fine: {{ check() }}</p>`,
})
export class FlakyWidget {
  readonly explode = input(false);

  protected check(): string {
    if (this.explode()) throw new Error('FlakyWidget exploded during rendering');
    return 'all good';
  }
}
