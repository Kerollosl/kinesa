# Kinesa experience review — 0.7

This pass covered the existing frontend from entry through a completed match, keeping the liquid-glass direction and the original Gospel companions.

| Area                    | Reviewed and improved                                                                                                | Verification                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Home and navigation     | Clear practice/friends entry, resume card, browser Back/Forward, page-heading focus, skip link, sound feedback       | Desktop and phone layouts; history and focus browser tests                                             |
| Character scene         | Cycling high-fives, accurate category landing, pause/resume animation, Juno’s eagle artwork                          | Repeated interactions; 320px character bounds; reduced-motion and practice-spin tests                  |
| Friends rooms           | Seat occupancy, focused name editing, copy feedback, full-room protection, saved-room recovery                       | Invalid/sample/full room flows; roster preservation and reveal editing tests                           |
| Practice matchmaking    | Explicit bot labels, animated readiness cards, cancellation, unique companion dealing                                | Full bot flow, cancellation, bot turns and collection exclusion                                        |
| Companion reveal        | Identity colors, layouts for 2–4 players, completed reveal before entry, edit roster                                 | Unique deals, fresh rematches, exact revealed companions carried into the match                        |
| Wheel and questions     | Clear active turn, accessible rules, readable options, guarded keyboard input, pause on navigation/dialog/tab hiding | All 12 sample questions fit four choices within a 390×844 viewport; input and interruption regressions |
| Feedback and handoffs   | Clear correct/incorrect states, source notes, category feedback, named readiness screen                              | Answer locking, double-input scoring, focus/scroll, handoff restoration                                |
| Player details and help | Inspectable assigned companions, match progress, focus-restoring dialogs, inert background                           | Mobile rules and dialog keyboard tests; reviewed companion and help states                             |
| Results                 | Actual totals, shared ranks, score bars, correct-answer counts, companion inspection                                 | Complete match, tie and rematch tests; desktop and phone visual review                                 |
| Discover                | Six topics, unscored sample answers, explanations/sources, keyboard focus on new questions                           | Category switching, feedback, focus and no-progress-mutation tests                                     |
| Collection              | Actual progress ring, earned/locked badges, unlock details, empty and earned states                                  | Persistent actual counts, badge details, direct refresh and focus tests                                |
| Glass and accessibility | Reflective surfaces, pointer lighting, clear focus, stronger text contrast, motion and transparency fallbacks        | Chromium desktop/phone review; automated WCAG A/AA scans on reviewed states                            |

Validation: **7 unit tests and 20 browser tests passed**, plus the production build. Browser coverage includes 320px and 390px phone layouts, reduced motion, blocked local storage, all four-player turns, and interrupted/resumed play. The review also inspected empty and earned collection states, incorrect feedback, completed results, and dialogs. Automated scans supplement the visual and interaction review; they are not a substitute for a real-device accessibility assessment.

The app remains a local frontend preview. Matchmaking uses practice bots, friends use one device, and the question deck contains 12 samples. No production question database or remote multiplayer service was added. GitHub publication remains deferred as requested.

See the [updated screenshots and animation](../README.md#credits). Regenerate them with `node scripts/capture-preview.mjs` while the Vite development server is running.
