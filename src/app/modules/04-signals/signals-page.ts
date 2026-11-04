import { Component } from '@angular/core';
import { DemoSection } from '../../shared/demo-section/demo-section';
import { PageHeader } from '../../shared/page-header/page-header';
import { SignalBasics } from './basics/signal-basics';
import { ComputedDemo } from './computed-demo/computed-demo';
import { EffectDemo } from './effect-demo/effect-demo';
import { GlitchFreeDemo } from './glitch-free/glitch-free-demo';
import { InputsModelDemo } from './inputs-model/inputs-model-demo';
import { InteropDemo } from './interop-demo/interop-demo';
import { LinkedSignalDemo } from './linked-signal-demo/linked-signal-demo';

@Component({
  selector: 'app-signals-page',
  imports: [
    PageHeader,
    DemoSection,
    SignalBasics,
    ComputedDemo,
    EffectDemo,
    LinkedSignalDemo,
    InputsModelDemo,
    InteropDemo,
    GlitchFreeDemo,
  ],
  templateUrl: './signals-page.html',
  styleUrl: './signals-page.scss',
})
export default class SignalsPage {}
