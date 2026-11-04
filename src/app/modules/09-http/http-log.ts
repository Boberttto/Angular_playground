import { Service } from '@angular/core';
import { EventLog } from '../../shared/event-log';

/**
 * Root singleton holding the on-screen HTTP log written by the interceptors.
 * Docs: https://angular.dev/guide/di/creating-and-using-services
 */
@Service()
export class HttpLog {
  readonly log = new EventLog(200);
}
