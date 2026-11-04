import { Component } from '@angular/core';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { PageHeader } from '../../shared/page-header/page-header';
import { HookParent } from './component-hooks/hook-parent';
import { DirectiveHooksDemo } from './directive-hooks/directive-hooks-demo';
import { ServiceHooksDemo } from './service-hooks/service-hooks-demo';

@Component({
  selector: 'app-lifecycle-page',
  imports: [PageHeader, DemoSection, HookParent, DirectiveHooksDemo, ServiceHooksDemo],
  templateUrl: './lifecycle-page.html',
  styleUrl: './lifecycle-page.scss',
})
export default class LifecyclePage {}
