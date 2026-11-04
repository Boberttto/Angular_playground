import { Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Emulated (default): Angular rewrites `p` into `p[_ngcontent-xxx]` → styles only hit THIS template.
 * Docs: https://angular.dev/guide/components/styling#viewencapsulationemulated
 */
@Component({
  selector: 'app-emulated-box',
  encapsulation: ViewEncapsulation.Emulated, // the default, written for clarity
  host: { '[class.active]': 'active()' },
  template: `<p>Emulated: my &lt;p&gt; is crimson.</p><button type="button">global button style applies</button><div class="enc-demo-leak"><p>Emulated: None’s bold + underline leak in here too</p></div>`,
  styles: `
    :host { display: block; border: 2px solid #ccc; padding: 6px; border-radius: 6px; }
    :host(.active) { border-color: crimson; }               /* host has a class */
    :host-context(.dark-zone) { background: #1e1e2e; color: #e6e6f0; } /* an ANCESTOR has a class */
    p { color: crimson; margin: 4px 0; }
  `,
})
export class EmulatedBox {
  readonly active = input(false);
}
