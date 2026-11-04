import { Component, ElementRef, afterNextRender, signal, viewChild } from '@angular/core';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { PageHeader } from '../../shared/page-header/page-header';
import { BoundaryDemo } from './boundary/boundary-demo';
import { DeferDemo } from './defer/defer-demo';
import { DynamicDemo } from './dynamic/dynamic-demo';
import { SanitizationDemo } from './security/sanitization-demo';
import { TemplateDemo } from './templates/template-demo';
import { TestingShowcase } from './testing/testing-showcase';

@Component({
  selector: 'app-advanced-page',
  imports: [PageHeader, DemoSection, DeferDemo, DynamicDemo, TemplateDemo, SanitizationDemo, BoundaryDemo, TestingShowcase],
  templateUrl: './advanced-page.html',
  styleUrl: './advanced-page.scss',
})
export default class AdvancedPage {
  private readonly measured = viewChild.required<ElementRef<HTMLElement>>('measured');
  protected readonly width = signal<number | null>(null);

  constructor() {
    // afterNextRender: runs once, in the browser only (never during SSR), after Angular rendered the DOM.
    // The right place for DOM measurement / third-party DOM libs.
    // Docs: https://angular.dev/api/core/afterNextRender
    afterNextRender(() => {
      this.width.set(Math.round(this.measured().nativeElement.getBoundingClientRect().width));
    });
  }
}
