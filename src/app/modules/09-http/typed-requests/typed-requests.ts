import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { User } from '../user';
import { UserApi } from '../user-api';

/**
 * Typed GET and simulated POST with HttpClient (Observable-based, cold: nothing happens until subscribe).
 * Docs: https://angular.dev/guide/http/making-requests
 */
@Component({
  selector: 'app-typed-requests',
  templateUrl: './typed-requests.html',
  styleUrl: './typed-requests.scss',
})
export class TypedRequests {
  private readonly api = inject(UserApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly users = signal<readonly User[]>([]);
  protected readonly saving = signal(false);
  protected readonly name = signal('Margaret Hamilton');

  load(skipLogging = false): void {
    this.api
      .getUsers({ skipLogging })
      // Unsubscribing (on destroy) also ABORTS an in-flight request.
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => this.users.set(users));
  }

  create(): void {
    const name = this.name().trim();
    if (!name) return;
    this.saving.set(true);
    this.api
      .createUser({ name, email: `${name.split(' ')[0].toLowerCase()}@example.com` })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => this.users.update((list) => [...list, created]),
        complete: () => this.saving.set(false),
        error: () => this.saving.set(false),
      });
  }

  protected onName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }
}
