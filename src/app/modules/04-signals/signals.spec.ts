import { Injector, computed, effect, linkedSignal, signal, untracked } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toObservable } from '@angular/core/rxjs-interop';

/** Executable proof of the claims made in docs/04-signals/theory.md. */
describe('04 · signals', () => {
  it('computed is lazy and memoized', () => {
    const count = signal(1);
    let runs = 0;
    const doubled = computed(() => {
      runs++;
      return count() * 2;
    });
    count.set(2);
    expect(runs).toBe(0); // never read -> never computed
    expect(doubled()).toBe(4);
    expect(doubled()).toBe(4);
    expect(runs).toBe(1); // second read served from cache
    count.set(3);
    expect(runs).toBe(1); // invalidated, but not recomputed until read
    expect(doubled()).toBe(6);
    expect(runs).toBe(2);
  });

  it('computed tracks dependencies dynamically', () => {
    const show = signal(false);
    const count = signal(0);
    let runs = 0;
    const c = computed(() => {
      runs++;
      return show() ? count() : -1;
    });
    c();
    count.set(1);
    c();
    expect(runs).toBe(1); // count was not a dependency
    show.set(true);
    c();
    count.set(2);
    c();
    expect(runs).toBe(3);
  });

  it('a custom equality function prevents downstream recomputation', () => {
    const user = signal({ id: 1, name: 'Ada' }, { equal: (a, b) => a.id === b.id });
    let runs = 0;
    const name = computed(() => {
      runs++;
      return user().name;
    });
    expect(name()).toBe('Ada');
    user.set({ id: 1, name: 'Grace' }); // "equal" -> ignored, value NOT replaced
    expect(name()).toBe('Ada');
    expect(user().name).toBe('Ada');
    expect(runs).toBe(1);
  });

  it('effects are asynchronous: three synchronous writes -> one run with the last value', () => {
    const seen: string[] = [];
    const user = signal('a');
    TestBed.runInInjectionContext(() => effect(() => seen.push(user())));
    expect(seen).toEqual([]); // not run synchronously on creation
    TestBed.tick();
    expect(seen).toEqual(['a']); // always runs at least once
    user.set('b');
    user.set('c');
    user.set('d');
    expect(seen).toEqual(['a']);
    TestBed.tick();
    expect(seen).toEqual(['a', 'd']);
  });

  it('untracked reads do not become dependencies', () => {
    const runs: number[] = [];
    const tracked = signal(0);
    const notTracked = signal(0);
    TestBed.runInInjectionContext(() => effect(() => runs.push(tracked() + untracked(notTracked))));
    TestBed.tick();
    notTracked.set(10);
    TestBed.tick();
    expect(runs).toEqual([0]);
    tracked.set(1);
    TestBed.tick();
    expect(runs).toEqual([0, 11]);
  });

  it('onCleanup runs before the next execution and on destroy', () => {
    const events: string[] = [];
    const v = signal(1);
    const ref = TestBed.runInInjectionContext(() =>
      effect((onCleanup) => {
        const cur = v();
        events.push(`run ${cur}`);
        onCleanup(() => events.push(`cleanup ${cur}`));
      }),
    );
    TestBed.tick();
    v.set(2);
    TestBed.tick();
    ref.destroy();
    expect(events).toEqual(['run 1', 'cleanup 1', 'run 2', 'cleanup 2']);
  });

  it('effect() outside an injection context needs the `injector` option', () => {
    expect(() => effect(() => undefined)).toThrow(/NG0203/);
    const injector = TestBed.inject(Injector);
    expect(() => effect(() => undefined, { injector }).destroy()).not.toThrow();
  });

  it('linkedSignal (shorthand) resets when its computation changes', () => {
    const options = signal(['Ground', 'Air', 'Sea']);
    const selected = linkedSignal(() => options()[0]);
    selected.set('Sea');
    expect(selected()).toBe('Sea');
    options.set(['Email', 'Sea']);
    expect(selected()).toBe('Email');
  });

  it('linkedSignal (source + computation) can keep the previous choice', () => {
    const options = signal(['Ground', 'Air', 'Sea']);
    const selected = linkedSignal<string[], string>({
      source: options,
      computation: (opts, previous) => (previous && opts.includes(previous.value) ? previous.value : opts[0]),
    });
    selected.set('Sea');
    options.set(['Email', 'Sea']);
    expect(selected()).toBe('Sea');
  });

  it('linkedSignal `set` option writes back to the source', () => {
    const c = signal(0);
    const f = linkedSignal(() => (c() * 9) / 5 + 32, { set: (v) => c.set(((v - 32) * 5) / 9) });
    f.set(212);
    expect(c()).toBe(100);
    expect(f()).toBe(212);
  });

  it('signals are glitch-free: a derived pair is never inconsistent', () => {
    const n = signal(0);
    const isEven = computed(() => n() % 2 === 0);
    const seen: string[] = [];
    TestBed.runInInjectionContext(() => effect(() => seen.push(`${n()}:${isEven()}`)));
    TestBed.tick();
    n.set(1);
    TestBed.tick();
    expect(seen).toEqual(['0:true', '1:false']);
  });

  it('toObservable emits only the settled value after synchronous writes', () => {
    const s = signal(0);
    const emitted: number[] = [];
    TestBed.runInInjectionContext(() => toObservable(s)).subscribe((v) => emitted.push(v));
    TestBed.tick();
    s.set(1);
    s.set(2);
    s.set(3);
    TestBed.tick();
    expect(emitted).toEqual([0, 3]);
  });

  it('writing a signal inside computed throws NG0600', () => {
    const a = signal(0);
    const b = signal(0);
    const bad = computed(() => {
      b.set(a());
      return a();
    });
    expect(() => bad()).toThrow(/NG0600/);
  });
});
