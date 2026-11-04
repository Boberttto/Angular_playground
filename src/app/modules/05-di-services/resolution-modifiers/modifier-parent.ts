import { Component } from '@angular/core';
import { ModifierLeaf, ModifierLeafOwn } from './modifier-leaf';
import { THEME } from './theme';

/** Provides THEME = 'parent 🌿' and renders two leaves (without / with their own provider). */
@Component({
  selector: 'app-modifier-parent',
  providers: [{ provide: THEME, useValue: 'parent 🌿' }],
  imports: [ModifierLeaf, ModifierLeafOwn],
  template: `
    <p>Parent provides <code>THEME = 'parent 🌿'</code> in its <code>providers</code>.</p>
    <div class="row">
      <app-modifier-leaf label="Leaf without provider" />
      <app-modifier-leaf-own label="Leaf providing 'leaf 🍁'" />
    </div>
  `,
})
export class ModifierParent {}
