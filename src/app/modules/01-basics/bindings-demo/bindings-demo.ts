import { Component, computed, signal } from '@angular/core';

/**
 * Interpolation + the 4 flavours of [property] bindings.
 * Docs: https://angular.dev/guide/templates/binding
 */
@Component({
  selector: 'app-bindings-demo',
  templateUrl: './bindings-demo.html',
  styleUrl: './bindings-demo.scss',
})
export class BindingsDemo {
  // Signals: Angular knows exactly when they change and refreshes the bindings that read them.
  // Docs: https://angular.dev/guide/templates/binding#render-dynamic-text-with-text-interpolation
  protected readonly name = signal('Ada');
  protected readonly disabled = signal(false);
  protected readonly colspan = signal(2);
  protected readonly highlighted = signal(true);
  protected readonly size = signal(16);
  protected readonly ariaLabel = signal('Greeting button');

  // [class] accepts a string, a string[] or a Record<string, boolean>.
  // Must be a NEW object to be detected (compared with ===), computed() does that for us.
  protected readonly classMap = computed(() => ({
    highlighted: this.highlighted(),
    big: this.size() > 20,
  }));

  // [style] accepts a string or a Record<string, string | number>.
  protected readonly styleMap = computed(() => ({
    'border-left': `${Math.round(this.size() / 2)}px solid #7b2cbf`,
    'padding-left': '8px',
  }));

  // A plain (non-signal) field. With OnPush (the default in v22) it is only re-read
  // when the component is checked for another reason (event, signal...).
  protected plainField = 'I am a plain field';

  protected toggleDisabled(): void {
    this.disabled.update((d) => !d);
  }
}
