import { Component, ViewEncapsulation } from '@angular/core';

/**
 * None: styles are added to the document as-is → they are GLOBAL (they leak).
 * The selector is deliberately namespaced with `.enc-demo-leak` so the leak stays visible but harmless.
 * Docs: https://angular.dev/guide/components/styling#viewencapsulationnone
 */
@Component({
  selector: 'app-none-box',
  encapsulation: ViewEncapsulation.None,
  template: `<div class="enc-demo-leak"><p>None: I style every “.enc-demo-leak p” in the app.</p></div>`,
  styles: `
    app-none-box { display: block; border: 2px dashed #1f8a4c; padding: 6px; border-radius: 6px; }
    .enc-demo-leak p { color: #1f8a4c; font-weight: bold; text-decoration: underline; }
  `,
})
export class NoneBox {}
