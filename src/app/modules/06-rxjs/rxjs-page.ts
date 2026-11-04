import { Component } from '@angular/core';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { PageHeader } from '../../shared/page-header/page-header';
import { FlatteningTimeline } from './flattening-timeline/flattening-timeline';
import { InteropDemo } from './interop-demo/interop-demo';
import { SharingDemo } from './sharing-demo/sharing-demo';
import { SubjectsDemo } from './subjects-demo/subjects-demo';
import { Typeahead } from './typeahead/typeahead';
import { UnsubscribeDemo } from './unsubscribe-demo/unsubscribe-demo';

@Component({
  selector: 'app-rxjs-page',
  imports: [PageHeader, DemoSection, SubjectsDemo, FlatteningTimeline, Typeahead, SharingDemo, UnsubscribeDemo, InteropDemo],
  templateUrl: './rxjs-page.html',
  styleUrl: './rxjs-page.scss',
})
export default class RxjsPage {}
