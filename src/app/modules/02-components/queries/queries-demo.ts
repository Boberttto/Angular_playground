import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Chip } from './chip';
import { Tab, Tabs } from './tabs';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';

/**
 * Signal queries (viewChild/viewChildren) + the legacy decorator versions.
 * Docs: https://angular.dev/guide/components/queries
 */
@Component({
  selector: 'app-queries-demo',
  imports: [Chip, Tabs, Tab, LogPanel],
  templateUrl: './queries-demo.html',
})
export class QueriesDemo implements OnInit, AfterViewInit {
  protected readonly log = new EventLog();
  protected readonly chipLabels = signal(['Angular', 'Signals']);
  protected readonly showExtraTab = signal(false);

  // String locator = template reference variable name. ElementRef generic gives typed nativeElement.
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  // Query by component class; results are kept in sync with @for.
  private readonly chips = viewChildren(Chip);
  protected readonly chipCount = computed(() => this.chips().length);
  // ⚠️ Do NOT read the children's *inputs* in this component's template (e.g. a computed mapping
  // c.label()): the query already contains the new chips while their inputs are not set yet
  // → NG0950 "Input is required but no value is available yet". Read them later (event handler).

  // `read` changes WHAT is returned for the matched element (here the host element of a component).
  private readonly firstChipEl = viewChild(Chip, { read: ElementRef });

  // --- Legacy syntax (still supported) ---
  // static: true → resolved BEFORE ngOnInit, never updated. Only for elements NOT inside @if/@for.
  @ViewChild('staticTarget', { static: true }) staticRef?: ElementRef<HTMLElement>;
  // static: false (default) → resolved before ngAfterViewInit and kept up to date.
  @ViewChild('dynamicTarget') dynamicRef?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.log.addDeferred(`ngOnInit: static @ViewChild = ${this.staticRef ? 'FOUND' : 'undefined'}`, 'hook');
    this.log.addDeferred(`ngOnInit: dynamic @ViewChild = ${this.dynamicRef ? 'FOUND' : 'undefined'}`, 'hook');
  }

  ngAfterViewInit(): void {
    this.log.addDeferred(`ngAfterViewInit: dynamic @ViewChild = ${this.dynamicRef ? 'FOUND' : 'undefined'}`, 'hook');
  }

  protected focusName(): void {
    this.nameInput().nativeElement.focus();
    this.log.add('viewChild.required("nameInput") → focus()');
  }

  protected addChip(): void {
    this.chipLabels.update((l) => [...l, `Chip ${l.length + 1}`]);
  }

  protected removeChip(): void {
    this.chipLabels.update((l) => l.slice(0, -1));
  }

  protected logLabels(): void {
    this.log.add(`viewChildren(Chip) labels: ${this.chips().map((c) => c.label()).join(', ') || '(none)'}`);
  }

  protected logFirstChip(): void {
    const el = this.firstChipEl()?.nativeElement as HTMLElement | undefined;
    this.log.add(`viewChild(Chip, {read: ElementRef}) → <${el?.tagName.toLowerCase() ?? 'none'}>`);
  }
}
