import { Component, ResourceRef, input } from '@angular/core';
import { UserDetails } from '../user';

/** Renders any ResourceRef: all three resource flavours share the same signal-based API. */
@Component({
  selector: 'app-resource-card',
  template: `
    <code>{{ name() }}</code>
    <div>status: <strong>{{ res().status() }}</strong> · isLoading: {{ res().isLoading() }}</div>
    @if (res().hasValue()) {
      <div>{{ res().value()?.name }} — <em>{{ res().value()?.bio }}</em></div>
    } @else if (res().error(); as err) {
      <div class="error">{{ err.message }}</div>
    } @else { <div class="muted">no value</div> }
    <button type="button" class="secondary" (click)="res().reload()">reload()</button>
  `,
  styleUrl: './resource-card.scss',
})
export class ResourceCard {
  readonly name = input.required<string>();
  readonly res = input.required<ResourceRef<UserDetails | undefined>>();
}
