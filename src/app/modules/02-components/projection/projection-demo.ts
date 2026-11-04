import { Component, inject } from '@angular/core';
import { Card } from './card';
import { LazyExpander } from './lazy-expander';
import { NaiveExpander } from './naive-expander';
import { ProjectionLog } from './projection-log';
import { Spy } from './spy';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/** Single-slot, multi-slot, ngProjectAs, fallback, and conditional projection. */
@Component({
  selector: 'app-projection-demo',
  imports: [Card, NaiveExpander, LazyExpander, Spy, LogPanel],
  providers: [ProjectionLog],
  templateUrl: './projection-demo.html',
  styleUrl: './projection-demo.scss',
})
export class ProjectionDemo {
  protected readonly log = inject(ProjectionLog).log;
}
