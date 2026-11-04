import { Component, DestroyRef, inject, signal } from '@angular/core';
import { injectRenderCounter } from '../render-counter';
import { SignalCounter } from './signal-counter';

/**
 * Signals enable targeted refreshes: a timer updating counter #2 re-renders ONLY the
 * component that reads it, not its parent nor its siblings (no event, no input change).
 * Docs: https://angular.dev/guide/signals#reading-signals-in-onpush-components
 */
@Component({
  selector: 'app-fine-grained-demo',
  imports: [SignalCounter],
  templateUrl: './fine-grained-demo.html',
  styleUrl: './fine-grained-demo.scss',
})
export class FineGrainedDemo {
  protected readonly renders = injectRenderCounter();
  protected readonly counters = [signal(0), signal(0), signal(0)] as const;
  protected readonly autoTick = signal(false);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  protected toggleAuto(): void {
    this.autoTick.update((v) => !v);
    clearInterval(this.timer);
    if (this.autoTick()) this.timer = setInterval(() => this.counters[1].update((n) => n + 1), 1000);
  }

  protected bumpThird(): void {
    // Click in the PARENT: the parent is refreshed (event), counter #3 too (signal),
    // counters #1/#2 are skipped (OnPush, same input references).
    this.counters[2].update((n) => n + 1);
  }
}
