import { Component, inject, input } from '@angular/core';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { HookTrace } from './hook-trace';

/**
 * Displays a HookTrace. It is a SEPARATE component on purpose: it is the only template
 * that reads the trace signals, so flushing the log re-renders only this component
 * (signal-driven, targeted refresh) and not the parent whose children we are observing.
 * Docs: https://angular.dev/guide/signals#reading-signals-in-onpush-components
 */
@Component({
  selector: 'app-hook-trace-view',
  imports: [LogPanel],
  templateUrl: './hook-trace-view.html',
  styleUrl: './hook-trace-view.scss',
})
export class HookTraceView {
  protected readonly trace = inject(HookTrace);
  readonly title = input('Hook calls (in order)');
}
