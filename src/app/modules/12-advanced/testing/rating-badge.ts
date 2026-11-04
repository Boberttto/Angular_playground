import { Component, computed, input, output } from '@angular/core';

/** Component with inputs + output, tested with fixture.componentRef.setInput(). */
@Component({
  selector: 'app-rating-badge',
  template: `<button type="button" class="secondary" [class.top]="isTop()" (click)="selected.emit(score())">
    {{ label() }}: {{ score() }}/5 {{ isTop() ? '🏆' : '' }}
  </button>`,
  styles: `.top { font-weight: 700; }`,
})
export class RatingBadge {
  readonly label = input.required<string>();
  readonly score = input(0);
  readonly selected = output<number>();
  protected readonly isTop = computed(() => this.score() >= 4);
}
