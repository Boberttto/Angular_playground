import {
  AfterContentChecked,
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  DestroyRef,
  Directive,
  DoCheck,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  afterNextRender,
  inject,
  input,
} from '@angular/core';
import { HookTrace } from '../hook-trace/hook-trace';

const SRC = 'directive';

/**
 * A directive gets exactly the same lifecycle hooks as a component
 * (a component IS a directive with a template). The "view" hooks still run even though a
 * directive has no template of its own: they fire once the host element's view is done.
 * Docs: https://angular.dev/guide/components/lifecycle
 */
@Directive({ selector: '[appHookSpy]' })
export class HookSpy
  implements
    OnChanges,
    OnInit,
    DoCheck,
    AfterContentInit,
    AfterContentChecked,
    AfterViewInit,
    AfterViewChecked,
    OnDestroy
{
  private readonly trace = inject(HookTrace);
  readonly appHookSpy = input('');

  constructor() {
    this.trace.record(SRC, 'constructor');
    inject(DestroyRef).onDestroy(() => this.trace.record(SRC, 'DestroyRef.onDestroy callback'));
    afterNextRender({ read: () => this.trace.record(SRC, 'afterNextRender › read') });
  }

  ngOnChanges(changes: SimpleChanges<HookSpy>): void {
    const c = changes.appHookSpy;
    this.trace.record(SRC, 'ngOnChanges', `appHookSpy: "${c?.previousValue ?? ''}" → "${c?.currentValue ?? ''}"`);
  }
  ngOnInit(): void {
    this.trace.record(SRC, 'ngOnInit');
  }
  ngDoCheck(): void {
    this.trace.record(SRC, 'ngDoCheck');
  }
  ngAfterContentInit(): void {
    this.trace.record(SRC, 'ngAfterContentInit');
  }
  ngAfterContentChecked(): void {
    this.trace.record(SRC, 'ngAfterContentChecked');
  }
  ngAfterViewInit(): void {
    this.trace.record(SRC, 'ngAfterViewInit');
  }
  ngAfterViewChecked(): void {
    this.trace.record(SRC, 'ngAfterViewChecked');
  }
  ngOnDestroy(): void {
    this.trace.record(SRC, 'ngOnDestroy');
  }
}
