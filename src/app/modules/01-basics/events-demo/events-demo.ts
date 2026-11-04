import { Component, signal } from '@angular/core';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/**
 * (event) bindings, $event, key filters and template reference variables (#ref).
 * Docs: https://angular.dev/guide/templates/event-listeners
 */
@Component({
  selector: 'app-events-demo',
  imports: [LogPanel],
  templateUrl: './events-demo.html',
  styleUrl: './events-demo.scss',
})
export class EventsDemo {
  protected readonly log = new EventLog();
  protected readonly todos = signal<readonly string[]>([]);

  protected onClick(event: PointerEvent): void {
    // $event is the native DOM event object (typed thanks to strict template type checking).
    this.log.add(`click at (${event.offsetX}, ${event.offsetY}), button=${event.button}`);
  }

  // Template reference variable: the template passes the HTMLInputElement itself.
  // Docs: https://angular.dev/guide/templates/variables#template-reference-variables
  protected addTodo(input: HTMLInputElement): void {
    const text = input.value.trim();
    if (!text) return;
    this.todos.update((list) => [...list, text]);
    this.log.add(`(keyup.enter) → added "${text}"`, 'success');
    input.value = '';
  }

  protected onShiftEnter(): void {
    this.log.add('(keyup.shift.enter) → modifier + key filter', 'warning');
  }

  protected onKey(event: KeyboardEvent): void {
    this.log.add(`(keydown) key="${event.key}" code="${event.code}"`);
  }

  protected onLinkClick(event: MouseEvent): void {
    // Prefer an explicit preventDefault() over returning false (docs recommendation).
    event.preventDefault();
    this.log.add('Link click prevented with $event.preventDefault()', 'warning');
  }
}
