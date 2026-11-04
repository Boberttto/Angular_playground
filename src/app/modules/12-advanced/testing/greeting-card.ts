import { Component, computed, inject, input } from '@angular/core';
import { GreetingService } from './greeting.service';

/** Depends on GreetingService -> test with a mock provider. */
@Component({
  selector: 'app-greeting-card',
  template: `<p class="greeting">{{ message() }}</p>`,
})
export class GreetingCard {
  private readonly service = inject(GreetingService);
  readonly name = input('world');
  protected readonly message = computed(() => this.service.greet(this.name()));
}
