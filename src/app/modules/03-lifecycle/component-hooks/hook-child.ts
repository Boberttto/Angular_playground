import {
  AfterContentChecked,
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  Component,
  DestroyRef,
  DoCheck,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  afterEveryRender,
  afterNextRender,
  contentChild,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { HookTrace } from '../hook-trace/hook-trace';

const SRC = 'child';

/**
 * Implements EVERY component lifecycle hook and logs each call into HookTrace.
 * Change detection strategy: OnPush (the default since Angular 22).
 * Docs: https://angular.dev/guide/components/lifecycle
 */
@Component({
  selector: 'app-hook-child',
  templateUrl: './hook-child.html',
  styleUrl: './hook-child.scss',
})
export class HookChild
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

  /** Signal input. Optional so we can read its DEFAULT value in the constructor. */
  // Docs: https://angular.dev/guide/components/inputs
  readonly label = input('(default value)');

  // Legacy syntax (still supported): decorator input. Used to show that setting the
  // property directly from TypeScript does NOT call ngOnChanges.
  @Input() legacyCount = 0;

  // Signal queries (modern). Docs: https://angular.dev/guide/components/queries
  private readonly viewRef = viewChild<ElementRef<HTMLElement>>('inView');
  private readonly projected = contentChild<ElementRef<HTMLElement>>('projected');

  // Legacy syntax (still supported): static query, resolved BEFORE ngOnInit.
  @ViewChild('inView', { static: true }) private staticViewRef?: ElementRef<HTMLElement>;
  // Legacy syntax (still supported): dynamic query, resolved before ngAfterViewInit.
  @ViewChild('inView') private dynamicViewRef?: ElementRef<HTMLElement>;

  protected readonly clicks = signal(0);

  constructor() {
    // Constructor: NOT a lifecycle hook (plain JS). Inputs are not bound yet.
    this.trace.record(SRC, 'constructor', `label() = "${this.label()}" (bound value not set yet)`);

    // Docs: https://angular.dev/api/core/DestroyRef
    inject(DestroyRef).onDestroy(() => this.trace.record(SRC, 'DestroyRef.onDestroy callback'));

    // Render callbacks: app-wide, run after Angular has written ALL components to the DOM.
    // Browser only (skipped on the server) -> the SSR-safe place for direct DOM access.
    // Docs: https://angular.dev/api/core/afterNextRender
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender({
      earlyRead: () => {
        const h = host.offsetHeight;
        this.trace.record(SRC, 'afterNextRender › earlyRead', `offsetHeight=${h}`);
        return h;
      },
      write: (h) => {
        this.trace.record(SRC, 'afterNextRender › write', `received ${h} from earlyRead`);
        return h;
      },
      mixedReadWrite: (h) => {
        this.trace.record(SRC, 'afterNextRender › mixedReadWrite', `received ${h}`);
        return h;
      },
      read: (h) => this.trace.record(SRC, 'afterNextRender › read', `received ${h}`),
    });
    // Docs: https://angular.dev/api/core/afterEveryRender
    afterEveryRender({
      earlyRead: () => this.trace.record(SRC, 'afterEveryRender › earlyRead'),
      write: () => this.trace.record(SRC, 'afterEveryRender › write'),
      mixedReadWrite: () => this.trace.record(SRC, 'afterEveryRender › mixedReadWrite'),
      read: () => this.trace.record(SRC, 'afterEveryRender › read'),
    });
  }

  ngOnChanges(changes: SimpleChanges<HookChild>): void {
    // Only called for inputs set through a TEMPLATE binding (or ComponentRef.setInput).
    const parts = Object.entries(changes).map(
      ([name, c]) =>
        `${name}: ${JSON.stringify(c?.previousValue)} → ${JSON.stringify(c?.currentValue)}` +
        (c?.firstChange ? ' (firstChange)' : ''),
    );
    this.trace.record(SRC, 'ngOnChanges', `{ ${parts.join(', ')} }`);
  }

  ngOnInit(): void {
    this.trace.record(
      SRC,
      'ngOnInit',
      `label()="${this.label()}" · @ViewChild static:true=${desc(this.staticViewRef)} · ` +
        `@ViewChild dynamic=${desc(this.dynamicViewRef)} · viewChild()=${desc(this.viewRef())} · ` +
        `contentChild()=${desc(this.projected())}`,
    );
  }

  ngDoCheck(): void {
    this.trace.record(SRC, 'ngDoCheck');
  }

  ngAfterContentInit(): void {
    this.trace.record(SRC, 'ngAfterContentInit', `contentChild()=${desc(this.projected())}`);
  }

  ngAfterContentChecked(): void {
    this.trace.record(SRC, 'ngAfterContentChecked', `projected text="${this.projected()?.nativeElement.textContent ?? ''}"`);
  }

  ngAfterViewInit(): void {
    this.trace.record(
      SRC,
      'ngAfterViewInit',
      `@ViewChild dynamic=${desc(this.dynamicViewRef)} · viewChild()=${desc(this.viewRef())}`,
    );
  }

  ngAfterViewChecked(): void {
    this.trace.record(SRC, 'ngAfterViewChecked');
  }

  ngOnDestroy(): void {
    this.trace.record(SRC, 'ngOnDestroy');
  }

  protected onClick(): void {
    this.trace.begin('click handled INSIDE the child (template listener)');
    this.clicks.update((n) => n + 1);
  }
}

function desc(ref: ElementRef | undefined): string {
  return ref ? 'defined' : 'undefined';
}
