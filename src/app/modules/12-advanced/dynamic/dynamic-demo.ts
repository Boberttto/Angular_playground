import { NgComponentOutlet } from '@angular/common';
import {
  Component,
  ComponentRef,
  inputBinding,
  outputBinding,
  signal,
  Type,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { AlertCard, AlertKind } from './alert-card';
import { InfoCard } from './info-card';

/**
 * Programmatic rendering: ViewContainerRef.createComponent (with `bindings`, v20+, or setInput)
 * and the declarative NgComponentOutlet.
 * Docs: https://angular.dev/guide/components/programmatic-rendering
 */
@Component({
  selector: 'app-dynamic-demo',
  imports: [NgComponentOutlet, LogPanel],
  templateUrl: './dynamic-demo.html',
})
export class DynamicDemo {
  // `read: ViewContainerRef` -> get the container anchored at <ng-container #host />
  private readonly host = viewChild.required('host', { read: ViewContainerRef });
  private readonly setInputRefs: ComponentRef<AlertCard>[] = [];

  protected readonly message = signal('Hello from a signal');
  protected readonly log = new EventLog(20);

  // NgComponentOutlet state
  protected readonly outletType = signal<Type<unknown>>(AlertCard);
  protected readonly outletInputs = signal<Record<string, unknown>>({ message: 'Rendered by NgComponentOutlet', kind: 'success' });

  /** v20+: bindings declared at creation, like a template would. inputBinding keeps the input in sync with the signal. */
  protected createWithBindings(): void {
    const ref: ComponentRef<AlertCard> = this.host().createComponent(AlertCard, {
      bindings: [
        inputBinding('message', this.message),
        inputBinding('kind', () => 'info' satisfies AlertKind),
        outputBinding('closed', () => {
          this.log.add('closed (outputBinding) -> ref.destroy()', 'warning');
          ref.destroy();
        }),
      ],
    });
    this.log.add(`createComponent with bindings (container length: ${this.host().length})`, 'success');
  }

  /** Classic approach: set inputs imperatively with setInput, subscribe to the output manually. */
  protected createWithSetInput(): void {
    const ref = this.host().createComponent(AlertCard);
    // setInput marks the component for check (works with OnPush and signal inputs).
    ref.setInput('message', `Static snapshot: "${this.message()}"`);
    ref.setInput('kind', 'warning');
    ref.instance.closed.subscribe(() => ref.destroy()); // OutputEmitterRef.subscribe
    this.setInputRefs.push(ref);
    this.log.add('createComponent + setInput (does NOT follow the signal)', 'info');
  }

  protected clearAll(): void {
    this.host().clear(); // destroys every view in the container
    this.setInputRefs.length = 0;
    this.log.add('container.clear()', 'warning');
  }

  protected swapOutlet(): void {
    const isAlert = this.outletType() === AlertCard;
    this.outletType.set(isAlert ? InfoCard : AlertCard);
    // Inputs that the new component doesn't declare would throw -> pass only known ones.
    this.outletInputs.set(isAlert ? { message: 'Now an InfoCard' } : { message: 'Back to AlertCard', kind: 'success' });
  }

  protected onMessageInput(event: Event): void {
    this.message.set((event.target as HTMLInputElement).value);
  }
}
