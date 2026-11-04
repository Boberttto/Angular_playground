import { Component } from '@angular/core';
import { PageHeader } from '../../shared/page-header/page-header';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { BindingsDemo } from './bindings-demo/bindings-demo';
import { EventsDemo } from './events-demo/events-demo';
import { TwoWayDemo } from './two-way-demo/two-way-demo';
import { ControlFlowDemo } from './control-flow-demo/control-flow-demo';
import { PipesDemo } from './pipes-demo/pipes-demo';
import { ExpressionsDemo } from './expressions-demo/expressions-demo';

/**
 * Module 01 — template basics.
 * Each demo lives in its own small component so you can read them one by one.
 * Docs: https://angular.dev/guide/templates
 */
@Component({
  selector: 'app-basics-page',
  imports: [
    PageHeader,
    DemoSection,
    BindingsDemo,
    EventsDemo,
    TwoWayDemo,
    ControlFlowDemo,
    PipesDemo,
    ExpressionsDemo,
  ],
  templateUrl: './basics-page.html',
  styleUrl: './basics-page.scss',
})
export default class BasicsPage {}
