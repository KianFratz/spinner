# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is one software engineering job seeker in the Philippines practicing for technical and behavioral interviews. They use the product independently and answer prompts aloud or otherwise outside the app.

## Product Purpose

Interview Spin makes consistent interview practice easy to begin and easy to track. It presents a relevant question, gives the user a configurable countdown that starts only when they are ready, and records a completion only when they explicitly mark the answer as finished. Success means the user can complete this loop quickly, see an accurate history of practice, and return later without losing locally saved progress.

## Positioning

Interview Spin is a private, local-first practice loop that combines shuffled, no-repeat question selection, user-started timed speaking, and a contribution-style activity record. It deliberately avoids accounts, answer capture, grading, and social mechanics so the user can focus on repeated practice rather than managing content or exposing their answers.

## Operating Context

- The product is a single-page browser application intended for personal use on one browser profile and origin.
- The user chooses all, technical, or behavioral questions, spins for a prompt, starts the timer when ready, answers outside the app, and explicitly marks the answer complete.
- The bundled question bank covers the user's software engineering interview topics and remains available without a network request.
- The usual calendar context is the Philippines. Completions are assigned to the browser's local date at the moment the user marks an answer complete.
- Settings and daily completion totals live in browser storage. Export and import provide the manual path for backup and transfer.

## Capabilities and Constraints

- The bundled bank contains 64 stable-ID questions: 48 technical and 16 behavioral.
- Questions do not repeat within an eligible category pool until that pool is exhausted; changing category establishes the appropriate pool.
- The answer timer defaults to 60 seconds and accepts whole-second durations from 30 to 600 seconds. It supports start, pause, resume, and reset.
- A timeout, skipped prompt, interrupted spin, or page reload never counts as completion. A selected answer can be counted once only after its timer has started.
- Activity is stored as daily aggregates rather than full answer records and displayed over a trailing 52-week range with exact counts and fixed intensity thresholds.
- The app has no account, backend, database, analytics, cloud sync, payments, recording, transcription, saved answer content, AI grading, or social features.
- The app must remain usable when browser storage is unavailable or invalid and must clearly distinguish unsaved progress from persisted progress.
- Detailed answer history, self-rating, notes, difficulty or topic filters, and richer persistence remain open choices for later versions.

## Brand Commitments

- The product name is **Interview Spin**.
- Do not add performance claims, testimonials, customer logos, or other social proof that the project does not possess.

## Evidence on Hand

- [`docs/PRD.md`](docs/PRD.md) defines the product scope, user journey, requirements, content boundaries, data rules, and success criteria.
- [`docs/TECH_STACK.md`](docs/TECH_STACK.md) records the implementation and persistence decisions.
- [`src/data/questions.ts`](src/data/questions.ts) contains the curated question bank with stable IDs, categories, and topics.
- [`src/App.tsx`](src/App.tsx) and the modules under `src/hooks/` and `src/lib/` implement and test the current practice loop, timer, local-date handling, selection behavior, and persistence behavior.
- The repository has no testimonials, case studies, customer evidence, benchmarks, or external validation. Future work must not fabricate them.

## Product Principles

1. Make starting the next useful practice round quick and deliberate.
2. Credit completed practice, never elapsed time or unconfirmed intent.
3. Keep personal practice private, minimal, and local by default.
4. Encourage consistency with truthful history rather than streak pressure or gamified rewards.
5. Fail transparently: the interface must never imply that progress was saved when it was not.

## Accessibility & Inclusion

- All major actions must be keyboard operable with visible focus treatment.
- Motion must respect `prefers-reduced-motion` without changing the selected result.
- Activity details must be available through text to pointer, keyboard, and touch users; color alone must never communicate a count.
- Narrow screens may scroll the activity calendar horizontally rather than shrinking targets until they become difficult to use.

