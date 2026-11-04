import { Component, EnvironmentInjector, createEnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CounterStore } from './instance-scope/counter-store';
import { ScopedCounterCard } from './instance-scope/counter-card';
import { ReportCache } from './env-injector/report-cache';
import { DiLog } from './di-log';
import { ModifierParent } from './resolution-modifiers/modifier-parent';
import { ThemeReader } from './resolution-modifiers/theme-reader';
import { ViewProvidersHost } from './resolution-modifiers/view-providers-host';

// These tests document (and prove) the behaviours shown on the 05 page.
// Docs: https://angular.dev/guide/testing/services

@Component({
  imports: [ScopedCounterCard],
  template: `@if (show()) {
    <app-scoped-counter-card label="x" />
  }`,
})
class ScopedHost {
  readonly show = signal(true);
}

describe('05 · DI & services', () => {
  it('destroys a component-scoped service (ngOnDestroy + DestroyRef) with its component', async () => {
    const fixture = TestBed.createComponent(ScopedHost);
    await fixture.whenStable();
    const root = TestBed.inject(CounterStore);
    const scoped = fixture.debugElement.children[0].injector.get(CounterStore);
    expect(scoped).not.toBe(root);

    // Angular keeps a reference to the prototype's ngOnDestroy, so we assert on the on-screen log
    // instead of spying on the instance.
    const log = TestBed.inject(DiLog).log;
    fixture.componentInstance.show.set(false);
    await fixture.whenStable();
    await Promise.resolve(); // log uses addDeferred() (microtask)
    const messages = log.entries().map((e) => e.message);
    const id = scoped.instanceId;
    expect(messages).toContain(`CounterStore #${id}: ngOnDestroy()`);
    expect(messages).toContain(`CounterStore #${id}: DestroyRef.onDestroy() callback`);
    expect(messages).toContain(`CounterStore #${id}: interval unsubscribed (takeUntilDestroyed)`);
    // The root singleton is untouched.
    expect(messages).not.toContain(`CounterStore #${root.instanceId}: ngOnDestroy()`);
  });

  it('destroys services owned by a manually created EnvironmentInjector', () => {
    const child = createEnvironmentInjector([ReportCache], TestBed.inject(EnvironmentInjector));
    const cache = child.get(ReportCache);
    const log = TestBed.inject(DiLog).manual;
    child.destroy();
    const messages = log.entries().map((e) => e.message);
    expect(messages).toContain(`ReportCache #${cache.id}: ngOnDestroy()`);
    expect(messages).toContain(`ReportCache #${cache.id}: DestroyRef.onDestroy()`);
  });

  it('applies resolution modifiers as documented', async () => {
    const fixture = TestBed.createComponent(ModifierParent);
    await fixture.whenStable();
    const [withoutProvider, withProvider] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('ul'),
    ).map((ul) => Array.from(ul.querySelectorAll('li')).map((li) => li.textContent?.split('→')[1]?.trim()));

    // [normal, self, skipSelf, host, missing]
    expect(withoutProvider).toEqual(['parent 🌿', 'null', 'parent 🌿', 'null', 'null']);
    expect(withProvider).toEqual(['leaf 🍁', 'leaf 🍁', 'parent 🌿', 'leaf 🍁', 'null']);
  });

  it('hides viewProviders from projected content', async () => {
    @Component({
      imports: [ViewProvidersHost, ThemeReader],
      template: `<app-view-providers-host><app-theme-reader label="projected" /></app-view-providers-host>`,
    })
    class Wrapper {}
    const fixture = TestBed.createComponent(Wrapper);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Child declared in the host\'s template → from viewProviders 🔒');
    expect(text).toContain('projected → from providers 🌍');
  });
});
