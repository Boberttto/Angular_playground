import { Component, computed, signal } from '@angular/core';
import { HasUnsavedChanges } from '../guards/guards';

/**
 * Protected by unsavedChangesGuard (CanDeactivateFn). Type something, don't save,
 * then click another link: the guard asks for confirmation.
 * Note: a CanDeactivate guard only protects in-app navigations. Closing the tab or typing
 * a new URL needs a `beforeunload` listener as well.
 */
@Component({
  selector: 'app-unsaved-editor',
  templateUrl: './unsaved-editor.html',
  styleUrl: './unsaved-editor.scss',
})
export default class UnsavedEditor implements HasUnsavedChanges {
  protected readonly saved = signal('Initial text');
  protected readonly draft = signal('Initial text');
  protected readonly dirty = computed(() => this.draft() !== this.saved());

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected save(): void {
    this.saved.set(this.draft());
  }
}
