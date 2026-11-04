import { Component } from '@angular/core';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { PageHeader } from '../../shared/page-header/page-header';
import { ReactiveSignup } from './reactive/reactive-signup';
import { SignalSignup } from './signal/signal-signup';
import { TemplateSignup } from './template-driven/template-signup';

/** Same sign-up form, three APIs. */
@Component({
  selector: 'app-forms-page',
  imports: [PageHeader, DemoSection, TemplateSignup, ReactiveSignup, SignalSignup],
  templateUrl: './forms-page.html',
  styleUrl: './forms-page.scss',
})
export default class FormsPage {}
