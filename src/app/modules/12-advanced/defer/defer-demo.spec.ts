import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { DeferDemo } from './defer-demo';

// Docs: https://angular.dev/guide/templates/defer#testing-defer-blocks
describe('DeferDemo (@defer in tests)', () => {
  beforeEach(() => {
    // Manual: blocks stay on their placeholder until the test renders a state explicitly.
    TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual });
  });

  it('can step a defer block through placeholder -> loading -> complete', async () => {
    const fixture = TestBed.createComponent(DeferDemo);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const blocks = await fixture.getDeferBlocks();
    expect(blocks.length).toBe(7); // one per demo cell
    expect(el.textContent).toContain('Timer running (2 s)');

    // Third block = `on timer(2s)` (blocks are returned in template order).
    const timerBlock = blocks[2];
    await timerBlock.render(DeferBlockState.Loading);
    expect(el.textContent).toContain('Loading chunk');

    await timerBlock.render(DeferBlockState.Complete);
    expect(el.textContent).toContain('Heavy widget loaded: timer');
  });

  it('can render the @error state', async () => {
    const fixture = TestBed.createComponent(DeferDemo);
    const [, , timerBlock] = await fixture.getDeferBlocks();
    await timerBlock.render(DeferBlockState.Error);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Chunk failed to load');
  });
});
