import { TestBed } from '@angular/core/testing';
import { BoundaryDemo } from './boundary-demo';

// @boundary is developer preview in v22: this spec documents the observed behaviour.
describe('BoundaryDemo (@boundary / @error)', () => {
  it('renders @error when a child throws, and $reset re-renders the content', async () => {
    const fixture = TestBed.createComponent(BoundaryDemo);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Flaky widget rendered fine');

    const [explode, fix] = Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    explode.click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Caught by @boundary: FlakyWidget exploded');

    fix.click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('.error + button')?.click(); // "Try again"
    await fixture.whenStable();
    expect(el.textContent).toContain('Flaky widget rendered fine');
  });
});
