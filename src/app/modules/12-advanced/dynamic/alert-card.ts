import { Component, input, output } from '@angular/core';

export type AlertKind = 'info' | 'success' | 'warning';

/** Rendered dynamically (never referenced in a template by its selector). */
@Component({
  selector: 'app-alert-card',
  template: `<div class="alert" [class]="kind()">
    <span>{{ message() }}</span>
    <button type="button" class="secondary" (click)="closed.emit()">✕</button>
  </div>`,
  styleUrl: './alert-card.scss',
})
export class AlertCard {
  readonly message = input.required<string>();
  readonly kind = input<AlertKind>('info');
  readonly closed = output<void>();
}
