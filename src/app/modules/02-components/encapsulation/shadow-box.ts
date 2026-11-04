import { Component, ViewEncapsulation } from '@angular/core';

/**
 * ShadowDom: real browser Shadow DOM. The global stylesheet (styles.scss) does not match inside,
 * but inherited properties (font, color) still flow in from the host.
 * Docs: https://angular.dev/guide/components/styling#viewencapsulationshadowdom
 */
@Component({
  selector: 'app-shadow-box',
  encapsulation: ViewEncapsulation.ShadowDom,
  template: `<p>ShadowDom: my &lt;p&gt; is royal blue.</p><button type="button">global button style does NOT apply</button><div class="enc-demo-leak"><p>ShadowDom .enc-demo-leak p</p></div>`,
  styles: `
    :host { display: block; border: 2px dotted royalblue; padding: 6px; border-radius: 6px; }
    p { color: royalblue; margin: 4px 0; }
  `,
})
export class ShadowBox {}
