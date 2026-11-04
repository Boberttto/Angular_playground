import { Component, input } from '@angular/core';

let created = 0;

/**
 * Pretend this is a heavy component (chart lib, editor...). When used ONLY inside @defer
 * blocks, the compiler puts it in a separate lazy chunk.
 */
@Component({
  selector: 'app-heavy-widget',
  template: `<div class="widget">✅ Heavy widget loaded: <strong>{{ label() }}</strong> (instance #{{ no }})</div>`,
  styles: `.widget { padding: 6px 10px; background: #e7f6ee; border-radius: 4px; }`,
})
export class HeavyWidget {
  readonly label = input('');
  protected readonly no = ++created;
}
