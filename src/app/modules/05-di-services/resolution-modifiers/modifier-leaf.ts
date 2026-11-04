import { Component, Directive, inject, input } from '@angular/core';
import { NOT_PROVIDED, THEME } from './theme';

/**
 * Base class: each field uses a different resolution modifier.
 * inject() in a base-class field initializer still runs in the subclass' injection context.
 * Docs: https://angular.dev/guide/di/hierarchical-dependency-injection#resolution-modifiers
 */
@Directive()
abstract class LeafBase {
  readonly label = input.required<string>();
  // Default: own element injector → parent element injectors → environment injectors.
  protected readonly normal = inject(THEME);
  // self: ONLY this element's injector (combine with optional to avoid an error).
  protected readonly self = inject(THEME, { self: true, optional: true });
  // skipSelf: start the lookup at the PARENT element injector.
  protected readonly skipSelf = inject(THEME, { skipSelf: true, optional: true });
  // host: stop at the host boundary (see theory.md: the parent's `providers` are NOT visible here).
  protected readonly host = inject(THEME, { host: true, optional: true });
  // optional: null instead of NG0201 "No provider found".
  protected readonly missing = inject(NOT_PROVIDED, { optional: true });
}

const LEAF_TEMPLATE = `
  <strong>{{ label() }}</strong>
  <ul>
    <li><code>inject(THEME)</code> → {{ normal }}</li>
    <li><code>&#123; self: true, optional: true &#125;</code> → {{ self ?? 'null' }}</li>
    <li><code>&#123; skipSelf: true &#125;</code> → {{ skipSelf ?? 'null' }}</li>
    <li><code>&#123; host: true, optional: true &#125;</code> → {{ host ?? 'null' }}</li>
    <li><code>inject(NOT_PROVIDED, &#123; optional: true &#125;)</code> → {{ missing ?? 'null' }}</li>
  </ul>
`;

/** Leaf WITHOUT its own provider. */
@Component({ selector: 'app-modifier-leaf', template: LEAF_TEMPLATE })
export class ModifierLeaf extends LeafBase {}

/** Leaf WITH its own provider (THEME = 'leaf 🍁'). */
@Component({
  selector: 'app-modifier-leaf-own',
  template: LEAF_TEMPLATE,
  providers: [{ provide: THEME, useValue: 'leaf 🍁' }],
})
export class ModifierLeafOwn extends LeafBase {}
