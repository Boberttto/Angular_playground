import { effect } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CounterStore } from './counter-store';

// Docs: https://angular.dev/guide/testing/services
describe('CounterStore (service with signals)', () => {
  let store: CounterStore;

  beforeEach(() => {
    // providedIn: 'root' -> no need to list it in providers.
    store = TestBed.inject(CounterStore);
  });

  it('starts at 0 and derives computed values synchronously', () => {
    expect(store.count()).toBe(0);
    store.increment();
    store.increment();
    // computed() is evaluated lazily on read: no flushing needed.
    expect(store.count()).toBe(2);
    expect(store.double()).toBe(4);
  });

  it('stops at max', () => {
    for (let i = 0; i < 10; i++) store.increment();
    expect(store.count()).toBe(store.max);
    expect(store.isMax()).toBe(true);
  });

  it('effects run when TestBed.tick() flushes them', () => {
    const seen: number[] = [];
    // effect() needs an injection context.
    TestBed.runInInjectionContext(() => effect(() => seen.push(store.count())));

    TestBed.tick(); // effects are scheduled, not synchronous
    expect(seen).toEqual([0]);

    store.increment();
    expect(seen).toEqual([0]); // not yet...
    TestBed.tick();
    expect(seen).toEqual([0, 1]);
  });

  it('gets a fresh instance per test (TestBed is reset between tests)', () => {
    expect(store.count()).toBe(0);
  });
});
