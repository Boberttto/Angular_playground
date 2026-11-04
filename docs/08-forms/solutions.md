# 08 · Forms — Solutions

All code was type-checked against Angular 22.2 by temporarily placing it in the module folder.

---

## Solution 1 — Template-driven contact form

```ts
@Component({
  selector: 'app-contact-form',
  imports: [FormsModule],
  template: `
    <form #f="ngForm" (ngSubmit)="send(f)">
      <input name="name" [(ngModel)]="name" required minlength="2" #nameCtrl="ngModel" />
      @if (nameCtrl.invalid && (nameCtrl.touched || nameCtrl.dirty)) { <small>Name: 2+ chars</small> }

      <input name="email" type="email" [(ngModel)]="email" required email #emailCtrl="ngModel" />
      @if (emailCtrl.invalid && (emailCtrl.touched || emailCtrl.dirty)) { <small>Valid email required</small> }

      <textarea name="message" [(ngModel)]="message" required maxlength="200" #msgCtrl="ngModel"></textarea>
      @if (msgCtrl.errors?.['maxlength']) { <small>Max 200 chars</small> }

      <button type="submit" [disabled]="f.invalid">Send</button>
    </form>`,
})
export class ContactForm {
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly message = signal('');

  protected send(f: NgForm): void {
    console.log(f.value); // { name, email, message }
    f.resetForm();        // clears values, touched/dirty AND the submitted flag
  }
}
```

**Why:** the directives (`required`, `minlength`, `email`, `maxlength`) register validators on the
`FormControl` created by `ngModel`. `name` is the key in `f.value`.

---

## Solution 2 — Typed reactive form with NonNullableFormBuilder

```ts
@Component({
  selector: 'app-profile-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <input formControlName="firstName" />
      <input formControlName="lastName" />
      <input type="number" formControlName="age" />
      @if (form.controls.age.errors?.['min']) { <small>18+ only</small> }
      <button type="button" (click)="form.reset()">Reset</button>
    </form>
    <p>{{ fullName() }}</p>`,
})
export class ProfileForm {
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    firstName: 'Ada',
    lastName: 'Lovelace',
    age: [36, Validators.min(18)],
  });

  // valueChanges -> signal. initialValue avoids `undefined` before the first emission.
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly fullName = computed(() => `${this.value().firstName ?? ''} ${this.value().lastName ?? ''}`.trim());
}
```

**Why:** with `NonNullableFormBuilder`, `form.controls.age` is `FormControl<number>` and `reset()` goes back
to `36`, not `null`. `valueChanges` is typed `Partial<...>` because disabled controls are excluded from
`value`, hence the `?? ''`.

---

## Solution 3 — Dynamic phone numbers + cross-field date range

```ts
export const endAfterStart: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const start: string = group.get('start')?.value ?? '';
  const end: string = group.get('end')?.value ?? '';
  return start && end && end < start ? { endBeforeStart: true } : null;
};

@Component({
  selector: 'app-period-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <div formArrayName="phones">
        @for (phone of form.controls.phones.controls; track phone; let i = $index) {
          <input [formControlName]="i" /> <button type="button" (click)="removePhone(i)">✕</button>
        }
      </div>
      <button type="button" (click)="addPhone()">+ phone</button>
      <div formGroupName="period">
        <input type="date" formControlName="start" />
        <input type="date" formControlName="end" />
        @if (form.controls.period.errors?.['endBeforeStart']) { <small>End must be after start</small> }
      </div>
    </form>`,
})
export class PeriodForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly phonePattern = Validators.pattern(/^\+?[0-9 ]{6,}$/);

  protected readonly form = this.fb.group({
    phones: this.fb.array([this.fb.control('', this.phonePattern)]),
    period: this.fb.group({ start: '', end: '' }, { validators: endAfterStart }),
  });

  protected addPhone(): void {
    this.form.controls.phones.push(this.fb.control('', this.phonePattern));
  }
  protected removePhone(i: number): void {
    this.form.controls.phones.removeAt(i);
  }
}
```

**Why:** the validator needs both dates, so it lives on the `period` group and its error is read from the
group. Tracking the control instance keeps inputs bound to the right control after a removal.

---

## Solution 4 — Same form with Signal Forms

```ts
interface Period { start: string; end: string; phones: string[] }

@Component({
  selector: 'app-period-signal-form',
  imports: [FormField, FormRoot],
  template: `
    <form [formRoot]="f">
      @for (phone of f.phones; track $index) { <input [formField]="phone" /> }
      <input type="date" [formField]="f.start" />
      <input type="date" [formField]="f.end" />
      @for (e of f.end().errors(); track e.kind) { <small>{{ e.message }}</small> }
      <button type="submit">Save</button>
    </form>`,
})
export class PeriodSignalForm {
  protected readonly model = signal<Period>({ start: '', end: '', phones: [''] });

  protected readonly f = form(
    this.model,
    (p) => {
      required(p.start);
      required(p.end);
      validate(p.end, ({ value, valueOf }) =>
        value() && valueOf(p.start) && value() < valueOf(p.start)
          ? { kind: 'endBeforeStart', message: 'End must be after start' }
          : null,
      );
      applyEach(p.phones, (phone) => pattern(phone, /^\+?[0-9 ]{6,}$/, { message: 'Invalid phone' }));
    },
    {
      submission: {
        action: async (field) => {
          const { start, end } = field().value();
          const days = (Date.parse(end) - Date.parse(start)) / 86_400_000;
          return days > 30
            ? { kind: 'tooLong', message: 'Max 30 days (server rule)', fieldTree: field.end }
            : undefined;
        },
      },
    },
  );
}
```

**Why:** the cross-field rule reads `valueOf(p.start)` so it re-runs when either date changes. The
server-side rule is a **submission error**: returned by `action`, routed to `end` via `fieldTree`, and
cleared automatically when the user edits `end`.

---

## Solution 5 — One toggle, two worlds

```ts
// Reactive / template-driven
@Component({
  selector: 'app-toggle-cva',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ToggleCva), multi: true }],
  template: `<button type="button" role="switch" [attr.aria-checked]="on()" [disabled]="disabled()"
    (click)="toggle()" (blur)="onTouched()">{{ on() ? 'ON' : 'OFF' }}</button>`,
})
export class ToggleCva implements ControlValueAccessor {
  protected readonly on = signal(false);
  protected readonly disabled = signal(false);
  private onChange: (v: boolean) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(v: boolean | null): void { this.on.set(!!v); }
  registerOnChange(fn: (v: boolean) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled.set(d); }

  protected toggle(): void {
    this.on.update((v) => !v);
    this.onChange(this.on());
  }
}

// Signal Forms
@Component({
  selector: 'app-toggle-signal',
  template: `<button type="button" role="switch" [attr.aria-checked]="checked()" [disabled]="disabled()"
    (click)="checked.set(!checked())" (blur)="touch.emit()">{{ checked() ? 'ON' : 'OFF' }}</button>`,
})
export class ToggleSignal implements FormCheckboxControl {
  readonly checked = model(false);
  readonly disabled = input(false);
  readonly touch = output<void>();
}

// Usage
@Component({
  selector: 'app-toggles',
  imports: [ReactiveFormsModule, FormField, ToggleCva, ToggleSignal],
  template: `
    <form [formGroup]="reactive"><app-toggle-cva formControlName="newsletter" /></form>
    <button type="button" (click)="reactive.controls.newsletter.disable()">disable (reactive)</button>
    <app-toggle-signal [formField]="signalForm.newsletter" />
    <label><input type="checkbox" [checked]="locked()" (change)="locked.set(!locked())" /> lock (signal)</label>`,
})
export class Toggles {
  protected readonly reactive = inject(NonNullableFormBuilder).group({ newsletter: false });
  protected readonly locked = signal(false);
  protected readonly signalForm = form(signal({ newsletter: false }), (p) => {
    disabled(p.newsletter, () => this.locked()); // reactive rule
  });
}
```

**Why:** the CVA is driven imperatively by the forms API; the Signal Forms control just exposes a
`checked` model and optional inputs, and `[formField]` binds the field's `disabled()` state to it.

---

## Solution 6 — Interview: explain out loud (model answers)

- **`value` vs `getRawValue()`:** `value` skips **disabled** controls. A disabled, pre-filled `email`
  would be missing from `form.value` but present in `form.getRawValue()`.
- **Typing in a control with sync + async validators:** the value updates → sync validators run → if they
  fail, status is `INVALID` and async validators are skipped; if they pass, status becomes `PENDING`, the
  async validator subscribes (a new value cancels the previous run), and when its Observable completes the
  status becomes `VALID`/`INVALID`. `valueChanges` and `statusChanges` (and `events`) emit along the way.
  ([docs](https://angular.dev/guide/forms/form-validation))
- **Cross-field bug:** the error is stored on the **group** (`form.errors` or `form.controls.period.errors`),
  not on `confirm`. Read it from the group, or have the validator also call `setErrors` on the child
  (discouraged: it fights other validators).
- **`valid()` and `invalid()` both `false`:** an async rule is **pending** and no error exists yet.
  `valid()` needs "no errors and nothing pending"; `invalid()` only means "has errors".
  ([docs](https://angular.dev/guide/forms/signals/validation#async-validation))
