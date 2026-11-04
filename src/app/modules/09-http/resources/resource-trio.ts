import { httpResource } from '@angular/common/http';
import { Component, inject, resource, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpLog } from '../http-log';
import { UserDetails } from '../user';
import { UserApi } from '../user-api';
import { ResourceCard } from './resource-card';

/** Waits `ms`, but rejects immediately if the AbortSignal fires (so we can SEE aborts). */
function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(id);
      reject(signal.reason);
    });
  });
}

/**
 * Three ways to load the same user reactively. Same params signal, same status/value/error API.
 * Docs: https://angular.dev/guide/signals/resource
 */
@Component({
  selector: 'app-resource-trio',
  imports: [ResourceCard],
  templateUrl: './resource-trio.html',
  styleUrl: './resource-trio.scss',
})
export class ResourceTrio {
  private readonly api = inject(UserApi);
  private readonly log = inject(HttpLog).log;
  /** undefined → every resource goes 'idle' (loader not called). 99 → 404 error. */
  protected readonly userId = signal<number | undefined>(1);

  /**
   * 1. resource(): Promise-based loader. Here with native fetch → bypasses HttpClient
   *    (NO interceptors: this one doesn't appear in the HTTP log as →/← lines).
   * Docs: https://angular.dev/guide/signals/resource#aborting-requests
   */
  protected readonly withResource = resource({
    params: () => this.userId(),
    loader: async ({ params: id, abortSignal }): Promise<UserDetails> => {
      abortSignal.addEventListener('abort', () => this.log.add(`resource(): loader for user ${id} aborted`, 'warning'));
      await abortableDelay(800, abortSignal); // artificial latency so you can switch quickly
      const res = await fetch(`/mock/users/${id}.json`, { signal: abortSignal });
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      return (await res.json()) as UserDetails;
    },
  });

  /**
   * 2. rxResource(): Observable-based `stream` → reuse an existing HttpClient service.
   * Docs: https://angular.dev/ecosystem/rxjs-interop#using-rxresource-for-async-data
   */
  protected readonly withRxResource = rxResource({
    params: () => this.userId(),
    stream: ({ params: id }) => this.api.getUser(id),
  });

  /**
   * 3. httpResource(): HttpClient-backed resource, reactive URL. Goes through interceptors.
   * Returning undefined from the request function → no request, status 'idle'.
   * Docs: https://angular.dev/guide/http/http-resource
   */
  protected readonly withHttpResource = httpResource<UserDetails>(() => {
    const id = this.userId();
    return id === undefined ? undefined : `/mock/users/${id}.json`;
  });

  protected readonly ids = [1, 2, 3, 99] as const;
}
