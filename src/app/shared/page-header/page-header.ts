import { Component, input } from '@angular/core';

/** Header displayed at the top of every module page. */
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly heading = input.required<string>();
  /** Folder name in /docs, e.g. "03-lifecycle". */
  readonly docsFolder = input.required<string>();
}
