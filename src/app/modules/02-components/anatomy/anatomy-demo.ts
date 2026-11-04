import { Component, signal } from '@angular/core';
import { ProfileCard, ProfileSelection } from './profile-card';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/** Parent that feeds ProfileCard with inputs and listens to its output. */
@Component({
  selector: 'app-anatomy-demo',
  imports: [ProfileCard, LogPanel],
  templateUrl: './anatomy-demo.html',
})
export class AnatomyDemo {
  protected readonly log = new EventLog();
  protected readonly level = signal(3);
  protected readonly nickname = signal('   the countess  ');

  protected onSelected(event: ProfileSelection): void {
    this.log.add(`(selected) from ${event.name} at ${event.at.toLocaleTimeString()}`, 'success');
  }
}
