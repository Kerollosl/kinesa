# Kinesa ✦

**A little faith. A lot of fun.**

Kinesa is a playful Coptic and Bible trivia frontend for one to four people. Gather around a single device, choose your Gospel companion, and let the wheel decide your next adventure.

![Kinesa desktop home screen](docs/kinesa-desktop.png)

## Play locally

Requires Node.js 20.19+ or 22.12+ (Node.js 24 recommended).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For a production build:

```sh
npm run build
npm run preview
```

The `dist/` folder can be deployed to any static host. The app uses in-memory navigation, so no server-side routing or rewrite rules are required. It is configured for deployment at the origin root.

## What’s included

- Original animated SVG companions: **Leo the lion / Mark**, **Lou the ox / Luke**, **Juno the eagle / John**, and **Mattie the human / Matthew**. These are playful Gospel-symbol companions, not portraits of the evangelists.
- One to four players, editable names, and unique companion assignments. Choosing an occupied companion swaps assignments.
- An animated six-category wheel, four-choice questions, answer explanations and source notes, turn rotation, and three-round matches.
- 100 points per correct answer; shared victories for ties; winner celebrations and immediate rematches.
- Six explorable categories: Bible Stories, Coptic History, Saints & Heroes, Church Traditions, Feasts & Fasts, and Signs & Symbols.
- Local category badges, game totals, and correct-answer totals. Optional synthesized sound effects, off by default.
- Responsive desktop and mobile layouts, keyboard-operable dialogs, focus restoration, reduced-motion support, and untimed questions.
- Self-hosted fonts and original vector art; no external runtime services, API keys, trackers, or image requests.

## Deliberate scope

This is a **frontend prototype with local pass-and-play**, not online multiplayer. Players share one device. There is no account system, remote room/join service, production question database, or backend.

The 12 questions in `src/data.js` are an illustrative sample deck with short source notes. They demonstrate the experience and are not a reviewed production curriculum. Questions avoid repeats within a category until its sample pool is exhausted. A full four-player match can repeat questions when the wheel revisits a category. Content expansion and Coptic subject-matter review belong to the next phase.

Matches remain in memory while navigating the app and reset on a page reload. Collection progress and sound preferences use this browser’s local storage. If storage is unavailable, play continues in memory. No player information leaves the device.

## Project structure

```text
src/
  App.jsx                  App shell, home, setup, exploration, collection, game views
  components/Mascot.jsx    Four original SVG companions and character metadata
  components/Wheel.jsx     Six-segment wheel and category icons
  data.js                  Category definitions and source-noted sample questions
  engine.js                Pure match, scoring, turn and question-selection functions
  styles.css               Responsive visual system, illustrations and motion
public/
  fonts/                   Self-hosted fonts and OFL licenses
  favicon.svg              Kinesa cross mark
 tests/
  engine.test.js           Match rules and sample-deck checks
  e2e/game.spec.js         Browser coverage for complete multiplayer and solo games
```

For a future question API, replace the sample selection behind `getQuestion` and adapt the spin action to asynchronous loading/error states. For real online multiplayer, move authoritative match state, turn validation, and scoring to a server and add a room/session transport. The current frontend intentionally makes neither a network request nor an online-play claim.

## Verification

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

The browser suite covers complete four-player and solo matches, unique companion assignment, correct/incorrect answer feedback, scoring, shared wins, rematches, mobile overflow, keyboard dialog dismissal/focus restoration, persisted collection totals, and blocked local storage. To use an installed Chromium:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

Format source with `npm run format`. A GitHub Actions workflow runs unit tests, browser tests, and the production build on pushes and pull requests.

## Design & attribution

An original visual identity inspired by the friendly, category-wheel trivia genre, with a Coptic and biblical focus. It does not use Trivia Crack or Muse assets or branding.

- UI: React 19, Vite, Lucide icons (ISC license).
- Typography: Fredoka and DM Sans, bundled under their SIL Open Font Licenses in `public/fonts/`.
- Mascots and Kinesa visual artwork: original SVG illustrations created for this project.

[Mobile preview](docs/kinesa-mobile.png) · [Gameplay preview](docs/kinesa-gameplay.png)
