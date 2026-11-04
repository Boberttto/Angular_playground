import { Component, DestroyRef, inject, signal } from '@angular/core';

/** A child exposing a public API (methods) that the parent calls through viewChild(). */
@Component({
  selector: 'app-stopwatch',
  template: `<span class="mono">⏱ {{ (elapsed() / 10).toFixed(1) }} s {{ running() ? '(running)' : '' }}</span>`,
})
export class Stopwatch {
  readonly elapsed = signal(0);
  readonly running = signal(false);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(): void {
    if (this.timer) return;
    this.running.set(true);
    this.timer = setInterval(() => this.elapsed.update((t) => t + 1), 100);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.running.set(false);
  }

  reset(): void {
    this.stop();
    this.elapsed.set(0);
  }
}
