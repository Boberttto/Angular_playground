import { Component } from '@angular/core';

/** Target of the RedirectCommand / UrlTree returned by the auth guards. */
@Component({
  selector: 'app-access-denied',
  template: `<h3>⛔ Access denied</h3>
    <p>The guard redirected you here. Toggle "logged in" above and try <code>/routing/admin</code> again.</p>`,
})
export default class AccessDenied {}
