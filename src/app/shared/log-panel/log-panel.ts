import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { LogEntry } from '../event-log';

/** Displays EventLog entries in a terminal-like box. */
@Component({
  selector: 'app-log-panel',
  templateUrl: './log-panel.html',
  styleUrl: './log-panel.scss',
})
export class LogPanel {
  readonly entries = input.required<readonly LogEntry[]>();
  readonly title = input('Log');
  readonly cleared = output<void>();

  private readonly box = viewChild<ElementRef<HTMLElement>>('box');

  constructor() {
    // Auto-scroll to the latest entry whenever entries change.
    effect(() => {
      this.entries();
      const el = this.box()?.nativeElement;
      if (el) queueMicrotask(() => (el.scrollTop = el.scrollHeight));
    });
  }
}
