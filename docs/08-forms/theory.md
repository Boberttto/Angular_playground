# 08 · Forms

Angular 22 ships **three** form APIs in `@angular/forms`: template-driven forms, reactive forms and
**Signal Forms** (`@angular/forms/signals`, stable since v22 —
[comparison guide](https://angular.dev/guide/forms/signals/comparison)). This module implements the
**same sign-up form** with all three, plus a custom control for each world (ControlValueAccessor vs
`FormValueControl`).

Demo: [`src/app/modules/08-forms/`](../../src/app/modules/08-forms/). Behaviour claimed here is checked
by [`forms.spec.ts`](../../src/app/modules/08-forms/forms.spec.ts).

## Table of contents

1. [The building blocks (shared by template-driven & reactive)](#1-the-building-blocks-shared-by-template-driven--reactive)
2. [Template-driven forms](#2-template-driven-forms)
3. [Reactive forms (typed)](#3-reactive-forms-typed)
4. [Validators: built-in, custom, async, cross-field](#4-validators-built-in-custom-async-cross-field)
5. [FormArray](#5-formarray)
6. [Observing changes: valueChanges, statusChanges, events](#6-observing-changes-valuechanges-statuschanges-events)
7. [ControlValueAccessor (custom control for reactive/template forms)](#7-controlvalueaccessor-custom-control-for-reactivetemplate-forms)
8. [Signal Forms](#8-signal-forms)
9. [Signal Forms: validation rules](#9-signal-forms-validation-rules)
10. [Signal Forms: submission](#10-signal-forms-submission)
11. [Signal Forms: custom controls (FormValueControl)](#11-signal-forms-custom-controls-formvaluecontrol)
12. [Comparison: when to use which](#12-comparison-when-to-use-which)

---

## 1. The building blocks (shared by template-driven & reactive)

Template-driven and reactive forms share the same model classes
([docs](https://angular.dev/guide/forms/reactive-forms#reactive-forms-api-summary)):

| Class | Role |
|---|---|
| `AbstractControl` | Base class: `value`, `status` (`VALID`/`INVALID`/`PENDING`/`DISABLED`), `errors`, `touched`, `dirty`, `valueChanges`... |
| `FormControl<T>` | One value |
| `FormGroup<{...}>` | Fixed set of named controls |
| `FormArray<C>` | Ordered, dynamic list of controls |
| `FormRecord<C>` | Dynamic set of named controls of the same type |

Both add **CSS status classes** on bound elements: `ng-valid`, `ng-invalid`, `ng-pending`, `ng-pristine`,
`ng-dirty`, `ng-untouched`, `ng-touched`, and `ng-submitted` on the form
([docs](https://angular.dev/guide/forms/form-validation#control-status-css-classes)).

> 💡 **Interview tip:** `touched` = the user focused then left (blur) the control; `dirty` = the user changed the value.
> A common UX rule is "show errors when `invalid && (touched || dirty)`".

## 2. Template-driven forms

Import `FormsModule`; `NgForm` attaches to every `<form>` automatically, and each `ngModel` with a
`name` registers a `FormControl` in it ([docs](https://angular.dev/guide/forms/template-driven-forms)).
Validation comes from **attributes** (`required`, `minlength`, `email`...) backed by validator directives.

```html
<form #f="ngForm" (ngSubmit)="onSubmit(f)">
  <input name="username" [(ngModel)]="username" required minlength="3" #usernameCtrl="ngModel" />
  @if (usernameCtrl.touched && usernameCtrl.errors) {
    @let e = usernameCtrl.errors;
    @if (e['required']) { <small class="error">Required.</small> }
  }
  <button type="submit">Sign up</button>
</form>
<pre>{{ f.value | json }} valid={{ f.valid }}</pre>
```

- `[(ngModel)]` accepts a `WritableSignal` (two-way binding with signals); here `username = signal('')`.
- `#f="ngForm"` / `#ctrl="ngModel"` export the directives to read state in the template.
- `ngModelGroup="account"` creates a nested `FormGroup`.
- `form.resetForm(value?)` resets values **and** the submitted state.

> ⚠️ **Pitfall:** an `ngModel` inside a `<form>` **must** have a `name` (or `[ngModelOptions]="{standalone: true}"`),
> otherwise Angular throws: the name is the key of the control in the `NgForm` group ([API](https://angular.dev/api/forms/NgModel)).

> 💡 **Interview tip:** Template-driven forms still create `FormControl`s — they are just created *for* you by
> directives. That's why the same validators and ControlValueAccessors work in both worlds.

The spec checks that `f.valid` re-renders correctly in this **zoneless, OnPush-by-default** app.

[demo](../../src/app/modules/08-forms/template-driven/template-signup.html)

## 3. Reactive forms (typed)

Import `ReactiveFormsModule`; the form model is created in the class and bound with `[formGroup]`,
`formControlName`, `formGroupName`, `formArrayName` ([docs](https://angular.dev/guide/forms/reactive-forms)).

```ts
private readonly fb = inject(NonNullableFormBuilder);

protected readonly form = this.fb.group({
  username: this.fb.control('', {
    validators: [Validators.required, Validators.minLength(3), forbiddenNameValidator(/admin/i)],
    asyncValidators: [usernameTakenValidator],
  }),
  email: ['', [Validators.required, Validators.email]],
  account: this.fb.group(
    { password: ['', [Validators.required, Validators.minLength(8)]], confirmPassword: ['', Validators.required] },
    { validators: passwordsMatchValidator },
  ),
  skills: this.fb.array([this.fb.control('Angular', Validators.required)]),
  rating: [3, Validators.min(1)],
});
```

**Typed forms** — "As of Angular 14, reactive forms are strictly typed by default"
([docs](https://angular.dev/guide/forms/typed-forms)). The type above is inferred:
`form.controls.username` is `FormControl<string>`, `form.value` is `Partial<{...}>`, and
`form.getRawValue()` is the full object.

**Nullability:** a plain `new FormControl('x')` is `FormControl<string | null>` because `reset()` sets it
to `null`. `{ nonNullable: true }` makes `reset()` go back to the **initial value** and removes `| null`
([docs](https://angular.dev/guide/forms/typed-forms#nullability)). `NonNullableFormBuilder` (or
`fb.nonNullable`) applies that to every control it creates
([docs](https://angular.dev/guide/forms/typed-forms#formbuilder-and-nonnullableformbuilder)).

| | `FormBuilder` | `NonNullableFormBuilder` |
|---|---|---|
| `fb.control('')` type | `FormControl<string \| null>` | `FormControl<string>` |
| after `reset()` | `null` | `''` (initial value) |

- `form.value` **excludes disabled controls**; `getRawValue()` includes them
  ([API](https://angular.dev/api/forms/FormGroup)).
- `UntypedFormGroup` / `UntypedFormControl` exist for migrated legacy code
  ([docs](https://angular.dev/guide/forms/typed-forms#untyped-forms)).

```ts
// Legacy syntax (still supported) — before v14 everything was `any`
const legacy = new UntypedFormGroup({ name: new UntypedFormControl('') });
```

[demo](../../src/app/modules/08-forms/reactive/reactive-signup.ts)

## 4. Validators: built-in, custom, async, cross-field

A **validator** is a function `(control) => ValidationErrors | null`
([docs](https://angular.dev/guide/forms/form-validation#validator-functions)). Built-ins live in
`Validators` (`required`, `requiredTrue`, `email`, `min`, `max`, `minLength`, `maxLength`, `pattern`,
`nullValidator`, `compose`...) ([docs](https://angular.dev/guide/forms/form-validation#built-in-validator-functions)).

**Custom sync validator** (factory pattern from the docs):

```ts
export function forbiddenNameValidator(forbidden: RegExp): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    forbidden.test(control.value) ? { forbiddenName: { value: control.value } } : null;
}
```

**Async validator**: returns a Promise or Observable; "the observable must complete"; the control is
`PENDING` meanwhile, and async validators only run when sync validators pass
([docs](https://angular.dev/guide/forms/form-validation)).

```ts
export const usernameTakenValidator: AsyncValidatorFn = (control: AbstractControl<string>) =>
  timer(500).pipe(map(() => (TAKEN.includes(control.value.toLowerCase()) ? { usernameTaken: true } : null)));
```

To avoid one request per keystroke, use `updateOn: 'blur'` (or `'submit'`) on the control
([docs](https://angular.dev/guide/forms/form-validation)).

**Cross-field validator**: put it on the **parent group** so it can read siblings; the error is on the group
([docs](https://angular.dev/guide/forms/form-validation#cross-field-validation)):

```ts
export const passwordsMatchValidator: ValidatorFn = (group: AbstractControl) => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
};
// fb.group({...}, { validators: passwordsMatchValidator })
```

> ⚠️ **Pitfall:** the cross-field error is in `form.controls.account.errors`, **not** in
> `confirmPassword.errors` — so `confirmPassword` itself still looks valid (tested in the spec).

> 💡 **Interview tip:** For template-driven forms, a custom validator must be wrapped in a **directive** that
> provides `NG_VALIDATORS` (or `NG_ASYNC_VALIDATORS`).

[demo](../../src/app/modules/08-forms/reactive/validators.ts)

## 5. FormArray

`FormArray` holds a variable number of controls; bind it with `formArrayName` and index-based
`[formControlName]="i"` ([docs](https://angular.dev/guide/forms/reactive-forms#define-a-formarray-control)).

```ts
this.form.controls.skills.push(this.fb.control('', Validators.required));
this.form.controls.skills.removeAt(index);
```

```html
<fieldset formArrayName="skills">
  @for (skill of skills.controls; track skill; let i = $index) {
    <input [formControlName]="i" />
  }
</fieldset>
```

> 💡 **Interview tip:** `track skill` (the control instance) keeps DOM rows stable when an item is removed; tracking
> by `$index` would re-bind the remaining inputs to shifted controls.

## 6. Observing changes: valueChanges, statusChanges, events

`valueChanges` and `statusChanges` are Observables, so all RxJS operators apply:

```ts
this.form.valueChanges.pipe(debounceTime(400), takeUntilDestroyed()).subscribe((v) => ...);
```

`AbstractControl.events` is a **unified stream** of `ValueChangeEvent`, `StatusChangeEvent`,
`PristineChangeEvent`, `TouchedChangeEvent`, `FormResetEvent`, `FormSubmittedEvent`
([docs](https://angular.dev/guide/forms/reactive-forms#unified-control-state-change-events)).

> ⚠️ **Pitfall:** `setValue(v, { emitEvent: false })` updates silently — useful to avoid feedback loops between two
> controls, surprising when debugging "why didn't my subscription fire?".

## 7. ControlValueAccessor (custom control for reactive/template forms)

A **ControlValueAccessor (CVA)** is the bridge between a `FormControl` and a DOM/UI element
([API](https://angular.dev/api/forms/ControlValueAccessor)). Built-in accessors exist for inputs,
checkboxes, selects...; for a custom widget, implement 3 required methods + 1 optional and register it
with `NG_VALUE_ACCESSOR` ([API](https://angular.dev/api/forms/NG_VALUE_ACCESSOR)):

```ts
@Component({
  selector: 'app-star-rating',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarRating), multi: true }],
  template: `...`,
})
export class StarRating implements ControlValueAccessor {
  protected readonly value = signal(0);
  private onChange: (value: number) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: number | null): void { this.value.set(value ?? 0); }       // model -> view
  registerOnChange(fn: (value: number) => void): void { this.onChange = fn; }    // view -> model
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); } // optional
}
```

- `multi: true`: `NG_VALUE_ACCESSOR` is a multi-provider token (several accessors can exist on one element).
- `forwardRef`: the class is referenced inside its own decorator, before it is defined.
- The same component works with `formControlName` **and** `[(ngModel)]` (both used in the demo).

> ⚠️ **Pitfall:** calling `onChange` inside `writeValue` creates a feedback loop / marks the form dirty on init.
> `writeValue` must only update the view.

[demo](../../src/app/modules/08-forms/star-rating/star-rating.ts)

## 8. Signal Forms

Signal Forms are built on signals: you own a `WritableSignal` model and `form()` wraps it in a
**`FieldTree`** ([docs](https://angular.dev/guide/forms/signals/overview)). Setup: import from
`@angular/forms/signals` and add the `FormField` directive to the component `imports`.

```ts
protected readonly model = signal<SignUp>({ username: '', email: '', password: '', confirmPassword: '', skills: ['Angular'], rating: 3 });
protected readonly signUpForm = form(this.model, (s) => {
  required(s.username, { message: 'Username is required' });
  email(s.email, { message: 'Invalid email' });
});
```

```html
<input [formField]="signUpForm.username" />
@if (signUpForm.username().touched() && signUpForm.username().invalid()) { ... }
```

Key ideas (verified in `node_modules/@angular/forms/types/signals.d.ts` and the
[models guide](https://angular.dev/guide/forms/signals/models)):

- **The model is the source of truth**: `form` "does not maintain its own copy of the data" — editing a field
  writes into `model` (asserted in the spec).
- **Navigation is by property**: `signUpForm.username` is a `FieldTree<string>`; **call it** to get its
  `FieldState`: `signUpForm.username()`. The root state is `signUpForm()`.
- **`FieldState` signals**: `value` (a `WritableSignal`), `valid()`, `invalid()`, `pending()`, `touched()`,
  `dirty()`, `disabled()`, `hidden()`, `readonly()`, `errors()` (this field), `errorSummary()` (this field +
  descendants), `submitting()`; methods `markAsTouched()`, `markAsDirty()`, `reset(value?)`, `getError(kind)`
  ([docs](https://angular.dev/guide/forms/signals/field-state-management)).
- **`valid()` is not `!invalid()`**: with a pending async rule and no errors, both are `false`
  (typings comment on `ReadonlyFieldState.valid`).
- The **schema function runs once** (non-reactive); the rules it declares are reactive
  ([docs](https://angular.dev/guide/forms/signals/comparison#how-validation-works)).
- `form()` needs an **injection context** (field initializer, constructor, or `TestBed.runInInjectionContext`),
  or an `injector` option.
- Array fields are iterable: `@for (skill of signUpForm.skills; track $index)` gives a `FieldTree<string>` per item.
- Signal Forms do **not** add `ng-valid`/`ng-dirty` classes by default; `provideSignalFormsConfig` with the
  `NG_STATUS_CLASSES` preset restores them ([docs](https://angular.dev/guide/forms/signals/migration#automatic-status-classes)).

> ⚠️ **Pitfall:** `signUpForm.username.value()` does not exist — `value` is on the **state**:
> `signUpForm.username().value()`.

> 💡 **Interview tip:** "Why Signal Forms?" → type safety inferred from the model, validation in one schema,
> fine-grained reactivity without subscriptions, no duplicate data (the model is the form value).

[demo](../../src/app/modules/08-forms/signal/signal-signup.ts)

## 9. Signal Forms: validation rules

Rules are functions applied to **schema paths** inside the schema function
([docs](https://angular.dev/guide/forms/signals/validation)):

| Rule | Example |
|---|---|
| Built-ins | `required(p)`, `email(p)`, `min(p, 1)`, `max(p, 5)`, `minLength(p, 3)`, `maxLength(p, 20)`, `pattern(p, /re/)`, `minDate`/`maxDate` |
| Options | `{ message: '...' }`, or `{ error: ... }`, plus `when: (ctx) => boolean` for conditional rules |
| Custom sync | `validate(p, ({ value }) => cond ? { kind: 'x', message: '...' } : null)` |
| Cross-field | `validate(p.confirm, ({ value, valueOf }) => value() !== valueOf(p.password) ? {...} : null)` |
| Arrays | `applyEach(p.skills, (item) => required(item))` |
| Async | `validateHttp(p, { request, onSuccess, onError })` or lower-level `validateAsync(p, { params, factory, onSuccess, onError })` |
| Logic | `disabled(p, ...)`, `hidden(p, ...)`, `readonly(p, ...)`, `debounce(p, 300)` |

An error is a plain object with a `kind` and optional `message` (interface `ValidationError`).

**Async rule** — `validateAsync` exposes the `resource()` primitive; the docs recommend `validateHttp` for
plain HTTP checks ([docs](https://angular.dev/guide/forms/signals/async-operations)):

```ts
validateAsync(s.username, {
  params: ({ value }) => value(),
  factory: (username) =>
    resource({
      params: username,
      loader: async ({ params, abortSignal }) => {
        await fakeDelay(500, abortSignal);
        return TAKEN_USERNAMES.includes(params.toLowerCase());
      },
    }),
  onSuccess: (taken) => (taken ? { kind: 'usernameTaken', message: 'Already taken' } : null),
  onError: () => ({ kind: 'networkError', message: 'Could not check the username' }),
});
```

"Async validation runs only after all synchronous validation passes", `pending()` is `true` meanwhile,
and pending requests are cancelled when the value changes
([docs](https://angular.dev/guide/forms/signals/async-operations)).

> 💡 **Interview tip:** Signal Forms also integrate with **Standard Schema** libraries (Zod, Valibot) through
> `validateStandardSchema` ([docs](https://angular.dev/guide/forms/signals/validation#integration-with-schema-validation-libraries)).

## 10. Signal Forms: submission

`submit(form, options)` marks interactive fields touched, stops if any rule failed, otherwise runs the async
`action` (with `submitting()` = `true`) and routes returned errors to fields. It resolves to `true`/`false`
([docs](https://angular.dev/guide/forms/signals/form-submission#what-does-submit-do)).

The **`FormRoot`** directive (`<form [formRoot]="signUpForm">`) sets `novalidate`, prevents the native
submit, and calls `submit()` when the form was created with a `submission` option:

```ts
form(this.model, schemaFn, {
  submission: {
    action: async (field) => {
      await save(field().value());
      if (rejected) return { kind: 'server', message: 'Rejected', fieldTree: field.username };
      return undefined; // success
    },
    onInvalid: () => this.log.add('Submit blocked'),
  },
});
```

- Errors returned by the action **auto-clear** when the user edits the field
  ([docs](https://angular.dev/guide/forms/signals/form-submission)).
- By default, **pending** async rules don't block submission (`ignoreValidators: 'pending'` in the typings).

[demo](../../src/app/modules/08-forms/signal/signal-signup.html)

## 11. Signal Forms: custom controls (FormValueControl)

No CVA, no providers: implement `FormValueControl<T>`, whose **only required member is a `value` model()**
([docs](https://angular.dev/guide/forms/signals/custom-controls#formvaluecontrol)). Optional inputs
(`disabled`, `errors`, `touched`, `required`, `min`...) are filled automatically by `[formField]`; emitting
the optional `touch` output marks the field touched. For booleans, implement `FormCheckboxControl`
(a `checked` model) ([API](https://angular.dev/api/forms/signals/FormCheckboxControl)).

```ts
@Component({ selector: 'app-rating-control', template: `...(click)="value.set(n)" (blur)="touch.emit()"...` })
export class RatingControl implements FormValueControl<number> {
  readonly value = model(0);
  readonly disabled = input(false);
  readonly touch = output<void>();
}
// <app-rating-control [formField]="signUpForm.rating" />
```

- The docs state custom Signal Form controls "can be used with Signal, Reactive and Template-Driven Forms
  without any extra compatibility code" ([docs](https://angular.dev/guide/forms/signals/custom-controls)).
- Conversely, `[formField]` also accepts a component providing a **CVA**, "for backwards compatibility"
  (`FormField` typings).

| | ControlValueAccessor | FormValueControl |
|---|---|---|
| Contract | 4 methods + `NG_VALUE_ACCESSOR` provider | a `value = model<T>()` |
| State (disabled, errors...) | `setDisabledState` only; errors via injecting `NgControl` | optional inputs bound automatically |
| Touched | call the registered `onTouched` | emit a `touch` output |

[demo](../../src/app/modules/08-forms/signal/rating-control.ts)

## 12. Comparison: when to use which

From the official [comparison guide](https://angular.dev/guide/forms/signals/comparison#quick-comparison):

| | Signal Forms | Reactive Forms | Template-driven |
|---|---|---|---|
| Source of truth | your writable signal model | `FormControl`/`FormGroup` | component properties |
| Type safety | inferred from model | explicit (typed forms) | minimal |
| Validation | schema with path-based rules | validators passed to controls | directives / attributes |
| State management | signals | observables | Angular-managed |
| Best for | signal-based apps | complex forms | simple forms |

Guide recommendations ([docs](https://angular.dev/guide/forms/signals/comparison#choose-your-approach)):
Signal Forms for new signal-based apps; Reactive Forms for complex dynamic forms, observable-based
patterns or existing reactive codebases; Template-driven for simple forms and prototypes.

> ⚠️ **Not confirmed by official docs / opinion:** in an existing large reactive-forms codebase, migrate
> incrementally (the migration guide offers interop via `@angular/forms/signals/compat`) rather than rewriting.

---

## 🎯 Likely interview questions

1. **Template-driven vs reactive: what's the real difference?**
   <details><summary>Answer</summary>Both use FormControl/FormGroup. Template-driven creates them from directives in the template (minimal typing); reactive creates them explicitly in the class (typed, testable without DOM). (<a href="https://angular.dev/guide/forms/signals/comparison">docs</a>)</details>
2. **What does `nonNullable` change?**
   <details><summary>Answer</summary><code>reset()</code> returns to the initial value instead of <code>null</code>, and the type drops <code>| null</code>. (<a href="https://angular.dev/guide/forms/typed-forms#nullability">docs</a>)</details>
3. **Where do you put a "passwords must match" validator?**
   <details><summary>Answer</summary>Reactive: on the parent FormGroup (error on the group). Signal Forms: <code>validate()</code> on the confirm field using <code>valueOf(otherPath)</code>. (<a href="https://angular.dev/guide/forms/form-validation#cross-field-validation">docs</a>)</details>
4. **When do async validators run?**
   <details><summary>Answer</summary>Only after sync validators pass; status/pending is PENDING meanwhile; observables must complete. (<a href="https://angular.dev/guide/forms/form-validation">docs</a>, <a href="https://angular.dev/guide/forms/signals/async-operations">signal forms</a>)</details>
5. **Explain ControlValueAccessor.**
   <details><summary>Answer</summary>The adapter between a form control and a UI element: <code>writeValue</code> (model→view), <code>registerOnChange</code>/<code>registerOnTouched</code> (view→model), optional <code>setDisabledState</code>, registered with <code>NG_VALUE_ACCESSOR</code> (multi). (<a href="https://angular.dev/api/forms/ControlValueAccessor">API</a>)</details>
6. **How is a Signal Forms custom control different?**
   <details><summary>Answer</summary>Implement <code>FormValueControl&lt;T&gt;</code>: a <code>value</code> model() is enough; state inputs and a <code>touch</code> output are optional and wired by <code>[formField]</code>. (<a href="https://angular.dev/guide/forms/signals/custom-controls">docs</a>)</details>
7. **`valid()` vs `!invalid()` in Signal Forms?**
   <details><summary>Answer</summary><code>valid()</code> requires no errors and no pending rules; <code>invalid()</code> only means errors exist. With a pending async rule and no errors, both are false. (<a href="https://angular.dev/guide/forms/signals/validation#async-validation">docs</a>)</details>
8. **`form.value` vs `form.getRawValue()`?**
   <details><summary>Answer</summary><code>value</code> excludes disabled controls; <code>getRawValue()</code> includes them. (<a href="https://angular.dev/api/forms/FormGroup">API</a>)</details>
9. **Which forms API would you choose for a new Angular 22 app?**
   <details><summary>Answer</summary>The guide recommends Signal Forms for new signal-based apps; reactive forms remain a solid choice for complex/dynamic forms or existing codebases. (<a href="https://angular.dev/guide/forms/signals/comparison#choose-your-approach">docs</a>)</details>

## 📚 References

- https://angular.dev/guide/forms
- https://angular.dev/guide/forms/template-driven-forms
- https://angular.dev/guide/forms/reactive-forms
- https://angular.dev/guide/forms/reactive-forms#reactive-forms-api-summary
- https://angular.dev/guide/forms/reactive-forms#define-a-formarray-control
- https://angular.dev/guide/forms/reactive-forms#unified-control-state-change-events
- https://angular.dev/guide/forms/typed-forms
- https://angular.dev/guide/forms/typed-forms#nullability
- https://angular.dev/guide/forms/typed-forms#formbuilder-and-nonnullableformbuilder
- https://angular.dev/guide/forms/typed-forms#untyped-forms
- https://angular.dev/guide/forms/form-validation
- https://angular.dev/guide/forms/form-validation#validator-functions
- https://angular.dev/guide/forms/form-validation#built-in-validator-functions
- https://angular.dev/guide/forms/form-validation#control-status-css-classes
- https://angular.dev/guide/forms/form-validation#cross-field-validation
- https://angular.dev/api/forms/FormGroup
- https://angular.dev/api/forms/NgModel
- https://angular.dev/api/forms/ControlValueAccessor
- https://angular.dev/api/forms/NG_VALUE_ACCESSOR
- https://angular.dev/guide/forms/signals/overview
- https://angular.dev/guide/forms/signals/models
- https://angular.dev/guide/forms/signals/field-state-management
- https://angular.dev/guide/forms/signals/validation
- https://angular.dev/guide/forms/signals/validation#async-validation
- https://angular.dev/guide/forms/signals/validation#integration-with-schema-validation-libraries
- https://angular.dev/guide/forms/signals/async-operations
- https://angular.dev/guide/forms/signals/form-submission
- https://angular.dev/guide/forms/signals/form-submission#what-does-submit-do
- https://angular.dev/guide/forms/signals/custom-controls
- https://angular.dev/guide/forms/signals/custom-controls#formvaluecontrol
- https://angular.dev/guide/forms/signals/migration#automatic-status-classes
- https://angular.dev/guide/forms/signals/comparison
- https://angular.dev/guide/forms/signals/comparison#quick-comparison
- https://angular.dev/guide/forms/signals/comparison#how-validation-works
- https://angular.dev/guide/forms/signals/comparison#choose-your-approach
- https://angular.dev/api/forms/signals/FormCheckboxControl
