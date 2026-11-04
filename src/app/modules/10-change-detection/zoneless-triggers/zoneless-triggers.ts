import { AsyncPipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { injectRenderCounter } from '../render-counter';

/**
 * What schedules change detection in a zoneless app?
 * Each button changes state inside a setTimeout (AFTER the click's own render), so only the
 * update mechanism decides whether the screen refreshes.
 * Docs: https://angular.dev/guide/zoneless#requirements-for-zoneless-compatibility
 */
@Component({
  selector: 'app-zoneless-triggers',
  imports: [AsyncPipe],
  host: { class: 'onpush' },
  templateUrl: './zoneless-triggers.html',
  styleUrl: '../cd-card.scss',
})
export class ZonelessTriggers {
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly renders = injectRenderCounter();

  protected plain = 0;
  protected plainWithMark = 0;
  protected readonly sig = signal(0);
  protected readonly subject = new BehaviorSubject(0);

  private later(fn: () => void): void {
    setTimeout(fn, 300);
  }

  protected bumpPlain(): void {
    // ❌ No notification: zone.js used to catch the setTimeout; zoneless does not.
    this.later(() => this.plain++);
  }

  protected bumpSignal(): void {
    // ✅ Updating a signal read in the template.
    this.later(() => this.sig.update((n) => n + 1));
  }

  protected bumpPlainWithMark(): void {
    // ✅ Plain field + explicit markForCheck().
    this.later(() => {
      this.plainWithMark++;
      this.cdr.markForCheck();
    });
  }

  protected bumpObservable(): void {
    // ✅ AsyncPipe calls markForCheck() when the observable emits.
    this.later(() => this.subject.next(this.subject.value + 1));
  }
}
