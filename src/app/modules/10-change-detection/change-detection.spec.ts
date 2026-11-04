import { ErrorHandler, inputBinding } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetachableTicker } from './detach/detachable-ticker';
import { StatusHost } from './expression-changed/status-host';
import { FineGrainedDemo } from './fine-grained/fine-grained-demo';
import { StrategiesDemo } from './strategies/strategies-demo';
import { ZonelessTriggers } from './zoneless-triggers/zoneless-triggers';

/** Executable proof of the claims made in docs/10-change-detection/theory.md (zoneless, Angular 22). */

const text = (f: ComponentFixture<unknown>, sel: string) =>
  ((f.nativeElement as HTMLElement).querySelector(sel)?.textContent ?? '').replace(/\s+/g, ' ');
const badge = (f: ComponentFixture<unknown>, sel: string) => text(f, `${sel} > .render-count`);
const click = (f: ComponentFixture<unknown>, label: string) => {
  const btn = [...(f.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
    b.textContent?.includes(label),
  );
  if (!btn) throw new Error(`button "${label}" not found`);
  btn.click();
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('10 · change detection', () => {
  it('Eager child sees an in-place mutation, OnPush child does not (until a new reference)', async () => {
    const f = TestBed.createComponent(StrategiesDemo);
    await f.whenStable();
    click(f, 'Mutate user.name');
    await f.whenStable();
    expect(text(f, 'app-user-card-eager')).toContain('Grace');
    expect(text(f, 'app-user-card-onpush')).toContain('Ada'); // stale
    expect(badge(f, 'app-user-card-onpush')).toBe('rendered 1×');

    click(f, 'markForCheck()');
    await f.whenStable();
    expect(text(f, 'app-user-card-onpush')).toContain('Grace');

    click(f, 'Replace user');
    await f.whenStable();
    expect(text(f, 'app-user-card-onpush')).toContain('Linus');
  });

  it('an event that changes nothing re-renders the Eager child but skips the OnPush child', async () => {
    const f = TestBed.createComponent(StrategiesDemo);
    await f.whenStable();
    const before = badge(f, 'app-user-card-onpush');
    click(f, 'Event that changes nothing');
    await f.whenStable();
    expect(badge(f, 'app-user-card-eager')).toBe('rendered 2×');
    expect(badge(f, 'app-user-card-onpush')).toBe(before);
  });

  it('zoneless: plain field in setTimeout is NOT rendered; signal / markForCheck / async pipe are', async () => {
    const f = TestBed.createComponent(ZonelessTriggers);
    await f.whenStable();
    const cells = () =>
      [...(f.nativeElement as HTMLElement).querySelectorAll('tr td:nth-child(2)')].map((td) => td.textContent?.trim());
    click(f, 'plain field++ in setTimeout');
    click(f, 'signal.update()');
    click(f, 'markForCheck()');
    click(f, 'subject.next()');
    await f.whenStable();
    await wait(400);
    await f.whenStable();
    // Rows 2-4 rendered. (Row 1 may "catch up" here because row 3's markForCheck refreshed the
    // whole view — the plain field alone is tested below.)
    expect(cells().slice(1)).toEqual(['1', '1', '1']);
  });

  it('zoneless: a plain field changed in setTimeout alone never reaches the screen', async () => {
    const f = TestBed.createComponent(ZonelessTriggers);
    await f.whenStable();
    click(f, 'plain field++ in setTimeout');
    await f.whenStable();
    await wait(400);
    await f.whenStable();
    expect(text(f, 'tr td:nth-child(2)')).toBe('0');
  });

  it('a signal update outside any event re-renders only the component that reads it', async () => {
    const f = TestBed.createComponent(FineGrainedDemo);
    await f.whenStable();
    const demo = f.componentInstance as unknown as { counters: readonly { update(fn: (n: number) => number): void }[] };
    demo.counters[1].update((n) => n + 1); // like the timer: no event, no input change
    await f.whenStable();
    const counters = [...(f.nativeElement as HTMLElement).querySelectorAll('app-signal-counter > .render-count')].map(
      (b) => b.textContent,
    );
    expect(counters).toEqual(['rendered 1×', 'rendered 2×', 'rendered 1×']);
    expect(text(f, ':scope > .render-count')).toBe('rendered 1×'); // parent not re-rendered
  });

  it('a detached view ignores signal changes until detectChanges() / reattach()', async () => {
    const f = TestBed.createComponent(DetachableTicker);
    await f.whenStable();
    click(f, 'detach()');
    await f.whenStable();
    await wait(1100); // the ticker signal increments
    await f.whenStable();
    expect(text(f, 'p')).toContain('= 0');
    click(f, 'detectChanges()');
    await f.whenStable();
    expect(text(f, 'p')).not.toContain('= 0');
    f.destroy();
  });

  it('child writing a rendered plain field in ngAfterViewInit -> NG0100', async () => {
    const errors: string[] = [];
    TestBed.configureTestingModule({
      rethrowApplicationErrors: false,
      providers: [{ provide: ErrorHandler, useValue: { handleError: (e: unknown) => errors.push(String(e)) } }],
    });
    try {
      const plain = TestBed.createComponent(StatusHost); // first CD runs here (thrown synchronously in tests)
      await plain.whenStable();
    } catch (e) {
      errors.push(String(e));
    }
    expect(errors.join()).toContain('NG0100');

  });

  it('same scenario with a SIGNAL: no error, the parent is simply refreshed again', async () => {
    const errors: string[] = [];
    TestBed.configureTestingModule({
      rethrowApplicationErrors: false,
      providers: [{ provide: ErrorHandler, useValue: { handleError: (e: unknown) => errors.push(String(e)) } }],
    });
    // Bind the input BEFORE the first change detection.
    const withSignal = TestBed.createComponent(StatusHost, { bindings: [inputBinding('useSignal', () => true)] });
    await withSignal.whenStable();
    expect(errors).toEqual([]);
    expect(text(withSignal, 'p')).toContain('signal status = ready');
  });
});
