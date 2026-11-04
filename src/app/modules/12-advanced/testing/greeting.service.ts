import { Injectable } from '@angular/core';

/** Imagine an HTTP-backed service: tests replace it with a mock via `providers`. */
@Injectable({ providedIn: 'root' })
export class GreetingService {
  greet(name: string): string {
    return `Hello, ${name}! (real service, ${new Date().toLocaleTimeString()})`;
  }
}
