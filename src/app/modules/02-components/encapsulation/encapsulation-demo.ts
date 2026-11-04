import { Component, signal } from '@angular/core';
import { EmulatedBox } from './emulated-box';
import { NoneBox } from './none-box';
import { ShadowBox } from './shadow-box';

/** Same markup, three encapsulation modes. Inspect them in DevTools! */
@Component({
  selector: 'app-encapsulation-demo',
  imports: [EmulatedBox, NoneBox, ShadowBox],
  templateUrl: './encapsulation-demo.html',
  styleUrl: './encapsulation-demo.scss',
})
export class EncapsulationDemo {
  protected readonly active = signal(false);
  protected readonly dark = signal(false);
}
