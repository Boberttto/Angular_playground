import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { form, minLength, required, validate } from '@angular/forms/signals';
import { forbiddenNameValidator, passwordsMatchValidator } from './reactive/validators';
import { SignalSignup } from './signal/signal-signup';
import { TemplateSignup } from './template-driven/template-signup';

// Verifies claims made in docs/08-forms/theory.md.
describe('08-forms', () => {
  it('reactive: custom sync and cross-field validators', () => {
    const name = new FormControl('superAdmin', { nonNullable: true, validators: forbiddenNameValidator(/admin/i) });
    expect(name.errors).toEqual({ forbiddenName: { value: 'superAdmin' } });

    const group = new FormGroup({
      password: new FormControl('abcdefgh', { nonNullable: true }),
      confirmPassword: new FormControl('nope', { nonNullable: true }),
    }, { validators: passwordsMatchValidator });
    expect(group.errors).toEqual({ passwordMismatch: true });
    // The error lives on the GROUP, not on the child control.
    expect(group.controls.confirmPassword.errors).toBeNull();
  });

  it('reactive: nonNullable controls reset to their initial value', () => {
    const c = new FormControl('initial', { nonNullable: true });
    c.setValue('changed');
    c.reset();
    expect(c.value).toBe('initial');
  });

  it('signal forms: the form writes straight into the model signal', () => {
    const model = signal({ username: '', password: '', confirm: '' });
    const f = TestBed.runInInjectionContext(() =>
      form(model, (s) => {
        required(s.username, { message: 'Username is required' });
        minLength(s.password, 8);
        validate(s.confirm, ({ value, valueOf }) =>
          value() !== valueOf(s.password) ? { kind: 'passwordMismatch' } : null,
        );
      }),
    );

    expect(f.username().valid()).toBe(false);
    expect(f.username().errors().map((e) => e.message)).toEqual(['Username is required']);

    f.username().value.set('ada');
    expect(model().username).toBe('ada'); // no copy: the model IS the data
    expect(f.username().valid()).toBe(true);

    f.password().value.set('12345678');
    f.confirm().value.set('nope');
    expect(f.confirm().errors().map((e) => e.kind)).toEqual(['passwordMismatch']);
    expect(f().valid()).toBe(false); // root validity aggregates children
    f.confirm().value.set('12345678');
    expect(f().valid()).toBe(true);
  });

  it('template-driven: status updates render in a zoneless app', async () => {
    const fixture = TestBed.createComponent(TemplateSignup);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('valid: false');

    const set = (name: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (!input) throw new Error(`no input ${name}`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('username', 'ada');
    set('email', 'ada@example.com');
    set('password', '12345678');
    await fixture.whenStable();
    expect(el.textContent).toContain('valid: true');
  });

  it('signal forms component: async rule, FormValueControl and submit', async () => {
    const fixture = TestBed.createComponent(SignalSignup);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const type = (selector: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(selector);
      if (!input) throw new Error(`missing ${selector}`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    };

    type('input[autocomplete="off"]', 'john');
    // The async rule is backed by a resource(); resources register a pending task, so
    // whenStable() waits for the fake 500 ms "server" call to finish.
    await fixture.whenStable();
    expect(el.textContent).toContain('Already taken (async rule)');

    // Custom FormValueControl: clicking the 5th star writes into the model.
    el.querySelectorAll<HTMLButtonElement>('app-rating-control button')[4].click();
    await fixture.whenStable();
    expect(el.querySelector('pre')?.textContent).toContain('"rating": 5');

    // Submitting an invalid form: FormRoot calls submit(), which marks fields touched and calls onInvalid.
    el.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(el.textContent).toContain('Submit blocked: form invalid');
    expect(el.textContent).toContain('Email is required');
  });
});
