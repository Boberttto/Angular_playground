import { Injectable, signal } from '@angular/core';

/** State shared by StatusHost (renders it) and StatusReporter (writes it). Component-provided. */
@Injectable()
export class StatusState {
  plain = 'loading';
  readonly sig = signal('loading');
}
