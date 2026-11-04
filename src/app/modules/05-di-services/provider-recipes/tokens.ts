import { InjectionToken, inject } from '@angular/core';

// Docs: https://angular.dev/guide/di/defining-dependency-providers#injection-tokens

/** Non-class value → needs an InjectionToken (interfaces don't exist at runtime). */
export interface AppSettings {
  readonly apiUrl: string;
  readonly retries: number;
}
export const APP_SETTINGS = new InjectionToken<AppSettings>('APP_SETTINGS');

/**
 * Token WITH a factory: providedIn 'root' by default, tree-shakable, no providers array needed.
 * The factory runs in an injection context, so it may call inject().
 * Docs: https://angular.dev/guide/di/defining-dependency-providers#injectiontoken-with-providedin-root
 */
export const BUILD_INFO = new InjectionToken<string>('BUILD_INFO', {
  factory: () => `built at ${new Date().toLocaleDateString()} (token factory)`,
});

/** Multi-provider token: every `multi: true` provider contributes one element to the array. */
export const PLUGINS = new InjectionToken<readonly string[]>('PLUGINS');

/** A token whose value is built by a useFactory provider with deps. */
export const API_CLIENT_LABEL = new InjectionToken<string>('API_CLIENT_LABEL');

/** Token for the "lazy factory that injects" example. */
export const GREETING = new InjectionToken<string>('GREETING', {
  providedIn: 'root',
  factory: () => `Hello! (factory injected BUILD_INFO: "${inject(BUILD_INFO)}")`,
});

// --- Classes used with useClass / useExisting --------------------------------------------

/** Abstract class = a token AND a type (unlike an interface). */
export abstract class Logger {
  abstract readonly name: string;
  abstract format(msg: string): string;
}

export class PlainLogger extends Logger {
  readonly name = 'PlainLogger';
  format(msg: string): string {
    return msg;
  }
}

export class FancyLogger extends Logger {
  readonly name = 'FancyLogger';
  format(msg: string): string {
    return `✨ ${msg.toUpperCase()} ✨`;
  }
}

/** Old API name kept for backward compatibility → aliased with useExisting. */
export abstract class LegacyLogger extends Logger {}
