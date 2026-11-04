import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TruncatePipe } from './truncate.pipe';

// Docs: https://angular.dev/guide/testing/pipes
describe('TruncatePipe', () => {
  // A pure pipe is a plain class: instantiate it, no TestBed needed.
  const pipe = new TruncatePipe();

  it('returns short strings unchanged', () => {
    expect(pipe.transform('Angular', 20)).toBe('Angular');
  });

  it('truncates long strings and appends the suffix', () => {
    expect(pipe.transform('Signals are great', 7)).toBe('Signals…');
    expect(pipe.transform('Signals are great', 7, '...')).toBe('Signals...');
  });

  it('handles null / undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  // Optional: also check it inside a template (integration test with a tiny host component).
  it('works in a template', async () => {
    @Component({
      imports: [TruncatePipe],
      template: `<p>{{ 'Hello Vitest world' | truncate: 5 }}</p>`,
    })
    class Host {}

    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('Hello…');
  });
});
