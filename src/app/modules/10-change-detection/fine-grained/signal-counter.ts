import { Component, Signal, input } from '@angular/core';
import { injectRenderCounter } from '../render-counter';

/** Receives a Signal (stable reference) and reads it in its template. */
@Component({
  selector: 'app-signal-counter',
  host: { class: 'onpush' },
  template: `<span class="render-count"></span>{{ renders.mark() }}
    <div class="name">{{ label() }}</div>
    value = <strong>{{ value()() }}</strong>`,
  styleUrl: '../cd-card.scss',
})
export class SignalCounter {
  readonly label = input.required<string>();
  readonly value = input.required<Signal<number>>();
  protected readonly renders = injectRenderCounter();
}
