import { Service } from '@angular/core';
import { EventLog } from '../../shared/event-log';

/**
 * Root singleton holding the on-screen log for module 05.
 * `@Service()` (Angular 22) is the ergonomic shorthand for `@Injectable({ providedIn: 'root' })`:
 * tree-shakable, one instance per application, only `inject()` (no constructor DI).
 * Docs: https://angular.dev/guide/di/creating-and-using-services#using-the-service-vs-injectable-decorator
 */
@Service()
export class DiLog {
  /** Used by the instance-scope demo (CounterStore). */
  readonly log = new EventLog(200);
  /** Used by the manual EnvironmentInjector demo. */
  readonly manual = new EventLog(200);
}
