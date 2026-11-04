import { ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { injectRenderCounter } from '../render-counter';

/**
 * detach() / reattach() / detectChanges().
 * A detached view is NOT checked, even if it is marked dirty (here: by a signal it reads).
 * Docs: https://angular.dev/api/core/ChangeDetectorRef
 */
@Component({
  selector: 'app-detachable-ticker',
  host: { class: 'onpush' },
  templateUrl: './detachable-ticker.html',
  styleUrl: '../cd-card.scss',
})
export class DetachableTicker {
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly renders = injectRenderCounter();
  protected readonly ticks = signal(0);
  protected readonly detached = signal(false);

  constructor() {
    const id = setInterval(() => {
      this.ticks.update((n) => n + 1);
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  protected detach(): void {
    this.detached.set(true);
    this.cdr.detach();
    // Render the "(DETACHED)" label once, manually: from now on, ticks() changes are ignored.
    this.cdr.detectChanges();
  }

  protected reattach(): void {
    this.detached.set(false);
    this.cdr.reattach();
  }

  protected detectChanges(): void {
    // Synchronous, local check of this view and its children: works even when detached.
    this.cdr.detectChanges();
  }
}
