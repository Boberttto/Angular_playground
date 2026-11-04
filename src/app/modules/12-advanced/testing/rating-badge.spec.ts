import { inputBinding, outputBinding, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RatingBadge } from './rating-badge';

// Docs: https://angular.dev/guide/testing/components-scenarios
describe('RatingBadge (inputs / outputs)', () => {
  let fixture: ComponentFixture<RatingBadge>;
  let el: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(RatingBadge);
    // setInput works for signal inputs (and required ones) and marks the view for check.
    fixture.componentRef.setInput('label', 'Angular');
    fixture.componentRef.setInput('score', 3);
    await fixture.whenStable(); // zoneless: wait for the scheduled change detection
    el = fixture.nativeElement as HTMLElement;
  });

  it('renders the inputs', () => {
    expect(el.textContent).toContain('Angular: 3/5');
    expect(el.querySelector('button')?.classList.contains('top')).toBe(false);
  });

  it('updates when an input changes', async () => {
    fixture.componentRef.setInput('score', 5);
    await fixture.whenStable();
    expect(el.textContent).toContain('5/5');
    expect(el.querySelector('button')?.classList.contains('top')).toBe(true);
  });

  it('emits the score on click (subscribe to the output)', () => {
    const emitted: number[] = [];
    fixture.componentInstance.selected.subscribe((v) => emitted.push(v));
    el.querySelector('button')?.click();
    expect(emitted).toEqual([3]);
  });
});

describe('RatingBadge created with bindings (inputBinding / outputBinding)', () => {
  it('follows a signal and listens to the output', async () => {
    const score = signal(1);
    const selected = vi.fn<(value: number) => void>(); // Vitest mock function
    const fixture = TestBed.createComponent(RatingBadge, {
      bindings: [
        inputBinding('label', () => 'Bound'),
        inputBinding('score', score),
        outputBinding<number>('selected', selected),
      ],
    });
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bound: 1/5');

    score.set(4); // the binding re-reads the signal
    await fixture.whenStable();
    expect(el.textContent).toContain('4/5');

    el.querySelector('button')?.click();
    expect(selected).toHaveBeenCalledWith(4);
  });
});
