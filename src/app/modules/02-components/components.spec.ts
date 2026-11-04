import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import ComponentsPage from './components-page';
import { RatingInput } from './model/rating-input';

@Component({
  imports: [RatingInput],
  template: `<app-rating-input [(rating)]="value" />`,
})
class ModelHost {
  value = signal(1);
}

describe('model()', () => {
  it('propagates child writes back to the parent signal', async () => {
    const fixture = TestBed.createComponent(ModelHost);
    await fixture.whenStable();
    const stars = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button.star');
    stars[3].click(); // 4th star
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(4);
  });
});

describe('ComponentsPage', () => {
  it('renders every demo without runtime errors', async () => {
    const fixture = TestBed.createComponent(ComponentsPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-demo-section').length).toBe(6);
    expect(el.querySelector('app-tabs')?.textContent).toContain('found 2 tab(s)');
    // ShadowDom component has a real shadow root
    expect(el.querySelector('app-shadow-box')?.shadowRoot).not.toBeNull();
  });
});
