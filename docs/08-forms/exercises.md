# 08 · Forms — Exercises

Work in `src/app/sandbox/`. Each exercise is a standalone component you can drop into the sandbox page.

---

## Exercise 1 ⭐ — Template-driven contact form

**Goal:** a contact form with `ngModel` only.

- [ ] Fields: `name` (required, min 2), `email` (required, email), `message` (required, max 200).
- [ ] Show errors only when the control is `touched` or `dirty`.
- [ ] The submit button is disabled while the form is invalid; on submit, log `f.value` and call `resetForm()`.
- [ ] Bind each field to a `signal()` with `[(ngModel)]`.

<details><summary>Hints</summary>

- `#f="ngForm"`, `#nameCtrl="ngModel"`, `name="..."` is mandatory.
- `maxlength="200"` adds the `maxlength` error.
</details>

---

## Exercise 2 ⭐ — Typed reactive form with NonNullableFormBuilder

**Goal:** a "profile" form `{ firstName, lastName, age }`.

- [ ] Use `inject(NonNullableFormBuilder)`.
- [ ] `age` is a number with `Validators.min(18)`.
- [ ] A "Reset" button restores the initial values (not `null`).
- [ ] Display `fullName` derived from the form value with `toSignal(form.valueChanges)` + `computed`.

<details><summary>Hints</summary>

- `toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() })`.
- `valueChanges` emits a `Partial<...>`: handle `undefined` fields.
</details>

---

## Exercise 3 ⭐⭐ — Dynamic phone numbers + cross-field date range

**Goal:** practice `FormArray` and a group validator.

- [ ] `phones: FormArray<FormControl<string>>` with add/remove buttons, each `Validators.pattern(/^\+?[0-9 ]{6,}$/)`.
- [ ] `period: FormGroup<{ start: FormControl<string>; end: FormControl<string> }>` with a validator
      `endAfterStart` that returns `{ endBeforeStart: true }` on the group.
- [ ] Show the group error under the `end` field.

<details><summary>Hints</summary>

- Dates from `<input type="date">` are `yyyy-mm-dd` strings: string comparison works.
- `track control` in `@for` over `phones.controls`.
</details>

---

## Exercise 4 ⭐⭐ — Same form with Signal Forms

**Goal:** rewrite Exercise 3's date range with Signal Forms.

- [ ] Model: `signal({ start: '', end: '', phones: [''] })`.
- [ ] `required` on both dates, `validate` on `end` using `valueOf(p.start)`.
- [ ] `applyEach(p.phones, ...)` with `pattern`.
- [ ] Use `<form [formRoot]>` and a `submission.action` that returns a server error on `end` if the period
      is longer than 30 days.

<details><summary>Hints</summary>

- In the action, return `{ kind: 'tooLong', message: '...', fieldTree: field.end }`.
- `FormRoot` and `FormField` both go in the component `imports`.
</details>

---

## Exercise 5 ⭐⭐⭐ — One toggle, two worlds

**Goal:** build a toggle switch usable in **reactive** forms (CVA) and **Signal Forms** (FormCheckboxControl).

- [ ] `ToggleCva` implements `ControlValueAccessor` including `setDisabledState`.
- [ ] `ToggleSignal` implements `FormCheckboxControl` (a `checked` model, optional `disabled` input, `touch` output).
- [ ] Use `ToggleCva` with `formControlName="newsletter"` and `ToggleSignal` with `[formField]="f.newsletter"`.
- [ ] Disabling works in both (`control.disable()` vs `disabled(p.newsletter, () => ...)` rule).

<details><summary>Hints</summary>

- A `FormCheckboxControl` must **not** declare a `value` property.
- In Signal Forms, `disabled(path, logic)` takes a function returning `boolean` (or a reason string).
</details>

---

## Exercise 6 ⭐⭐⭐ — Interview: explain out loud

Without looking at the docs, explain in ~2 minutes each:

- [ ] Why `this.form.value` and `this.form.getRawValue()` can differ, with an example.
- [ ] What happens step by step when a user types in an input bound with `formControlName` that has a
      sync and an async validator (status values, which events fire, what `pending` means).
- [ ] Debug this: "my cross-field error never shows" with
      `@if (form.controls.confirm.errors?.['mismatch'])` while the validator is on the group.
- [ ] In Signal Forms, why can `valid()` and `invalid()` both be `false`?
