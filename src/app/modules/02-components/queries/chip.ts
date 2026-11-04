import { Component, input } from '@angular/core';

@Component({
  selector: 'app-chip',
  template: `<span class="chip">{{ label() }}</span>`,
  styles: `.chip { background: #fde8ee; border-radius: 12px; padding: 2px 10px; margin-right: 4px; }`,
})
export class Chip {
  readonly label = input.required<string>();
}
