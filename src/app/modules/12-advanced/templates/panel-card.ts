import { Component } from '@angular/core';

/**
 * Multi-slot content projection with `select`, a default slot, and fallback content (v18+:
 * content between <ng-content> tags is shown when nothing is projected into that slot).
 * Docs: https://angular.dev/guide/components/content-projection
 */
@Component({
  selector: 'app-panel-card',
  template: `<header><ng-content select="[panel-title]">Untitled panel</ng-content></header>
    <div class="body"><ng-content /></div>
    <footer><ng-content select="app-panel-footer, [panel-footer]">No footer projected</ng-content></footer>`,
  styleUrl: './panel-card.scss',
})
export class PanelCard {}
