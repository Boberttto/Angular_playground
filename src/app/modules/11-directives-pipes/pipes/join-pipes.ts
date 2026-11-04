import { Pipe, PipeTransform, inject } from '@angular/core';
import { CallStats } from './call-stats';

/** PURE (default): only called when the array REFERENCE changes. */
@Pipe({ name: 'joinPure' })
export class JoinPurePipe implements PipeTransform {
  private readonly stats = inject(CallStats);

  transform(items: readonly string[], separator = ', '): string {
    this.stats.increment('pure');
    return items.join(separator);
  }
}

/**
 * IMPURE: called on EVERY change detection of the view that uses it, even if nothing changed.
 * Convention from the docs: put "Impure" in the name to warn other developers.
 * Docs: https://angular.dev/guide/templates/pipes#detecting-change-within-arrays-or-objects
 */
@Pipe({ name: 'joinImpure', pure: false })
export class JoinImpurePipe implements PipeTransform {
  private readonly stats = inject(CallStats);

  transform(items: readonly string[], separator = ', '): string {
    this.stats.increment('impure');
    return items.join(separator);
  }
}
