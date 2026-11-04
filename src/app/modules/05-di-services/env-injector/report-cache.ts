import { DestroyRef, Injectable, OnDestroy, inject } from '@angular/core';
import { DiLog } from '../di-log';

let nextId = 1;

/**
 * NOT provided in root: it only exists inside the EnvironmentInjector we create by hand.
 * Docs: https://angular.dev/api/core/createEnvironmentInjector
 */
@Injectable()
export class ReportCache implements OnDestroy {
  readonly id = nextId++;
  private readonly log = inject(DiLog).manual;

  constructor() {
    this.log.add(`ReportCache #${this.id} created (lazily, on first inject)`, 'success');
    // Here DestroyRef = the EnvironmentInjector that owns this provider.
    inject(DestroyRef).onDestroy(() => this.log.add(`ReportCache #${this.id}: DestroyRef.onDestroy()`, 'hook'));
  }

  ngOnDestroy(): void {
    this.log.add(`ReportCache #${this.id}: ngOnDestroy()`, 'warning');
  }
}
