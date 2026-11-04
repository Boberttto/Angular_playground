import { Directive, output, signal } from '@angular/core';

/** Reusable behaviour #2: counts clicks on its host and emits the new count. */
@Directive({
  selector: '[appClickCounter]',
  exportAs: 'clickCounter',
  host: { '(click)': 'increment()' },
})
export class ClickCounter {
  readonly count = signal(0);
  readonly countChange = output<number>();

  increment(): void {
    this.count.update((c) => c + 1);
    this.countChange.emit(this.count());
  }
}
