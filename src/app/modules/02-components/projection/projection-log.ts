import { Injectable } from '@angular/core';
import { EventLog } from '../../../shared/event-log';

/** Log shared by the projection demo and the <app-spy> components it projects. */
@Injectable()
export class ProjectionLog {
  readonly log = new EventLog();
}
