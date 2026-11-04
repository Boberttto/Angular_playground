import { Component, EffectRef, Injector, effect, inject, signal, untracked } from '@angular/core';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/**
 * effect(): timing, onCleanup, untracked, creating an effect outside the constructor.
 * Docs: https://angular.dev/guide/signals/effect
 */
@Component({
  selector: 'app-effect-demo',
  imports: [LogPanel],
  templateUrl: './effect-demo.html',
})
export class EffectDemo {
  protected readonly log = new EventLog();
  private readonly injector = inject(Injector);

  protected readonly user = signal('Ada');
  protected readonly clicks = signal(0);
  protected readonly query = signal('');
  private lateEffect: EffectRef | undefined;
  protected readonly lateEffectActive = signal(false);

  constructor() {
    // 1) Timing + untracked: runs once initially, then when `user` changes. `clicks` is read
    //    with untracked() so changing it alone does NOT re-run the effect.
    // Docs: https://angular.dev/guide/signals#reading-without-tracking-dependencies
    effect(() => {
      const u = this.user();
      const c = untracked(this.clicks);
      this.log.add(`effect#1 ran: user=${u}, clicks (untracked)=${c}`, 'hook');
    });

    // 2) onCleanup: a fake "debounced search". The cleanup cancels the previous timer
    //    before the next run (and when the component is destroyed).
    // Docs: https://angular.dev/guide/signals/effect#effect-cleanup-functions
    effect((onCleanup) => {
      const q = this.query();
      if (!q) return;
      const id = setTimeout(() => this.log.add(`🔎 search "${q}" sent (500ms after last keystroke)`, 'success'), 500);
      onCleanup(() => {
        clearTimeout(id);
        this.log.add(`effect#2 cleanup: cancelled pending search for "${q}"`, 'warning');
      });
    });
  }

  protected setUserThreeTimes(): void {
    // Effects are asynchronous: three synchronous writes -> ONE effect run with the last value.
    this.user.set('Grace');
    this.user.set('Linus');
    this.user.set(this.user() === 'Margaret' ? 'Ada' : 'Margaret');
    this.log.add(`3 synchronous set() done, now user=${this.user()} (effect has NOT run yet)`);
  }

  protected click(): void {
    this.clicks.update((n) => n + 1);
    this.log.add(`clicks=${this.clicks()} -> effect#1 does not re-run (untracked read)`);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected toggleLateEffect(): void {
    if (this.lateEffect) {
      this.lateEffect.destroy();
      this.lateEffect = undefined;
      this.lateEffectActive.set(false);
      this.log.add('late effect destroyed via EffectRef.destroy()', 'warning');
      return;
    }
    // Outside an injection context (a click handler): pass the injector explicitly.
    // Docs: https://angular.dev/guide/signals/effect#injection-context
    this.lateEffect = effect(() => this.log.add(`late effect: user=${this.user()}`, 'hook'), {
      injector: this.injector,
    });
    this.lateEffectActive.set(true);
  }
}
