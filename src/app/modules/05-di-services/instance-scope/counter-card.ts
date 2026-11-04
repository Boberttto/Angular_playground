import { Component, inject, input } from '@angular/core';
import { CounterStore } from './counter-store';

/** Uses whatever CounterStore the injector tree resolves (root singleton by default). */
@Component({
  selector: 'app-counter-card',
  template: `
    <div class="card" [class.scoped]="scoped()">
      <strong>{{ label() }}</strong>
      <span>instance <code>#{{ store.instanceId }}</code> · age {{ store.ageSeconds() }}s</span>
      <button type="button" (click)="store.increment()">count = {{ store.count() }}</button>
    </div>
  `,
  styleUrl: './counter-card.scss',
})
export class CounterCard {
  readonly label = input.required<string>();
  readonly scoped = input(false);
  protected readonly store = inject(CounterStore);
}

/**
 * Same template/class, but `providers: [CounterStore]` creates a NEW CounterStore in this
 * component's ElementInjector. It lives and dies with the component.
 * Docs: https://angular.dev/guide/di/defining-dependency-providers#component-or-directive-providers
 */
@Component({
  selector: 'app-scoped-counter-card',
  providers: [CounterStore],
  template: `<app-counter-card [label]="label()" [scoped]="true" />`,
  imports: [CounterCard],
})
export class ScopedCounterCard {
  readonly label = input.required<string>();
}
