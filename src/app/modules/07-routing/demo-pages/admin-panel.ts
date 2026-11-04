import { Component } from '@angular/core';

/** Only reachable when authGuard / LegacyAuthGuard allow it. */
@Component({
  selector: 'app-admin-panel',
  template: `<h3>🔐 Admin panel</h3>
    <p>The guard returned <code>true</code>, so the navigation was allowed.</p>`,
})
export default class AdminPanel {}
