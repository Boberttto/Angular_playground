import { Component, linkedSignal, signal } from '@angular/core';

interface ShippingMethod {
  readonly id: number;
  readonly name: string;
}

const OPTIONS_A: readonly ShippingMethod[] = [
  { id: 0, name: 'Ground' },
  { id: 1, name: 'Air' },
  { id: 2, name: 'Sea' },
];
const OPTIONS_B: readonly ShippingMethod[] = [
  { id: 0, name: 'Email' },
  { id: 2, name: 'Sea (express)' },
  { id: 3, name: 'Postal service' },
];

/**
 * linkedSignal: writable state that resets when its source changes.
 * Docs: https://angular.dev/guide/signals/linked-signal
 */
@Component({
  selector: 'app-linked-signal-demo',
  templateUrl: './linked-signal-demo.html',
})
export class LinkedSignalDemo {
  protected readonly options = signal<readonly ShippingMethod[]>(OPTIONS_A);

  // Form 1 (shorthand): computation only. ALWAYS resets to the first option when options change.
  protected readonly simpleSelected = linkedSignal(() => this.options()[0]);

  // Form 2: source + computation(newSource, previous). Keeps the user's choice if still available.
  // Docs: https://angular.dev/guide/signals/linked-signal#accounting-for-previous-state
  protected readonly smartSelected = linkedSignal<readonly ShippingMethod[], ShippingMethod>({
    source: this.options,
    computation: (opts, previous) => opts.find((o) => o.id === previous?.value.id) ?? opts[0],
  });

  // Write-back (`set` option, recent addition): writing Fahrenheit updates the Celsius source.
  // Docs: https://angular.dev/guide/signals/linked-signal#writing-back-to-a-source-signal
  protected readonly celsius = signal(20);
  protected readonly fahrenheit = linkedSignal(() => Math.round((this.celsius() * 9) / 5 + 32), {
    set: (f) => this.celsius.set(Math.round(((f - 32) * 5) / 9)),
  });

  protected choose(id: number): void {
    const opt = this.options().find((o) => o.id === id);
    if (opt) {
      // Both are writable like a normal signal.
      this.simpleSelected.set(opt);
      this.smartSelected.set(opt);
    }
  }

  protected swapOptions(): void {
    this.options.update((o) => (o === OPTIONS_A ? OPTIONS_B : OPTIONS_A));
  }

  protected onFahrenheit(event: Event): void {
    this.fahrenheit.set(Number((event.target as HTMLInputElement).value));
  }
}
