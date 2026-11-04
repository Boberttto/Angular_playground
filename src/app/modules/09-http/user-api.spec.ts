import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SKIP_LOGGING } from './http-context';
import { HttpLog } from './http-log';
import { loggingInterceptor } from './logging.interceptor';
import { User } from './user';
import { UserApi } from './user-api';

// Docs: https://angular.dev/guide/http/testing
describe('09 · UserApi + loggingInterceptor', () => {
  let httpTesting: HttpTestingController;
  let api: UserApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // provideHttpClient(...) BEFORE provideHttpClientTesting() (the latter overrides the backend).
      providers: [provideHttpClient(withInterceptors([loggingInterceptor])), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    api = TestBed.inject(UserApi);
  });

  afterEach(() => {
    // Fails the test if any request was made but not expected/flushed.
    httpTesting.verify();
  });

  it('GETs the typed user list', async () => {
    const users: User[] = [{ id: 1, name: 'Ada', email: 'ada@example.com', role: 'admin' }];
    // firstValueFrom subscribes → the request is sent to the testing backend.
    const promise = firstValueFrom(api.getUsers());

    const req = httpTesting.expectOne('/mock/users.json');
    expect(req.request.method).toBe('GET');
    req.flush(users);

    expect(await promise).toEqual(users);
  });

  it('POSTs the new user as JSON body', async () => {
    const promise = firstValueFrom(api.createUser({ name: 'Linus', email: 'linus@example.com' }));
    const req = httpTesting.expectOne({ method: 'POST', url: '/api/users' });
    expect(req.request.body).toEqual({ name: 'Linus', email: 'linus@example.com' });
    req.flush({ id: 100, name: 'Linus', email: 'linus@example.com', role: 'viewer' }, { status: 201, statusText: 'Created' });
    expect((await promise).id).toBe(100);
  });

  it('retries twice before surfacing a backend error', async () => {
    vi.useFakeTimers();
    try {
      const promise = firstValueFrom(api.getFlaky());
      // 1st attempt + 2 retries (each retry waits 300 ms).
      httpTesting.expectOne('/api/flaky').flush('down', { status: 503, statusText: 'Service Unavailable' });
      await vi.advanceTimersByTimeAsync(300);
      httpTesting.expectOne('/api/flaky').flush('down', { status: 503, statusText: 'Service Unavailable' });
      await vi.advanceTimersByTimeAsync(300);
      httpTesting.expectOne('/api/flaky').flush({ message: 'ok' });
      expect(await promise).toEqual({ message: 'ok' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('maps a 500 to a friendly Error', async () => {
    const promise = firstValueFrom(api.getBroken());
    httpTesting.expectOne('/api/error').flush({}, { status: 500, statusText: 'Internal Server Error' });
    await expect(promise).rejects.toThrow('Server returned 500 Internal Server Error');
  });

  it('loggingInterceptor logs requests, and honours the SKIP_LOGGING context token', async () => {
    const log = TestBed.inject(HttpLog).log;
    const http = TestBed.inject(HttpClient);

    const logged = firstValueFrom(http.get('/a'));
    httpTesting.expectOne('/a').flush({});
    await logged;

    const skipped = firstValueFrom(http.get('/b', { context: new HttpContext().set(SKIP_LOGGING, true) }));
    httpTesting.expectOne('/b').flush({});
    await skipped;

    await Promise.resolve(); // the interceptor uses addDeferred() (microtask)
    const messages = log.entries().map((e) => e.message);
    expect(messages.some((m) => m.startsWith('→ GET /a'))).toBe(true);
    expect(messages.some((m) => m.startsWith('← 200 GET /a'))).toBe(true);
    expect(messages.some((m) => m.includes('/b'))).toBe(false);
  });
});
