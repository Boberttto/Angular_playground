import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { UserApi } from '../user-api';

interface Outcome {
  readonly ok: boolean;
  readonly text: string;
}

/**
 * HttpErrorResponse, catchError, retry.
 * Docs: https://angular.dev/guide/http/making-requests#handling-request-failure
 */
@Component({
  selector: 'app-error-handling',
  templateUrl: './error-handling.html',
})
export class ErrorHandling {
  private readonly api = inject(UserApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly outcome = signal<Outcome | null>(null);

  flaky(): void {
    this.run(this.api.getFlaky(), (r) => r.message);
  }

  broken(): void {
    this.run(this.api.getBroken(), () => 'unexpected success');
  }

  missing(): void {
    this.run(this.api.getMissing(), () => 'unexpected success');
  }

  private run<T>(source: Observable<T>, describe: (value: T) => string): void {
    this.outcome.set(null);
    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (v) => this.outcome.set({ ok: true, text: describe(v) }),
      error: (e: Error) => this.outcome.set({ ok: false, text: e.message }),
    });
  }
}
