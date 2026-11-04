import { Component, signal } from '@angular/core';
import { HeavyWidget } from './heavy-widget';

/**
 * One @defer block per trigger.
 * Docs: https://angular.dev/guide/templates/defer
 */
@Component({
  selector: 'app-defer-demo',
  imports: [HeavyWidget],
  templateUrl: './defer-demo.html',
  styleUrl: './defer-demo.scss',
})
export class DeferDemo {
  protected readonly ready = signal(false);
}
