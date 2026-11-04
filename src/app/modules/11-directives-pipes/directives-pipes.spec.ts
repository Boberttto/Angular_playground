import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import DirectivesPipesPage from './directives-pipes-page';
import { CallStats } from './pipes/call-stats';
import { JoinImpurePipe, JoinPurePipe } from './pipes/join-pipes';
import { truncate } from './pipes/truncate';
import { Repeat } from './directives/repeat';
import { Unless } from './directives/unless';

describe('truncate()', () => {
  it('keeps short strings and cuts long ones', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate('Hello wonderful world', 5)).toBe('Hello…');
    expect(truncate('Hello wonderful world', 5, '...')).toBe('Hello...');
    expect(truncate(null)).toBe('');
  });
});

@Component({
  imports: [JoinPurePipe, JoinImpurePipe],
  providers: [CallStats],
  template: `
    <p id="pure">{{ items | joinPure }}</p>
    <p id="impure">{{ items | joinImpure }}</p>
    <button (click)="noop()">re-render</button>
  `,
})
class PipeHost {
  items = ['a'];
  noop(): void {}
}

describe('pure vs impure pipes', () => {
  it('pure transform runs only when the reference changes, impure on every check', async () => {
    const fixture = TestBed.createComponent(PipeHost);
    const stats = fixture.debugElement.injector.get(CallStats);
    const text = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`#${id}`)?.textContent;
    // A DOM event handled by the template marks the (OnPush) view dirty → it is re-rendered.
    const check = async () => {
      (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
      await fixture.whenStable();
    };

    await fixture.whenStable(); // first render
    await check();
    await check();
    await Promise.resolve(); // let CallStats publish its snapshot
    const afterThree = stats.snapshot();
    expect(afterThree.pure).toBe(1);
    expect(afterThree.impure).toBeGreaterThanOrEqual(3);

    // Mutation: same reference → pure output is stale, impure is fresh.
    fixture.componentInstance.items.push('b');
    await check();
    expect(text('pure')).toBe('a');
    expect(text('impure')).toBe('a, b');

    // New reference → pure runs again.
    fixture.componentInstance.items = [...fixture.componentInstance.items, 'c'];
    await check();
    expect(text('pure')).toBe('a, b, c');
    await Promise.resolve();
    expect(stats.snapshot().pure).toBe(2);
  });
});

@Component({
  imports: [Unless, Repeat],
  template: `
    <p *appUnless="hidden()" id="unless">visible</p>
    <ul><li *appRepeat="count(); let n; let isLast = last">{{ n }}{{ isLast ? '!' : '' }}</li></ul>
  `,
})
class StructuralHost {
  hidden = signal(false);
  count = signal(3);
}

describe('structural directives', () => {
  it('*appUnless and *appRepeat create/destroy embedded views', async () => {
    const fixture = TestBed.createComponent(StructuralHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#unless')).not.toBeNull();
    expect([...el.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['0', '1', '2!']);

    fixture.componentInstance.hidden.set(true);
    fixture.componentInstance.count.set(1);
    await fixture.whenStable();
    expect(el.querySelector('#unless')).toBeNull();
    expect([...el.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['0!']);
  });
});

describe('DirectivesPipesPage', () => {
  it('renders without errors (and the call counters do not loop forever)', async () => {
    const fixture = TestBed.createComponent(DirectivesPipesPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-fancy-button')?.getAttribute('data-tooltip')).toContain('Tooltip');
    expect(el.querySelector('app-call-stats-panel')?.textContent).toContain('impure pipe');
  });
});
