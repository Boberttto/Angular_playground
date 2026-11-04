import { Component } from '@angular/core';
import { PageHeader } from '../../shared/page-header/page-header';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { AnatomyDemo } from './anatomy/anatomy-demo';
import { ModelDemo } from './model/model-demo';
import { ShopContainer } from './communication/shop-container';
import { ProjectionDemo } from './projection/projection-demo';
import { QueriesDemo } from './queries/queries-demo';
import { EncapsulationDemo } from './encapsulation/encapsulation-demo';

/**
 * Module 02 — components: inputs/outputs/model, communication, projection, queries, styling.
 * Docs: https://angular.dev/guide/components
 */
@Component({
  selector: 'app-components-page',
  imports: [
    PageHeader,
    DemoSection,
    AnatomyDemo,
    ModelDemo,
    ShopContainer,
    ProjectionDemo,
    QueriesDemo,
    EncapsulationDemo,
  ],
  templateUrl: './components-page.html',
  styleUrl: './components-page.scss',
})
export default class ComponentsPage {}
