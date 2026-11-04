import { Observable, delay, of, throwError } from 'rxjs';

const FRAMEWORKS = [
  'Angular', 'AngularJS', 'Analog', 'Astro', 'Ember', 'Lit', 'Nest', 'Next.js', 'Nuxt',
  'Preact', 'Qwik', 'React', 'Remix', 'Solid', 'Svelte', 'SvelteKit', 'Vue',
];

/**
 * Fake backend: answers after a random delay (so responses can arrive OUT OF ORDER)
 * and fails when the term contains "error".
 */
export function fakeSearch(term: string): Observable<string[]> {
  if (term.toLowerCase().includes('error')) {
    return throwError(() => new Error(`Server error for "${term}"`)).pipe(delay(300));
  }
  const results = FRAMEWORKS.filter((f) => f.toLowerCase().includes(term.toLowerCase()));
  return of(results).pipe(delay(200 + Math.random() * 800));
}
