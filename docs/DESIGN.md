# DESIGN — Interview Spin

**Companion:** [PRD.md](./PRD.md)  
**Status:** Draft for implementation  
**Last updated:** 2026-09-26

## 1. Technical approach

Build a single-page client-side app with **React + TypeScript + Vite**. Bundle questions in source code. Use browser `localStorage` for timer preference and daily attendance only. No NestJS server, Prisma client, Docker container, authentication, or database is required to run the MVP; those technologies are subjects in the question bank. Docker may be added as optional development packaging later.

Suggested module boundaries:

| Module | Responsibility |
| --- | --- |
| `data/questions.ts` | Curated, stable question IDs with category and topic. |
| `lib/questionPicker.ts` | Filter questions, shuffle pool, draw without repeats within a cycle. |
| `hooks/useAnswerTimer.ts` | Monotonic countdown, pause/resume/reset, cleanup. |
| `lib/activityStorage.ts` | Parse, validate, migrate, save, export, and import small local records. |
| `lib/localDate.ts` | Generate local `YYYY-MM-DD` dates and the trailing calendar range. |
| `components/Spinner.tsx` | Spin animation and selection control. |
| `components/PracticePanel.tsx` | Category, question, timer, and completion controls. |
| `components/ActivityGrid.tsx` | Calendar, counts, tooltip, keyboard labels, and legend. |

Keep the app in one route (`/`). Modules are organizational, not separate pages.

## 2. Screen design

```text
Interview Spin                              Export data · Import data
Practice one software engineering question at a time.

[All] [Technical] [Behavioral]           Answer time [ 1:00 ▾ ]

                   [ animated spinner ]
                    [ Spin question ]

             Selected question · React
  How would you diagnose a component that rerenders too often?

                 [ Start answer timer ]
                       1:00
            [ Pause / Resume ] [ Reset ]
                    [ Mark answered ]

Activity · 34 answers in the last year
          Oct Nov Dec ... Sep
Mon       ... calendar cells, grouped by weeks
Wed
Fri
Less  [0] [1] [2–4] [5–9] [10+]  More
```

This is a layout guide, not a requirement to reproduce an ASCII diagram in the product. The implemented grid should have weekday rows and week columns like a contribution calendar. Put controls and question text close together; show the activity panel below the practice panel.

### Visual behavior

- Use a white surface and the grayscale palette `#FFFFFF`, `#D4D4D4`, `#B3B3B3`, and `#2B2B2B` throughout. Use `#2B2B2B` for readable text, actions, and focus; `#B3B3B3` for structure; and `#D4D4D4` for quiet fills. Keep question text large and readable.
- Animate a wheel of topics or prompt previews, then resolve to the selected question. Decide the question before starting animation; visual motion must never change the recorded result unexpectedly.
- Limit motion to a short, predictable duration (for example, 1.5–2.5 seconds). With `prefers-reduced-motion: reduce`, skip or greatly shorten the animation while retaining the same result.
- Use the grayscale palette for attendance: empty `#FFFFFF`, one `#D4D4D4`, 2–4 `#B3B3B3`, and 5–9/10+ `#2B2B2B`. The exact count remains visible in text, so color is never the only source of meaning. Outline the current day.
- The cell tooltip should be available by mouse hover and keyboard focus; on touch, tapping a cell should reveal the date and count.

## 3. UI state model

A practice round has these states:

| State | Visible actions | Transition |
| --- | --- | --- |
| `idle` | Spin, category, duration | Spin → `spinning`. |
| `spinning` | Loading/spin indicator | Animation completes → `selected`. Ignore duplicate spin presses. |
| `selected` | Question, Start timer, Spin | Start → `running`; Spin → new selection. |
| `running` | Countdown, Pause, Reset, Mark answered | Pause → `paused`; countdown reaches zero → `expired`; Mark answered → `completed`. |
| `paused` | Remaining time, Resume, Reset, Mark answered | Resume → `running`; Mark answered → `completed`. |
| `expired` | Time’s up, Reset, Mark answered | Reset → `selected`; Mark answered → `completed`. |
| `completed` | Recorded confirmation, Spin | Spin → `spinning`. |

Reset returns the question to `selected` and does not decrement attendance. A new spin during `running`, `paused`, or `expired` asks for confirmation before abandoning the current answer. A spin during `completed` does not ask. Do not count a completion more than once: disable the button immediately and use a round-completed guard in the event handler.

## 4. Question selection

```ts
type Category = 'technical' | 'behavioral';
type Filter = 'all' | Category;
type Question = {
  id: string;         // e.g. 'react-render-001'
  category: Category;
  topic: string;      // e.g. 'React', 'Prisma', 'Collaboration'
  prompt: string;
};
```

For each active filter, shuffle eligible IDs and draw one per spin. When a pool empties, reshuffle; avoid making the last pick of the previous cycle the first pick of the next cycle if there is more than one question. Rebuild the current pool when the filter changes. This selection state can stay in memory; attendance is an aggregate and does not depend on recording every chosen question. Validate that category filters always have at least one bundled question.

## 5. Timer design

- Store the selected duration in whole seconds, bounded to 30–600 inclusive. Default to 60 if the saved setting is invalid.
- In the running state, set a target deadline using a monotonic clock (`performance.now() + remainingMs`); derive the displayed remaining time from that deadline on each tick. Avoid counting `setInterval` callbacks as seconds because background tabs can throttle callbacks.
- Pause by computing remaining milliseconds and clearing the active interval. Resume with a new deadline. Clean up intervals on transitions and unmount.
- Display seconds rounded up while running, so a fresh one-minute countdown first shows `1:00`. At or below zero, clamp to `0:00` and enter `expired` once.
- Changing duration between rounds updates the next round. Lock the duration control once a round has started until it is completed or abandoned.
- A reload resets the *current unsaved round* to `idle`; persisted attendance and duration remain. This avoids accidentally counting interrupted answers.

## 6. Local persistence

Use one versioned document under a stable key, for example `interview-spin:v1`:

```ts
type LocalDataV1 = {
  version: 1;
  timerSeconds: number;
  activityByDate: Record<string, number>;
};

const example: LocalDataV1 = {
  version: 1,
  timerSeconds: 60,
  activityByDate: {
    '2026-09-26': 3,
    '2026-09-27': 1,
  },
};
```

`activityByDate` contains local date keys and non-negative integer counts only. Do not store full answers or an ever-growing array of question events. If per-question history is added later, use a deliberate new schema or IndexedDB rather than silently changing the meaning of the daily counts.

### Read/write rules

1. On load, parse the document and validate the root object, `version`, timer bounds, date keys (`YYYY-MM-DD`, valid calendar dates), and counts. Ignore no malformed field silently: show a clear recovery message and fall back to safe defaults without overwriting the bad value until the user explicitly saves or imports.
2. On **Mark answered**, calculate the current local date from the browser's local date parts, increment the in-memory count, and attempt one serialized write. Only report the completion as *saved* once the write succeeds; if it fails, keep the answer visible and offer retry.
3. Use the same validation for imported backup files. Ask before replacing existing data; reject unknown schema versions. Export the exact validated document as downloadable JSON, for example `interview-spin-backup-2026-09-26.json`.
4. Wrap storage access in `try/catch` for blocked storage, quota, or malformed JSON. Show an unobtrusive but persistent error message when progress cannot be saved.
5. The origin includes protocol, host, and port. Keep the Vite dev server on a consistent port (for example, `5173`, with strict port selection) to avoid apparently missing data when it starts on a different one.

For daily dates, format local year/month/day components directly. Avoid `new Date().toISOString().slice(0, 10)`, which uses UTC and could assign a practice session near midnight to the wrong Philippines date.

## 7. Calendar calculation

- Generate a trailing 52-week interval ending at the current local week, with compact month labels covering the latest 12 months. For each rendered local date, read `activityByDate[date] ?? 0`; retain older stored entries for future features and backups.
- Align week columns consistently, show only Mon/Wed/Fri weekday labels, and retain all seven day rows. Hide or mark future dates in the current week as unavailable.
- Map counts to tokens:

| Count | Level | Visual |
| ---: | ---: | --- |
| 0 | 0 | Neutral empty cell |
| 1 | 1 | `#D4D4D4` |
| 2–4 | 2 | `#B3B3B3` |
| 5–9 | 3 | `#2B2B2B` |
| 10+ | 4 | `#2B2B2B` with the exact count in text |

- Tooltip/accessible label example: “September 26, 2026: 3 questions answered.” Show zero explicitly. Use appropriate singular grammar for one question.
- The grid should update immediately after a successful completion and roll to a new local day without a page reload if the app remains open past midnight.

## 8. Accessibility and responsive behavior

- Use native buttons and form controls, semantic headings, visible focus rings, sufficient text contrast, and a live announcement when a new question is selected or the timer expires.
- Make each day cell focusable with an accessible date-and-count label; offer click/tap details as well as hover details.
- Do not announce each countdown tick to assistive technology; announce the start, final timeout, and completion.
- Support keyboard activation of Spin, Start, Pause/Resume, Reset, Mark answered, Export, and Import.
- On small screens, stack practice controls and put the grid in a horizontally scrollable area with readable day cells and a visible scroll affordance.

## 9. Verification checklist

- Spinner selects only bundled software engineering questions matching the filter; no immediate repeat before pool exhaustion.
- Timer begins only on Start, survives background throttling accurately, pauses/resumes, and never auto-records a completion.
- A completed question increments today's *local* count once. Skipping, timing out, and reloading before marking do not increment it.
- Boundary checks: 0/1/2/4/5/9/10 completed questions map to levels 0/1/2/2/3/3/4.
- Reload at the same origin retains duration and counts; backup export/import restores them. Invalid imports and failed writes produce understandable feedback.
- Calendar count appears on mouse hover, keyboard focus, and touch; animation respects reduced motion.

## 10. Implementation sequence

1. Create the question bank, types, date utilities, and versioned storage layer.
2. Build the one-page layout, category selector, question picker, and spinner.
3. Add the explicit countdown and completion state machine.
4. Add attendance grid, local persistence, backup/import, and accessibility behavior.
5. Check the verification scenarios above in a browser, including an origin-stable restart.
