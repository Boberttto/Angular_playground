import { Component, booleanAttribute, computed, input, numberAttribute, output } from '@angular/core';

export interface ProfileSelection {
  readonly name: string;
  readonly at: Date;
}

/** Transform functions must be pure and statically analyzable (a function reference, not an expression). */
function trimAndCapitalize(value: string | undefined): string {
  const v = (value ?? '').trim();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * A presentational component showing every part of the @Component anatomy.
 * Docs: https://angular.dev/guide/components
 */
@Component({
  // Element selector, prefixed to avoid collisions with native/custom elements.
  // Docs: https://angular.dev/guide/components/selectors
  selector: 'app-profile-card',
  // Everything used in the template must be imported (standalone by default).
  imports: [],
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.scss',
  // Bindings on the HOST element (<app-profile-card>) — preferred over @HostBinding/@HostListener.
  // Docs: https://angular.dev/guide/components/host-elements
  host: {
    role: 'article', // static attribute
    '[class.featured]': 'featured()', // class binding
    '[attr.aria-label]': '"Profile of " + name()', // attribute binding
    '(click)': 'select()', // event listener on the host
  },
})
export class ProfileCard {
  // Required input: the compiler errors if a parent forgets it. Type has no `undefined`.
  // Docs: https://angular.dev/guide/components/inputs#required-inputs
  readonly name = input.required<string>();

  // Optional input with a default value.
  readonly role = input('Developer');

  // Transform: accept a wider type in the template, store a normalized value.
  readonly nickname = input('', { transform: trimAndCapitalize });

  // Built-in transforms: <app-profile-card featured /> works like a native boolean attribute.
  // Docs: https://angular.dev/api/core/booleanAttribute
  readonly featured = input(false, { transform: booleanAttribute });
  readonly level = input(1, { transform: numberAttribute });

  // Alias: the template uses [avatar], the class uses avatarEmoji. Use sparingly.
  readonly avatarEmoji = input('🙂', { alias: 'avatar' });

  // Inputs are read-only signals → derive with computed().
  protected readonly stars = computed(() => '★'.repeat(Math.max(0, Math.min(5, this.level()))));

  // output(): a typed custom event (OutputEmitterRef, not an RxJS Subject).
  // Docs: https://angular.dev/guide/components/outputs
  readonly selected = output<ProfileSelection>();

  protected select(): void {
    this.selected.emit({ name: this.name(), at: new Date() });
  }
}
