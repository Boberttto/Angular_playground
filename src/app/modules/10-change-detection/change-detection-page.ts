import { Component } from '@angular/core';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { PageHeader } from '../../shared/page-header/page-header';
import { DetachableTicker } from './detach/detachable-ticker';
import { ExpressionChangedDemo } from './expression-changed/expression-changed-demo';
import { FineGrainedDemo } from './fine-grained/fine-grained-demo';
import { StrategiesDemo } from './strategies/strategies-demo';
import { ZonelessTriggers } from './zoneless-triggers/zoneless-triggers';

@Component({
  selector: 'app-change-detection-page',
  imports: [
    PageHeader,
    DemoSection,
    StrategiesDemo,
    ZonelessTriggers,
    FineGrainedDemo,
    DetachableTicker,
    ExpressionChangedDemo,
  ],
  templateUrl: './change-detection-page.html',
  styleUrl: './change-detection-page.scss',
})
export default class ChangeDetectionPage {}
