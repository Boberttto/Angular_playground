import { Component, computed, effect, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/**
 * Glitch-free: signal consumers never observe an inconsistent intermediate state.
 * Same "diamond" graph (n -> n, n -> isEven -> combined) built with signals and with RxJS.
 * Source: https://github.com/angular/angular/blob/main/packages/core/primitives/signals/README.md
 */
@Component({
  selector: 'app-glitch-free-demo',
  imports: [LogPanel],
  template: `
    <p>Diamond graph: <code>n</code> and <code>isEven(n)</code> are combined. Each click does <code>n + 1</code>.</p>
    <button type="button" (click)="next()">n + 1 (n = {{ n() }})</button>
    <app-log-panel [entries]="log.entries()" (cleared)="log.clear()" title="Signals vs combineLatest" />
  `,
})
export class GlitchFreeDemo {
  protected readonly log = new EventLog();

  protected readonly n = signal(0);
  private readonly isEven = computed(() => this.n() % 2 === 0);

  private readonly n$ = new BehaviorSubject(0);

  constructor() {
    // Signals: runs once per change, always with a consistent pair.
    effect(() => this.log.add(`signals: ${this.n()} is ${this.isEven() ? 'even' : 'odd'}`, 'success'));

    // RxJS: combineLatest emits as soon as ONE input emits -> first emission mixes new n with old isEven.
    combineLatest([this.n$, this.n$.pipe(map((v) => v % 2 === 0))])
      .pipe(takeUntilDestroyed())
      .subscribe(([v, even]) => {
        const ok = (v % 2 === 0) === even;
        this.log.add(`combineLatest: ${v} is ${even ? 'even' : 'odd'}${ok ? '' : '   ⚠️ glitch'}`, ok ? 'info' : 'error');
      });
  }

  protected next(): void {
    this.n.update((v) => v + 1);
    this.n$.next(this.n$.value + 1);
  }
}
