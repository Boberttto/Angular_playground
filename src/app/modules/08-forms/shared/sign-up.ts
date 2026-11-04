/**
 * The same small "sign-up" form is implemented three times (template-driven, reactive,
 * signal forms) so the approaches can be compared side by side.
 */
export interface SignUp {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  skills: string[];
  rating: number;
}

/** Usernames the fake async validators consider "already taken". */
export const TAKEN_USERNAMES: readonly string[] = ['john', 'jane', 'angular'];

/** Resolves after `ms`, rejects if the AbortSignal fires first (used by async validators). */
export function fakeDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(signal.reason);
    });
  });
}
