import { Component, inject } from '@angular/core';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { LogPanel } from '../../shared/log-panel/log-panel';
import { PageHeader } from '../../shared/page-header/page-header';
import { ErrorHandling } from './error-handling/error-handling';
import { HttpLog } from './http-log';
import { ResourceTrio } from './resources/resource-trio';
import { TypedRequests } from './typed-requests/typed-requests';

@Component({
  selector: 'app-http-page',
  imports: [PageHeader, DemoSection, LogPanel, TypedRequests, ErrorHandling, ResourceTrio],
  templateUrl: './http-page.html',
  styleUrl: './http-page.scss',
})
export default class HttpPage {
  protected readonly log = inject(HttpLog).log;
}
