# TECH STACK — Interview Spin

**Companions:** [PRD.md](./PRD.md) · [DESIGN.md](./DESIGN.md)  
**Status:** Recommended implementation stack  
**Last updated:** 2026-09-26

## 1. Stack decision

Use a single **React + Vite + TypeScript** browser application. Style it with **Tailwind CSS** and build the controls with **shadcn/ui**. Keep the question bank in source code and save attendance and timer settings in **browser `localStorage`**. No backend or hosted service is needed for one person practicing locally.

| Area | Choice | Why it fits this app |
| --- | --- | --- |
| UI | React | Components for the spinner, question, timer, and attendance grid on one page. |
| Language | TypeScript | Typed questions, practice states, and persisted data. |
| Build and local server | Vite with the `react-ts` template | Fast local development and a static browser build. |
| Styling | Tailwind CSS with `@tailwindcss/vite` | Responsive layout and consistent calendar color tokens. |
| UI components | shadcn/ui | Accessible starting points for Button, Card, Select, Input, Tooltip, and Alert Dialog; add only components actually used. |
| Validation | Zod | Validate the versioned `localStorage` document and imported JSON backups at runtime. |
| Persistence | Browser `localStorage` | Small daily counts and timer preference without a database. |
| Question content | Local `questions.ts` | Curated prompts remain available without an API request. |
| Timer and downloads | Browser APIs | `performance.now()`, `setInterval`, `Blob`, file input, and download links cover the MVP. |
| Focused tests | Vitest | Check date boundaries, picker cycles, attendance thresholds, and import validation. |
| Package manager | npm | Straightforward setup with your existing Node workflow; pnpm is also fine if you prefer it. |

### Development runtime

Use **Node.js 22.12 or newer** for current Vite and Vitest releases; check the active versions' engine requirements when installing. Current Vite also lists Node 20.19+ as supported, but current Vitest requires Node 22.12+. If your WSL installation is on Node 20, update it before adding the latest Vitest. This Node runtime is for development and building; the finished app runs in the browser. Sources: [Vite getting started](https://vite.dev/guide/) and [Vitest getting started](https://vitest.dev/guide/).

## 2. Why these additions

- **TypeScript** is worth using because the question categories, practice states, date keys, and backup format have rules that benefit from type checking. Select Vite's `react-ts` template.
- **Zod** checks data that TypeScript cannot check at runtime: old or manually edited browser storage and imported JSON files. Reject unknown schema versions and malformed records before replacing saved progress. [Zod basics](https://zod.dev/basics)
- **Vitest** is a small development dependency for meaningful logic checks. Test the local-date conversion near midnight, the 0/1/2–4/5–9/10+ color boundaries, one completion per round, and picker behavior when the pool is exhausted. It does not need to test every visual component. [Vitest guide](https://vitest.dev/guide/)

## 3. What to leave out for the MVP

| Technology | Decision | Reason |
| --- | --- | --- |
| NestJS, Prisma, PostgreSQL | Omit | No account, shared data, server API, or database queries are needed. Include these as **technical interview topics** in the question bank. |
| React Router | Omit | The product has a single page and one route. |
| Zustand or Redux | Omit initially | React state and a few focused hooks are enough for the spinner and timer. Add a store only if state sharing becomes difficult. |
| React Query | Omit | There are no remote API requests. |
| Docker | Optional | Useful if you want a consistent development environment, but adds setup for a browser-only tool. It is also an interview topic. |
| IndexedDB | Defer | Daily counts and one setting are small. Reconsider if you later save full text answers or detailed per-question history. |
| CSS animation package | Omit initially | CSS transitions/keyframes can animate the spinner; respect `prefers-reduced-motion`. |

## 4. Package and setup outline

The commands below assume npm and a new project directory:

```bash
npm create vite@latest interview-spin -- --template react-ts
cd interview-spin
npm install
npm install tailwindcss @tailwindcss/vite zod
npm install -D vitest @types/node
```

Configure Tailwind's Vite plugin, add `@import "tailwindcss";` to the main CSS file, and set the `@/*` alias in the TypeScript and Vite configurations. Then initialize shadcn/ui and add only the UI components you choose:

```bash
npx shadcn@latest init
npx shadcn@latest add button card select input tooltip alert-dialog
```

The [official shadcn/ui Vite guide](https://ui.shadcn.com/docs/installation/vite) gives the current plugin and alias configuration. The [Vite guide](https://vite.dev/guide/) documents the `react-ts` template. Check those guides if setup commands change.

Set Vite's local dev server to a fixed port with `server: { port: 5173, strictPort: true }` in `vite.config.ts`. Because `localStorage` is specific to protocol, host, and port, opening a different port can make attendance appear empty even though the original data still exists at the old origin.

## 5. Suggested project structure

```text
interview-spin/
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components added as needed
│   │   ├── PracticePanel.tsx
│   │   ├── Spinner.tsx
│   │   └── ActivityGrid.tsx
│   ├── data/questions.ts
│   ├── hooks/useAnswerTimer.ts
│   ├── lib/activityStorage.ts
│   ├── lib/localDate.ts
│   ├── lib/questionPicker.ts
│   ├── App.tsx
│   └── index.css
├── vite.config.ts
└── package.json
```

Keep pure calculation functions in `lib/` so they are easy to check with Vitest. Use React state for the current question and timer, and read/write the small versioned attendance document through `activityStorage.ts`.

## 6. Persistence and delivery

- Persist `{ version: 1, timerSeconds, activityByDate }` under one stable `localStorage` key, as specified in [DESIGN.md](./DESIGN.md).
- Add JSON **Export** and **Import** actions. Import validates the file and asks before replacing existing local progress. There is no automatic backup or browser-to-browser sync.
- `npm run dev` starts local development. `npm run build` produces static assets if you later want a local static server. Keep the same origin for continued access to the same browser storage.
- No API keys or secrets are required. Do not store sensitive answers in browser storage.

## 7. MVP dependency boundary

**Browser runtime packages:** React, React DOM, Zod, and the shadcn/ui components and their installed dependencies. **Build and test tooling:** Vite, TypeScript, `@vitejs/plugin-react`, Tailwind CSS, `@tailwindcss/vite`, Vitest, and relevant type packages. Let the Vite template and shadcn CLI install their own required dependencies instead of guessing transitive packages by hand.
