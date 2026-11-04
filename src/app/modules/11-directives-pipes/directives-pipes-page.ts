import { Component } from '@angular/core';
import { PageHeader } from '../../shared/page-header/page-header';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { DirectivesDemo } from './directives/directives-demo';
import { CustomPipesDemo } from './pipes/pipes-demo';

/**
 * Module 11 — custom directives (attribute, structural, composition) and custom pipes.
 * Docs: https://angular.dev/guide/directives
 */
@Component({
  selector: 'app-directives-pipes-page',
  imports: [PageHeader, DemoSection, DirectivesDemo, CustomPipesDemo],
  templateUrl: './directives-pipes-page.html',
  styleUrl: './directives-pipes-page.scss',
})
export default class DirectivesPipesPage {}
