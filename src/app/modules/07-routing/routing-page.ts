import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, EventType, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EventLog } from '../../shared/event-log';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { LogPanel } from '../../shared/log-panel/log-panel';
import { PageHeader } from '../../shared/page-header/page-header';
import { RoutingDemoState } from './data/routing-demo-state';

/**
 * Shell of the routing module: navigation links + a nested <router-outlet> for the child routes
 * declared in routing.routes.ts. This component stays alive while you navigate between children,
 * so it can log every router event.
 */
@Component({
  selector: 'app-routing-page',
  imports: [PageHeader, DemoSection, LogPanel, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './routing-page.html',
  styleUrl: './routing-page.scss',
})
export default class RoutingPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly state = inject(RoutingDemoState);
  protected readonly log = new EventLog(60);

  constructor() {
    // Router events are an Observable stream; `type` is an EventType enum value.
    // Docs: https://angular.dev/guide/routing/lifecycle-and-events
    this.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      const name = EventType[e.type];
      // Keep the log readable: skip the very chatty child activation events.
      if (name.startsWith('ChildActivation') || name.startsWith('Activation')) return;
      const url = 'url' in e ? ` ${e.url}` : '';
      const kind = e.type === EventType.NavigationEnd ? 'success'
        : e.type === EventType.NavigationCancel || e.type === EventType.NavigationError ? 'error' : 'info';
      this.log.add(`${name}${url}`, kind);
    });
  }

  // Docs: https://angular.dev/guide/routing/navigate-to-routes#programmatic-navigation-to-routes
  protected goToProductWithExtras(): void {
    // Commands array + relativeTo; queryParams and fragment as NavigationExtras.
    this.router.navigate(['products', 2], {
      relativeTo: this.route,
      queryParams: { from: 'navigate' },
      fragment: 'reviews',
    });
  }

  protected goByUrl(): void {
    // navigateByUrl takes an absolute URL string (or UrlTree).
    this.router.navigateByUrl('/routing/legacy-product/3');
  }
}
