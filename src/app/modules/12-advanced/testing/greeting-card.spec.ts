import { TestBed } from '@angular/core/testing';
import { GreetingCard } from './greeting-card';
import { GreetingService } from './greeting.service';

// Docs: https://angular.dev/guide/testing/components-scenarios
describe('GreetingCard (mocking a dependency)', () => {
  const greet = vi.fn((name: string) => `Mocked hello ${name}`);

  beforeEach(() => {
    greet.mockClear();
    TestBed.configureTestingModule({
      // Replace the real service: the component's inject(GreetingService) gets this object.
      providers: [{ provide: GreetingService, useValue: { greet } satisfies Partial<GreetingService> }],
    });
  });

  it('renders what the (mocked) service returns', async () => {
    const fixture = TestBed.createComponent(GreetingCard);
    fixture.componentRef.setInput('name', 'Ada');
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mocked hello Ada');
    expect(greet).toHaveBeenCalledWith('Ada');
  });

  it('TestBed.inject returns the same mock instance', () => {
    expect(TestBed.inject(GreetingService).greet('x')).toBe('Mocked hello x');
  });
});
