import { Component, input } from '@angular/core';
import { outputFromObservable, toObservable } from '@angular/core/rxjs-interop';
import { map, switchMap, take, timer } from 'rxjs';

/**
 * outputFromObservable(): turns an Observable into a component output.
 * Must be called in a property initializer of a component/directive.
 * Docs: https://angular.dev/ecosystem/rxjs-interop/output-interop
 */
@Component({
  selector: 'app-countdown',
  template: `<span class="muted">(countdown from {{ from() }} running inside the child)</span>`,
})
export class Countdown {
  readonly from = input(5);

  readonly tick = outputFromObservable(
    toObservable(this.from).pipe(
      switchMap((from) =>
        timer(0, 1000).pipe(
          take(from + 1),
          map((i) => from - i),
        ),
      ),
    ),
  );
}
