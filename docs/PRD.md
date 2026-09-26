# PRD — Interview Spin

**Status:** Draft for implementation  
**Product type:** Personal, single-page, local-first interview practice tool  
**Audience:** One software engineering job seeker  
**Last updated:** 2026-09-26

## 1. Summary

Interview Spin helps its user practice answering software engineering interview questions consistently. The user spins for a question, starts a configurable answer timer, answers aloud or offline, and marks the question completed. A GitHub-style activity grid shows how many questions they completed each day.

The initial version runs locally in a browser with no account, server, or database. It stores timer preferences and attendance counts in `localStorage`; question content ships with the app. It does **not** store the user's spoken or written answers.

## 2. Goals and boundaries

### Goals

- Make it quick to begin a timed interview question, with a default of 1 minute.
- Cover both technical and behavioral interviews for software engineering roles.
- Focus technical questions on React, JavaScript, TypeScript, Node.js, NestJS, Prisma, SQL/PostgreSQL, Docker, APIs, testing, debugging, and system design at an appropriate level.
- Encourage regular practice by showing daily completion counts and visible activity intensity.
- Keep the experience usable without internet after app assets have loaded.

### Out of scope for the first version

- Accounts, cloud sync, shared data, backend APIs, payments, or a database.
- Recording audio, transcribing or storing answers, AI grading, or interview feedback.
- Multiple pages, social features, streak rewards, or leaderboards.

## 3. Primary user journey

1. Open the single-page app and see the spinner, category selection, timer setting, and activity grid.
2. Choose **All**, **Technical**, or **Behavioral** questions; **All** is the default.
3. Press **Spin question**. The control animates and selects one eligible question.
4. When the spin stops, read the selected question. A **Start answer timer** button appears; the timer does not start automatically.
5. Start the timer and answer the question. The visible countdown starts at 1:00 by default or at the saved custom duration.
6. Press **Mark answered** once the answer is finished. The activity count for the current local date increases by one and the grid updates immediately.
7. Spin again to practice another question. The user can still mark the answer after the timer reaches zero; timeout itself never counts as completion.

## 4. Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| Q1 | Ship a curated, locally bundled question bank. | Every question has a stable ID, prompt, category (`technical` or `behavioral`), and topic; no network request is needed to get a question. |
| Q2 | Offer category filtering. | All, Technical, and Behavioral are selectable; each produces only eligible questions. Behavioral prompts stay relevant to software engineering work. |
| Q3 | Spin to choose a question. | A spin animation ends on one question; rapid repeat clicks cannot create overlapping spins. A readable selected question is shown when the animation ends. |
| Q4 | Reduce immediate repetition. | Do not repeat a question from the selected category pool until all eligible questions have appeared; shuffle and start a new cycle after exhaustion. Changing category starts an appropriate pool. |
| T1 | Offer a configurable countdown. | Default is 60 seconds; the user can select or enter 30–600 seconds, in whole-second increments. The preference persists across reloads. |
| T2 | Require an explicit start. | The countdown control appears only after a question is selected and spinning ends. The countdown starts only when **Start answer timer** is pressed. |
| T3 | Handle an active timer. | Show remaining time as `m:ss`, with Pause/Resume and Reset controls. Reaching zero displays “Time’s up” without saving attendance or removing **Mark answered**. |
| A1 | Record actual practice. | **Mark answered** is enabled only for a selected question after its timer has been started. It can record that selection once; repeated clicks do not double-count. |
| A2 | Show a daily activity grid. | A trailing 52-week grid, organized by weekdays, indicates the number of questions answered on each local calendar day; future cells are not shown as completed. |
| A3 | Explain the count. | Hovering or focusing a day shows the date and exact number of completed questions, including zero. A short legend identifies the intensity levels. |
| A4 | Use fixed color thresholds. | Counts map to 0, 1, 2–4, 5–9, and 10+ questions, in order of increasing visual intensity. Show distinct colors that remain legible; do not represent levels with barely visible 5% opacity changes. |
| P1 | Persist attendance and settings locally. | Reloading or restarting the local dev server retains daily counts and timer preference in the same browser origin and profile. |
| P2 | Fail safely on unavailable storage. | If stored data is invalid or writes fail, the app stays usable, displays a clear warning, and never claims unsaved progress is persisted. |
| X1 | Provide manual backup and restore. | Export attendance and settings as JSON. Import a valid backup after showing that it will replace current local data. Reject unsupported or malformed files with a useful message. |

## 5. Content requirements

- Seed the app with at least **60 questions**: at least 45 technical questions distributed across the stack topics above and at least 15 behavioral questions relevant to engineering work (debugging, collaboration, tradeoffs, deadlines, code reviews, learning, and mistakes).
- Favor open-ended interview prompts that can be answered in approximately 1–3 minutes. Include a mix of foundational and applied questions.
- Phrase prompts clearly and avoid answers embedded in the questions.
- Keep question IDs stable if the wording changes, so future features can refer to them.
- The spinner shows the category and topic of the selected prompt. Questions can be added by editing a local TypeScript data file; the shipped app does not need an admin screen.

## 6. Activity and date rules

- Increment attendance only when the user presses **Mark answered**. Multiple distinct completed questions in a day increment the count by one each.
- Determine the day using the browser's **local date at the moment of completion**, formatted `YYYY-MM-DD`; this handles practice across midnight. In the user's usual setting that is the Philippines calendar day.
- A timer that expires, a question that is skipped, a spin that is interrupted, or a page reload before completion adds **zero**.
- Preserve all historical daily counts in storage even though the UI initially displays the trailing 52 weeks.
- A new spin abandons any unanswered current question after an inline confirmation if its timer has started. Completed questions can be replaced immediately.

## 7. Single-page layout and interaction

- **Header:** app name, one-line purpose, and backup actions.
- **Practice panel:** category filter, animated question spinner, selected question card, timer setting, countdown, and answer actions.
- **Activity panel below:** total answered in the visible range, 52-week grid, weekday labels, accessible day details, and an intensity legend.
- On a narrow screen, stack controls and allow the calendar to scroll horizontally without shrinking day cells until they are hard to interact with.
- Keep all major actions operable by keyboard, show visible focus, and respect reduced-motion preferences.

## 8. Data and privacy

- Data stays in the current browser profile on the current origin; the app makes no account or analytics request.
- Browser storage can be cleared and does not sync to other browsers or devices. An export is the user's backup.
- Store **daily aggregates**, not an indefinitely growing list of full answer records. Do not place sensitive information in `localStorage`.
- If a future version saves full text or audio answers, revisit persistence; `localStorage` is intended here for small settings and attendance data.

## 9. Success criteria

The MVP is complete when a user can spin a relevant question, choose a 60-second or custom timer, finish practice, mark it answered once, see that day's exact count and correct intensity in the grid, reload with progress intact, and export/import a backup. It should work with the local development server stopped and restarted, as long as the user returns to the same browser origin and profile.

## 10. Open product choices for later versions

- Optional self-rating and notes after each answer.
- More targeted question filters, such as difficulty or topic.
- A broader answer history or IndexedDB if detailed records become useful.
