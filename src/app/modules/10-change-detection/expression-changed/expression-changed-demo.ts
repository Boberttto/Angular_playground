import { Component, signal } from '@angular/core';
import { StatusHost } from './status-host';

/** Mounts StatusHost in "plain field" (NG0100) or "signal" (OK) mode. */
@Component({
  selector: 'app-expression-changed-demo',
  imports: [StatusHost],
  templateUrl: './expression-changed-demo.html',
})
export class ExpressionChangedDemo {
  protected readonly mode = signal<'plain' | 'signal' | null>(null);
}
