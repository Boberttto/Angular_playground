import { TestBed } from '@angular/core/testing';
import { DynamicDemo } from './dynamic-demo';

// Verifies the behaviour described in docs/12-advanced/theory.md (inputBinding vs setInput).
describe('DynamicDemo', () => {
  it('inputBinding follows the signal, setInput is a one-off', async () => {
    const fixture = TestBed.createComponent(DynamicDemo);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll<HTMLButtonElement>('button');
    buttons[0].click(); // createComponent + bindings
    buttons[1].click(); // createComponent + setInput
    await fixture.whenStable();
    expect(el.querySelectorAll('app-alert-card').length).toBe(2 + 1); // + NgComponentOutlet one

    const input = el.querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('missing input');
    input.value = 'Updated!';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const texts = Array.from(el.querySelectorAll('app-alert-card')).map((c) => c.textContent ?? '');
    expect(texts[0]).toContain('Updated!'); // inputBinding
    expect(texts[1]).toContain('Hello from a signal'); // setInput snapshot
  });

  it('the output binding destroys the dynamic component', async () => {
    const fixture = TestBed.createComponent(DynamicDemo);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelectorAll<HTMLButtonElement>('button')[0].click();
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('app-alert-card button')?.click();
    await fixture.whenStable();
    expect(el.textContent).toContain('closed (outputBinding)');
    expect(el.querySelectorAll('app-alert-card').length).toBe(1); // only the outlet one left
  });
});
