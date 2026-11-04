import { Component, inject, signal } from '@angular/core';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { DiLog } from '../di-log';
import { CounterCard, ScopedCounterCard } from './counter-card';

/**
 * Live demo: root singleton vs component-scoped instances, and service destruction.
 * Docs: https://angular.dev/guide/di/hierarchical-dependency-injection
 */
@Component({
  selector: 'app-instance-scope',
  imports: [CounterCard, ScopedCounterCard, LogPanel],
  templateUrl: './instance-scope.html',
  styleUrl: './instance-scope.scss',
})
export class InstanceScope {
  protected readonly log = inject(DiLog).log;
  protected readonly showScoped = signal(true);
  protected readonly showRoot = signal(true);
}
