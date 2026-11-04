import { Component, inject } from '@angular/core';
import {
  API_CLIENT_LABEL,
  APP_SETTINGS,
  AppSettings,
  BUILD_INFO,
  FancyLogger,
  GREETING,
  LegacyLogger,
  Logger,
  PLUGINS,
} from './tokens';

/**
 * Every provider "recipe" in one component.
 * Docs: https://angular.dev/guide/di/defining-dependency-providers#provider-value-types
 */
@Component({
  selector: 'app-provider-recipes',
  templateUrl: './provider-recipes.html',
  styleUrl: './provider-recipes.scss',
  providers: [
    // useClass: "when someone asks for Logger, instantiate FancyLogger".
    { provide: Logger, useClass: FancyLogger },
    // useExisting: alias → same instance as Logger (NOT a second FancyLogger).
    { provide: LegacyLogger, useExisting: Logger },
    // useValue: a ready-made value (config objects, constants, mocks in tests).
    { provide: APP_SETTINGS, useValue: { apiUrl: '/api', retries: 2 } satisfies AppSettings },
    // useFactory + deps: the factory receives the deps in order. (Modern alternative: call inject() inside.)
    {
      provide: API_CLIENT_LABEL,
      useFactory: (settings: AppSettings, logger: Logger) =>
        logger.format(`client for ${settings.apiUrl} with ${settings.retries} retries`),
      deps: [APP_SETTINGS, Logger],
    },
    // multi: true → the token resolves to an ARRAY of all contributions.
    { provide: PLUGINS, useValue: 'analytics', multi: true },
    { provide: PLUGINS, useValue: 'error-reporting', multi: true },
    { provide: PLUGINS, useValue: 'feature-flags', multi: true },
  ],
})
export class ProviderRecipes {
  protected readonly logger = inject(Logger);
  protected readonly legacyLogger = inject(LegacyLogger);
  protected readonly settings = inject(APP_SETTINGS);
  protected readonly apiClientLabel = inject(API_CLIENT_LABEL);
  protected readonly plugins = inject(PLUGINS);
  protected readonly buildInfo = inject(BUILD_INFO);
  protected readonly greeting = inject(GREETING);
  protected readonly sameInstance = this.logger === this.legacyLogger;
}
