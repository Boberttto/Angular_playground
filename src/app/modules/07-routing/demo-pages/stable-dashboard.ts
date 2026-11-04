import { Component } from '@angular/core';

/** Fallback route with the same path: used when the canMatch guard of the beta route fails. */
@Component({
  selector: 'app-stable-dashboard',
  template: `<h3>📊 Stable dashboard</h3>
    <p>canMatch of the beta route returned <code>false</code>, so the router tried the next config.</p>`,
})
export default class StableDashboard {}
