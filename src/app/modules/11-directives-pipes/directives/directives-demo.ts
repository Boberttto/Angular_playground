import { Component, signal } from '@angular/core';
import { Badge } from './badge';
import { FancyButton } from './fancy-button';
import { Highlight } from './highlight';
import { LegacyHighlight } from './legacy-highlight';
import { Repeat } from './repeat';
import { Unless } from './unless';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/** Hosts every custom directive demo. Directives are imported like components. */
@Component({
  selector: 'app-directives-demo',
  imports: [Highlight, LegacyHighlight, Badge, Unless, Repeat, FancyButton, LogPanel],
  templateUrl: './directives-demo.html',
  styleUrl: './directives-demo.scss',
})
export class DirectivesDemo {
  protected readonly log = new EventLog();
  protected readonly color = signal('gold');
  protected readonly hidden = signal(false);
  protected readonly times = signal(3);
  protected readonly notifications = signal(2);

  protected onCount(count: number): void {
    this.log.add(`(countChange) from hostDirective ClickCounter → ${count}`, 'success');
  }
}
