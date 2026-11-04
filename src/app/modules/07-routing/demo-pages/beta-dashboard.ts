import { Component } from '@angular/core';

/** Matched only when betaDashboardGuard (CanMatchFn) returns true. */
@Component({
  selector: 'app-beta-dashboard',
  template: `<h3>🧪 Beta dashboard</h3>
    <p>canMatch returned <code>true</code>: this route config was matched for <code>/dashboard</code>.</p>`,
})
export default class BetaDashboard {}
