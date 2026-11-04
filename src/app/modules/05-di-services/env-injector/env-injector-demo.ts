import {
  Component,
  EnvironmentInjector,
  Injector,
  createEnvironmentInjector,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { DiLog } from '../di-log';
import { ReportCache } from './report-cache';

/**
 * Manual EnvironmentInjector lifecycle + injection-context rules.
 * Docs: https://angular.dev/api/core/createEnvironmentInjector
 * Docs: https://angular.dev/guide/di/dependency-injection-context
 */
@Component({
  selector: 'app-env-injector-demo',
  imports: [LogPanel],
  templateUrl: './env-injector-demo.html',
})
export class EnvInjectorDemo {
  protected readonly log = inject(DiLog).manual;
  // Field initializer = injection context ✅
  private readonly parent = inject(EnvironmentInjector);
  private readonly injector = inject(Injector);

  private child: EnvironmentInjector | null = null;
  protected readonly hasChild = signal(false);

  createInjector(): void {
    // A child of the current environment injector (here: the lazy route's injector).
    this.child = createEnvironmentInjector([ReportCache], this.parent, 'ManualReportInjector');
    this.hasChild.set(true);
    this.log.add('EnvironmentInjector created (ReportCache not instantiated yet)');
  }

  useService(): void {
    const cache = this.child?.get(ReportCache);
    this.log.add(`child.get(ReportCache) → instance #${cache?.id}`);
  }

  destroyInjector(): void {
    // destroy() runs ngOnDestroy() of every instance it created + all DestroyRef callbacks.
    this.child?.destroy();
    this.child = null;
    this.hasChild.set(false);
    this.log.add('EnvironmentInjector destroyed');
  }

  injectOutsideContext(): void {
    try {
      // ❌ Event handler = NOT an injection context → NG0203.
      inject(DiLog);
      this.log.add('inject() worked?!', 'warning');
    } catch (e) {
      this.log.add(`inject() in a click handler threw: ${(e as Error).message.split('\n')[0]}`, 'error');
    }
  }

  injectWithRunInContext(): void {
    // ✅ runInInjectionContext gives us a context backed by a stored injector.
    // Docs: https://angular.dev/api/core/runInInjectionContext
    const same = runInInjectionContext(this.injector, () => inject(DiLog));
    this.log.add(`runInInjectionContext → inject(DiLog) ok (same singleton: ${same.manual === this.log})`, 'success');
  }
}
