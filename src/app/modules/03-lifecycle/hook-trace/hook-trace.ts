import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { EventLog, LogKind } from '../../../shared/event-log';

interface BufferedEntry {
  readonly message: string;
  readonly kind: LogKind;
}

/**
 * Records lifecycle hook calls WITHOUT writing signals while Angular is rendering.
 *
 * Why a plain buffer + "recording window" instead of writing a signal in each hook?
 * - Writing a signal from ngDoCheck / ngAfter*Checked / afterEveryRender schedules a new
 *   change detection, which calls those hooks again -> endless loop in a zoneless app.
 * - So hooks only push into a plain array (no reactivity). A user action opens a short
 *   "recording window"; when it closes, the buffer is flushed into an EventLog (signal).
 * - The flush re-renders only the component that reads the log (HookTraceView), and any
 *   hook fired by THAT render happens outside the window, so it is ignored -> no loop.
 *
 * Provided at component level (not root): each demo gets its own trace.
 * Docs: https://angular.dev/guide/components/lifecycle
 */
@Injectable()
export class HookTrace {
  readonly log = new EventLog(400);

  private readonly _counts = signal<ReadonlyMap<string, number>>(new Map());
  /** [hookName, calls] pairs, for the summary table. */
  readonly counts = computed(() => [...this._counts().entries()]);

  private buffer: BufferedEntry[] = [];
  private pendingCounts = new Map<string, number>();
  private recording = false;
  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  /** Opens (or extends) a recording window labelled with the user action. */
  begin(action: string): void {
    this.recording = true;
    this.buffer.push({ message: `▶ ${action}`, kind: 'info' });
    clearTimeout(this.timer);
    // The zoneless scheduler runs CD in a macrotask/rAF: 150ms is comfortably after
    // change detection AND the after*Render callbacks of that render.
    this.timer = setTimeout(() => this.flush(), 150);
  }

  /** Called from hooks. Never touches a signal. */
  record(source: string, hook: string, detail = ''): void {
    if (!this.recording) return;
    this.seq++;
    const key = `${source} · ${hook}`;
    this.pendingCounts.set(key, (this.pendingCounts.get(key) ?? 0) + 1);
    const kind: LogKind = hook.includes('Destroy') || hook.includes('onDestroy') ? 'warning' : 'hook';
    this.buffer.push({ message: `#${this.seq} [${source}] ${hook}${detail ? ' — ' + detail : ''}`, kind });
  }

  clear(): void {
    this.log.clear();
    this.seq = 0;
    this._counts.set(new Map());
  }

  private flush(): void {
    this.recording = false;
    for (const entry of this.buffer) this.log.add(entry.message, entry.kind);
    this.buffer = [];
    if (this.pendingCounts.size) {
      const merged = new Map(this._counts());
      for (const [key, n] of this.pendingCounts) merged.set(key, (merged.get(key) ?? 0) + n);
      this._counts.set(merged);
      this.pendingCounts.clear();
    }
  }
}
