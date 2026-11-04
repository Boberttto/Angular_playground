import { ElementRef, afterEveryRender, inject } from '@angular/core';

export interface RenderCounter {
  /** Call from the template: `{{ renders.mark() }}`. Returns '' (stable value -> no NG0100). */
  mark(): string;
}

/**
 * Counts how many times a component's TEMPLATE was refreshed, and shows it in a
 * `<span class="render-count">` that must be a DIRECT child of the host element.
 *
 * Design (why not a signal?):
 * - Writing a signal while rendering would schedule another render -> loop.
 * - In dev mode Angular runs an extra "checkNoChanges" pass that re-evaluates the template of
 *   Eager (CheckAlways) components, so counting raw calls would double-count them.
 * So the template only raises a flag, and an afterEveryRender callback (once per app render)
 * increments the counter and writes the DOM directly.
 * Docs: https://angular.dev/api/core/afterEveryRender
 */
export function injectRenderCounter(): RenderCounter {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  let dirty = false;
  let count = 0;
  afterEveryRender({
    write: () => {
      if (!dirty) return;
      dirty = false;
      count++;
      const badge = host.querySelector(':scope > .render-count');
      if (!badge) return;
      badge.textContent = `rendered ${count}×`;
      // Flash the badge (Web Animations API; absent in jsdom).
      badge.animate?.([{ background: '#ffd54f' }, { background: 'transparent' }], { duration: 700 });
    },
  });
  return {
    mark: () => {
      dirty = true;
      return '';
    },
  };
}
