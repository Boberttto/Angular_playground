import { TestBed } from '@angular/core/testing';
import BasicsPage from './basics-page';
import { ControlFlowDemo } from './control-flow-demo/control-flow-demo';

describe('BasicsPage', () => {
  it('renders every demo without runtime errors', async () => {
    const fixture = TestBed.createComponent(BasicsPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-demo-section').length).toBe(6);
    // Built-in pipes (default locale en-US)
    expect(el.textContent).toContain('$1,234.50');
    expect(el.textContent).toContain('The Lord Of The Rings');
  });
});

describe('@for track', () => {
  it('track fruit.id moves the DOM node with its item; track $index does not', async () => {
    const fixture = TestBed.createComponent(ControlFlowDemo);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const [byId, byIndex] = [...el.querySelectorAll('ol')];
    const firstById = byId.querySelector('li');
    const firstByIndex = byIndex.querySelector('li');

    // Reverse the list through the public button.
    const reverseBtn = [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Reverse');
    reverseBtn?.click();
    await fixture.whenStable();

    const liById = [...byId.querySelectorAll('li')];
    const liByIndex = [...byIndex.querySelectorAll('li')];
    // Same DOM node, now at the end (moved).
    expect(liById.at(-1)).toBe(firstById);
    // Same DOM node still first (reused, only its text changed).
    expect(liByIndex[0]).toBe(firstByIndex);
    expect(liByIndex[0].textContent).toContain('Cherry');
  });
});
