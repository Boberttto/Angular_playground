/**
 * Registry of all learning modules. Used by the sidebar and the home page.
 * Each module lives in src/app/modules/<folder>/ and has its docs in docs/<folder>/.
 */
export interface PlaygroundModule {
  readonly folder: string;
  readonly path: string;
  readonly title: string;
  readonly summary: string;
}

export const PLAYGROUND_MODULES: readonly PlaygroundModule[] = [
  { folder: '01-basics', path: 'basics', title: 'Basics', summary: 'Templates, bindings, events, control flow, pipes' },
  { folder: '02-components', path: 'components', title: 'Components', summary: 'input(), output(), model(), projection, queries' },
  { folder: '03-lifecycle', path: 'lifecycle', title: 'Lifecycle hooks', summary: 'Hook order, render hooks, DestroyRef' },
  { folder: '04-signals', path: 'signals', title: 'Signals', summary: 'signal, computed, effect, linkedSignal, untracked' },
  { folder: '05-di-services', path: 'di-services', title: 'DI & services', summary: 'Providers, injectors, inject(), service destruction' },
  { folder: '06-rxjs', path: 'rxjs', title: 'RxJS', summary: 'Observables, Subjects, flattening operators, interop' },
  { folder: '07-routing', path: 'routing', title: 'Routing', summary: 'Params, guards, resolvers, lazy loading' },
  { folder: '08-forms', path: 'forms', title: 'Forms', summary: 'Template-driven, reactive, signal forms' },
  { folder: '09-http', path: 'http', title: 'HTTP & resources', summary: 'HttpClient, interceptors, resource(), httpResource()' },
  { folder: '10-change-detection', path: 'change-detection', title: 'Change detection', summary: 'OnPush, zoneless, signals and rendering' },
  { folder: '11-directives-pipes', path: 'directives-pipes', title: 'Directives & pipes', summary: 'Custom directives, host bindings, pipes' },
  { folder: '12-advanced', path: 'advanced', title: 'Advanced', summary: '@defer, dynamic components, SSR, testing' },
];
