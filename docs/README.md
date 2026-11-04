# Docs — how to use them

Each module folder contains three files:

| File           | What for                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| `theory.md`    | Concepts, pitfalls, interview tips, likely questions, and 📚 references   |
| `exercises.md` | Graded exercises (⭐ → ⭐⭐⭐) to do in `src/app/sandbox/`                  |
| `solutions.md` | Full solutions — open only after trying!                                  |

Every important claim links to the official documentation (mostly [angular.dev](https://angular.dev))
so you can verify it. Anything not confirmed by official docs is flagged with ⚠️.

## Suggested path

### 1. Foundations (junior level)
1. [01 · Basics](01-basics/theory.md)
2. [02 · Components](02-components/theory.md)
3. [03 · Lifecycle hooks](03-lifecycle/theory.md)
4. [11 · Directives & pipes](11-directives-pipes/theory.md)

### 2. Core Angular (intermediate)
5. [04 · Signals](04-signals/theory.md)
6. [05 · DI & services](05-di-services/theory.md)
7. [07 · Routing](07-routing/theory.md)
8. [08 · Forms](08-forms/theory.md)
9. [09 · HTTP & resources](09-http/theory.md)

### 3. Going deeper (senior level)
10. [06 · RxJS](06-rxjs/theory.md)
11. [10 · Change detection](10-change-detection/theory.md)
12. [12 · Advanced](12-advanced/theory.md)

### 4. Interview prep
- [Questions & answers](interview/questions-answers.md) — the main Q&A bank, by topic and level
- [Lifecycle cheat sheet](interview/lifecycle-cheatsheet.md) — for last-minute revision
- [Trick questions](interview/trick-questions.md) — the nuanced ones that separate good answers from great ones
- [What's new in Angular 17 → 22](interview/whats-new-angular-17-22.md) — "what changed recently?" is a classic

## How to practise an interview answer

1. Read the question, answer **out loud** before opening the answer.
2. Structure: *definition → how it works → example → pitfall / trade-off*.
3. Mention both the modern API and the legacy one when relevant (many codebases are still on older versions).
4. Open the source link and confirm the detail you were unsure about.
