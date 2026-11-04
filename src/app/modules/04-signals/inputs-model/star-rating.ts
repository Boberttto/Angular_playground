import { Component, booleanAttribute, computed, input, model, numberAttribute } from '@angular/core';

/**
 * Signal inputs + model input (two-way binding).
 * Docs: https://angular.dev/guide/components/inputs#model-inputs
 */
@Component({
  selector: 'app-star-rating',
  template: `
    <span class="label">{{ label() }}:</span>
    @for (star of stars(); track star) {
      <button type="button" class="secondary" [disabled]="disabled()" (click)="value.set(star)">
        {{ star <= value() ? '★' : '☆' }}
      </button>
    }
    <span class="muted"> {{ summary() }}</span>
  `,
})
export class StarRating {
  readonly label = input.required<string>();
  // Transforms: accept "7" or a bare attribute in templates.
  readonly max = input(5, { transform: numberAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** model(): a writable input. value.set() emits `valueChange` -> [(value)] in the parent. */
  readonly value = model(0);

  protected readonly stars = computed(() => Array.from({ length: this.max() }, (_, i) => i + 1));
  protected readonly summary = computed(() => `${this.value()} / ${this.max()}`);
}
