import { Component, inject, signal } from '@angular/core';
import {
  AsyncPipeChild,
  LeakyChild,
  ManualChild,
  TakeUntilDestroyedChild,
  ToSignalChild,
} from './strategy-children';
import { TickerSource } from './ticker-source';

/**
 * Memory-leak demo: toggle the children on and off and watch the live subscription count.
 * Docs: https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed
 */
@Component({
  selector: 'app-unsubscribe-demo',
  imports: [LeakyChild, ManualChild, TakeUntilDestroyedChild, AsyncPipeChild, ToSignalChild],
  templateUrl: './unsubscribe-demo.html',
  styleUrl: './unsubscribe-demo.scss',
})
export class UnsubscribeDemo {
  protected readonly ticker = inject(TickerSource);
  protected readonly showSafe = signal(true);
  protected readonly showLeaky = signal(false);
}
