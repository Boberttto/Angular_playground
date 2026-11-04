import { Component } from '@angular/core';

/**
 * Multi-slot projection: <ng-content select="..."> uses CSS selectors (element, [attr], .class).
 * The <ng-content> without select is the default slot (catches everything else).
 * Content inside <ng-content> is FALLBACK content, shown when nothing matches.
 * Docs: https://angular.dev/guide/components/content-projection
 */
@Component({
  selector: 'app-card',
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {}
