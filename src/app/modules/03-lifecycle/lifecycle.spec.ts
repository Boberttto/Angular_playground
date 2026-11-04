import {
  ChangeDetectionStrategy,
  Component,
  ErrorHandler,
  Injectable,
  Type,
  afterEveryRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HookChild } from './component-hooks/hook-child';
import { HookSpy } from './directive-hooks/hook-spy';
import { HookTrace } from './hook-trace/hook-trace';
import { ServiceHost } from './service-hooks/service-host';

/**
 * Executable proof of the hook order described in docs/03-lifecycle/theory.md.
 * HookTrace is replaced by a synchronous recorder so we can assert the exact sequence.
 */
const calls: string[] = [];
const fakeTrace: Pick<HookTrace, 'record' | 'begin'> = {
  record: (source: string, hook: string, detail = '') => {
    calls.push(`${source}:${hook}${detail ? ' | ' + detail : ''}`);
  },
  begin: () => undefined,
};
/** Hook names only (no details), optionally filtered by source. */
const names = (source?: string) =>
  calls.filter((c) => !source || c.startsWith(source + ':')).map((c) => c.split(' | ')[0]);

@Component({
  imports: [HookChild, HookSpy, ServiceHost],
  template: `
    <span class="tick">{{ tick() }}</span>
    @if (show()) {
      <app-hook-child [label]="label()" [legacyCount]="count()"><em #projected>hi</em></app-hook-child>
      <p [appHookSpy]="label()"></p>
      <app-service-host />
    }
  `,
})
class Host {
  readonly show = signal(true);
  readonly label = signal('a');
  readonly count = signal(0);
  /** Read only by the host template: changing it refreshes the host, not the child's inputs. */
  readonly tick = signal(0);
  readonly child = viewChild(HookChild);

  // Parent hooks, to observe parent/child interleaving.
  ngOnInit(): void {
    calls.push('host:ngOnInit');
  }
  ngAfterContentInit(): void {
    calls.push('host:ngAfterContentInit');
  }
  ngAfterViewInit(): void {
    calls.push('host:ngAfterViewInit');
  }
}

describe('03 · lifecycle hooks', () => {
  beforeEach(() => {
    calls.length = 0;
    TestBed.configureTestingModule({ providers: [{ provide: HookTrace, useValue: fakeTrace }] });
  });

  async function create() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture;
  }

  it('calls component hooks in the documented order on creation', async () => {
    await create();
    expect(names('child')).toEqual([
      'child:constructor',
      'child:ngOnChanges',
      'child:ngOnInit',
      'child:ngDoCheck',
      'child:ngAfterContentInit',
      'child:ngAfterContentChecked',
      'child:ngAfterViewInit',
      'child:ngAfterViewChecked',
      'child:afterNextRender › earlyRead',
      'child:afterEveryRender › earlyRead',
      'child:afterNextRender › write',
      'child:afterEveryRender › write',
      'child:afterNextRender › mixedReadWrite',
      'child:afterEveryRender › mixedReadWrite',
      'child:afterNextRender › read',
      'child:afterEveryRender › read',
    ]);
  });

  it('interleaves parent and child hooks top-down (parent AfterView last)', async () => {
    await create();
    const seq = names().filter((n) => /^(host|child):(ngOnInit|ngAfterContentInit|ngAfterViewInit)$/.test(n));
    expect(seq).toEqual([
      'host:ngOnInit',
      'host:ngAfterContentInit',
      'child:ngOnInit',
      'child:ngAfterContentInit',
      'child:ngAfterViewInit',
      'host:ngAfterViewInit',
    ]);
  });

  it('constructor sees the default input value; static @ViewChild is ready in ngOnInit', async () => {
    await create();
    expect(calls.find((c) => c.startsWith('child:constructor'))).toContain('(default value)');
    const onInit = calls.find((c) => c.startsWith('child:ngOnInit')) ?? '';
    expect(onInit).toContain('label()="a"');
    expect(onInit).toContain('@ViewChild static:true=defined');
    expect(onInit).toContain('@ViewChild dynamic=undefined');
    // Signal queries on NON-conditional elements already resolve in ngOnInit (no `static` option needed).
    expect(onInit).toContain('viewChild()=defined');
    expect(onInit).toContain('contentChild()=defined');
  });

  it('afterEveryRender runs after ANY app render, even if its component was not refreshed', async () => {
    const fixture = await create();
    calls.length = 0;
    // No input changes for the child: we just ask for an app render.
    fixture.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(names('child')).toContain('child:afterEveryRender › read');
  });

  it('ngOnChanges fires for a SIGNAL input changed through a template binding', async () => {
    const fixture = await create();
    calls.length = 0;
    fixture.componentInstance.label.set('b');
    await fixture.whenStable();
    expect(calls.find((c) => c.startsWith('child:ngOnChanges'))).toContain('label: "a" → "b"');
    // Subsequent CD: no Init hooks, afterNextRender does not run again.
    expect(names('child')).not.toContain('child:ngOnInit');
    expect(names('child')).not.toContain('child:afterNextRender › read');
    expect(names('child')).toContain('child:afterEveryRender › read');
  });

  it('setting an input property directly in TS does NOT call ngOnChanges (and OnPush child stays stale)', async () => {
    const fixture = await create();
    calls.length = 0;
    const child = fixture.componentInstance.child();
    if (child) child.legacyCount = 999;
    fixture.componentInstance.tick.update((n) => n + 1); // refresh the HOST only
    await fixture.whenStable();
    expect(names('child')).not.toContain('child:ngOnChanges');
    // The parent's refresh still calls the child's DoCheck + Checked hooks...
    expect(names('child')).toEqual(
      expect.arrayContaining(['child:ngDoCheck', 'child:ngAfterContentChecked', 'child:ngAfterViewChecked']),
    );
    // ...but the OnPush child's template was NOT refreshed: 999 is not displayed.
    expect((fixture.nativeElement as HTMLElement).querySelector('app-hook-child')?.textContent).not.toContain('999');
  });

  it('ComponentRef.setInput DOES call ngOnChanges', async () => {
    const fixture = TestBed.createComponent(HookChild);
    await fixture.whenStable();
    calls.length = 0;
    fixture.componentRef.setInput('label', 'via setInput');
    await fixture.whenStable();
    expect(calls.find((c) => c.startsWith('child:ngOnChanges'))).toContain('"via setInput"');
  });

  it('runs ngOnDestroy before DestroyRef callbacks (component, directive, service)', async () => {
    const fixture = await create();
    calls.length = 0;
    fixture.componentInstance.show.set(false);
    await fixture.whenStable();
    const destroyed = names().filter((n) => n.includes('estroy'));
    expect(destroyed.indexOf('child:ngOnDestroy')).toBeLessThan(
      destroyed.indexOf('child:DestroyRef.onDestroy callback'),
    );
    expect(names('service')).toEqual(['service:ngOnDestroy', 'service:DestroyRef.onDestroy callback']);
  });

  it('a directive gets the same hooks (including the view hooks)', async () => {
    await create();
    expect(names('directive')).toEqual([
      'directive:constructor',
      'directive:ngOnChanges',
      'directive:ngOnInit',
      'directive:ngDoCheck',
      'directive:ngAfterContentInit',
      'directive:ngAfterContentChecked',
      'directive:ngAfterViewInit',
      'directive:ngAfterViewChecked',
      'directive:afterNextRender › read',
    ]);
  });

  it('a service never gets ngOnInit / ngDoCheck / ngAfterViewInit', async () => {
    await create();
    expect(names('service')).toEqual(['service:constructor (first inject())']);
  });
});

// ---------------------------------------------------------------------------------------------
// Pitfalls: writing state from hooks. Each scenario is a tiny component tree.
// ---------------------------------------------------------------------------------------------
@Injectable({ providedIn: 'root' })
class Stats {
  readonly checks = signal(0);
  plain = 0;
  calls = 0;
}

@Component({ selector: 'pit-writer', template: 'w' })
class AfterViewCheckedWriter {
  private readonly stats = inject(Stats);
  ngAfterViewChecked(): void {
    if (++this.stats.calls < 500) this.stats.checks.update((n) => n + 1);
  }
}
@Component({ selector: 'pit-parent-reads', imports: [AfterViewCheckedWriter], template: '{{ stats.checks() }}<pit-writer />' })
class ParentReadsSignal {
  protected readonly stats = inject(Stats);
}

@Component({ selector: 'pit-self', template: 'Checked {{ checks() }} times' })
class SelfCounter {
  readonly checks = signal(0);
  ngAfterViewChecked(): void {
    this.checks.update((n) => n + 1);
  }
}

@Component({ selector: 'pit-plain-writer', template: 'p' })
class PlainWriter {
  private readonly stats = inject(Stats);
  ngAfterViewInit(): void {
    this.stats.plain++;
  }
}
@Component({
  selector: 'pit-parent-plain',
  imports: [PlainWriter],
  template: '{{ stats.plain }}<pit-plain-writer />',
  changeDetection: ChangeDetectionStrategy.Eager,
})
class ParentReadsPlainField {
  protected readonly stats = inject(Stats);
}

@Component({ selector: 'pit-render-writer', template: '{{ stats.checks() }}' })
class AfterEveryRenderWriter {
  protected readonly stats = inject(Stats);
  constructor() {
    afterEveryRender(() => {
      if (++this.stats.calls < 500) this.stats.checks.update((n) => n + 1);
    });
  }
}

describe('03 · pitfalls: writing state from hooks', () => {
  async function errorsOf(cmp: Type<unknown>): Promise<string> {
    const errors: string[] = [];
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useValue: { handleError: (e: unknown) => errors.push(String(e)) } }],
    });
    try {
      const fixture = TestBed.createComponent(cmp);
      await fixture.whenStable();
    } catch (e) {
      errors.push(String(e));
    }
    return errors.join('\n');
  }

  it('child ngAfterViewChecked writes a signal read by the PARENT template -> NG0103 infinite CD', async () => {
    expect(await errorsOf(ParentReadsSignal)).toContain('NG0103');
  });

  it('afterEveryRender writes a signal read in a template -> NG0103 infinite CD', async () => {
    expect(await errorsOf(AfterEveryRenderWriter)).toContain('NG0103');
  });

  it('child ngAfterViewInit mutates a NON-signal value the parent already rendered -> NG0100', async () => {
    expect(await errorsOf(ParentReadsPlainField)).toContain('NG0100');
  });

  it('a component writing a signal read by ITS OWN template in ngAfterViewChecked: re-render, no loop', async () => {
    const fixture = TestBed.createComponent(SelfCounter);
    await fixture.whenStable();
    // Only the component's view is refreshed again; its view hooks are run by the parent's check.
    expect(fixture.componentInstance.checks()).toBe(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Checked 1 times');
  });
});
