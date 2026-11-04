import { Component, viewChild } from '@angular/core';
import { EventLog } from '../../../shared/event-log';
import { LogPanel } from '../../../shared/log-panel/log-panel';
import { injectRenderCounter } from '../render-counter';
import { User } from './user';
import { UserCardEager } from './user-card-eager';
import { UserCardOnPush } from './user-card-onpush';

/**
 * Same mutable object passed to an Eager child and an OnPush child.
 * Docs: https://angular.dev/best-practices/skipping-subtrees
 */
@Component({
  selector: 'app-strategies-demo',
  imports: [UserCardEager, UserCardOnPush, LogPanel],
  templateUrl: './strategies-demo.html',
  styleUrl: './strategies-demo.scss',
})
export class StrategiesDemo {
  protected readonly log = new EventLog();
  protected readonly renders = injectRenderCounter();
  private readonly onPushCard = viewChild.required(UserCardOnPush);
  private readonly names = ['Ada', 'Grace', 'Linus', 'Margaret'];
  private i = 0;

  // A plain (non-signal) field on purpose: this is the classic pre-signals scenario.
  protected user: User = { name: 'Ada' };

  private nextName(): string {
    this.i = (this.i + 1) % this.names.length;
    return this.names[this.i];
  }

  protected mutate(): void {
    this.user.name = this.nextName(); // same reference
    this.log.add(`MUTATED user.name = "${this.user.name}" (same reference) -> OnPush child stays stale`, 'warning');
  }

  protected replace(): void {
    this.user = { ...this.user, name: this.nextName() }; // new reference
    this.log.add(`REPLACED user with a new object ("${this.user.name}") -> both children refresh`, 'success');
  }

  protected noop(): void {
    this.log.add('Event that changes nothing: parent + Eager child re-render, OnPush child skipped');
  }

  protected markForCheck(): void {
    this.onPushCard().markForCheck();
    this.log.add('markForCheck() on the OnPush child: it re-renders and shows the mutated name', 'hook');
  }
}
