# Kinesa ✦

A Coptic and Bible trivia game frontend for up to four players, with animated Gospel companions and a liquid-glass interface.

![Kinesa game lobby](docs/kinesa-desktop.png)

## Run locally

Node.js 20.19+ or 22.12+ is required; Node.js 24 is recommended.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. To build and serve the production version:

```sh
npm run build
npm run preview
```

Deploy `dist/` to any static host at the origin root. The app uses hash navigation and needs no routing rewrites or API keys. Discover and Collection support direct links; unfinished matches can be resumed from the home screen.

## The experience

- **Random game:** enter a name, preview matchmaking with three explicitly labeled practice bots, reveal the companions, and play. Bots spin and answer on their own turns; the player advances after reading each explanation. Bot points do not inflate the player's collection.
- **Play with friends:** create a room for two to four people or join a preview room. Seat cards, occupancy, editable names, input focus, and copy feedback make setup clear. Full rooms reject extra players; a saved room can be reopened with its roster intact. The sample join code is `AMEN24`. These preview codes do not connect separate devices.
- **Random companion assignment:** players never choose their Gospel figure. Each new match uses a fresh Fisher–Yates shuffle of the lion, ox, eagle, and human, dealing without replacement. There can be no duplicate companions in a match. Rematches shuffle again.
- **Guided setup:** a three-step indicator explains setup, companion reveal, and play. Desktop setup includes an illustrated rules panel, with a compact layout on phones.
- **Animated reveal:** each player's companion appears on a flipping card before gameplay begins. Card colors follow the companion's identity. Players can return to edit the roster, then deal a new set before starting.
- **Interactive game scene:** character high-fives cycle distinct greetings, and practice spins land on and announce the actual category. Scene animation can be paused. Reduced-motion preferences disable ambient movement and shorten deliberate spins.
- **Native 3D companions:** original Three.js models with baby-like proportions, fuller cheeks, large warm eyes, sculpted muzzles, soft feathers, curved horns, curls, paws and hands. Turns reveal actual geometry. Curved irises and pupils sit on the eyeballs with visible cream rims and soft highlights. Physical eyelids blink, eyes lead pointer attention, and heads and torsos follow with different weight. Articulated shoulders, elbows, wrists, tails, ears and Mattie’s halo keep moving through greetings. Repeated taps preserve spring position and velocity, then settle back into continuous idle. One shared WebGL studio draws all characters and face-focused portraits in a background worker, keeping geometry, shader compilation and animation away from clicks and navigation; no GPU context is created per avatar. Browsers without transferable canvases use the same studio on the main thread. Offscreen characters and hidden tabs suspend, scene pause freezes the exact pose, and reduced motion remains static. Self-hosted rendered posters cover startup and unavailable WebGL.
- **Mobile-first entry:** both game modes appear above the illustrated arena on phones; the mobile navigation dock hides during room setup and matches so it cannot crowd the reveal or cover answers.
- **Clear turn handoffs:** pass the device to the named player, confirm readiness, then spin. A segmented round indicator and phase-aware player status keep the turn clear.
- **Saved match:** unfinished matches survive refresh, including the same companions, scores, question, selected answer, and handoff state. The home screen shows the active companion, current turn, and round with a direct resume action. Invalid saves are rejected.
- **Keyboard controls:** answer with A–D or 1–4 when a human question is active; shortcuts ignore text fields, links, other controls, and dialogs. Rapid input is credited once in both the game and collection.
- **Complete local match:** six-category wheel, questions, source explanations, 100 points per correct answer, three rounds per player, shared wins, and rematches. The results screen includes actual match totals, tied rankings, accuracy, and animated score bars.
- **Discover:** browse all six categories and try their existing sample questions, with correct answers, explanations, and sources. These samples are unscored and never award badges.
- **Collection:** an actual-progress ring, earned and locked interactive badges, unlock details, correct-answer totals, completed matches, and useful empty states. Progress belongs to this browser and includes human players on this device.
- **Companion details:** tap any player in the scoreboard or final standings to meet their Gospel companion and inspect their match progress.
- **Safe navigation:** browser Back/Forward, focused page headings, mobile rules, focus-restoring dialogs, and a skip link. Leaving a match, opening a dialog, or hiding the tab pauses active spins and practice-opponent timers. Starting another match asks before replacing an unfinished game. Sound is optional, off by default, and confirms changes visibly.
- **Liquid glass:** frosted translucent panes, reflective edges, softly tinted actions, a floating navigation dock, and subtle pointer-driven highlights on desktop. Touch and reduced-motion modes keep lighting steady; reduced-transparency and unsupported-blur browsers receive more opaque surfaces. Questions use a quieter, more opaque pane for reading.
- **Responsive interface:** desktop navigation, a mobile game dock, keyboard-operable dialogs, visible focus, and reduced-motion support.

The original Gospel-symbol companions are **Leo the lion / Mark**, **Lou the ox / Luke**, **Juno the eagle / John**, and **Mattie the human / Matthew**. They are fictional companions inspired by traditional Gospel symbols, not portraits of the evangelists.

## Frontend scope

This edition is an interactive **frontend preview**, not a live multiplayer service. Random matchmaking uses bots; friends play on one device. Online matchmaking, real remote rooms, invitations, accounts, and backend persistence are not implemented. The interface labels the preview before entry and identifies all bots.

The 12 source-noted sample questions demonstrate the experience. There is no production question database. Within a category, unseen questions are preferred until the small sample pool is exhausted. Content expansion and Coptic subject-matter review belong to a later phase.

Unfinished matches, collection progress, sound preference, nickname, and the latest preview room use browser local storage. Matches restore safely after a page reload and completed matches clear the resume slot. If storage is unavailable, play continues in memory. No player information leaves the device. Fonts and illustrations are self-hosted.

## Project structure

```text
src/
  App.jsx                  Navigation, dialogs, match state, sound and safe resume
  components/
    Home.jsx               Responsive home hierarchy and game-mode entry
    Discover.jsx           Unscored category samples and source explanations
    Collection.jsx         Real progress, badge details and empty states
    GameScene.jsx          Interactive animated hero arena
    game-scene.css         Scoped arena motion and layout
    Lobby.jsx              Game modes, room previews, matching and assignment reveal
    Game.jsx               Wheel, answers, scores and results
    Mascot.jsx             Accessible canvas host, fallback and Gospel metadata
    companion-motion.css   Full-body and portrait framing
    Wheel.jsx              Six-category wheel and icons
    *-experience.css       Scoped layout and interaction styling
  three/
    model-kit.js           Sculpting helpers, physical eyes, joints and rest poses
    lion.js / ox.js         Original sculpted animal companions
    eagle.js / human.js     Eagle feather/beak and human/tunic/hair models
    motion.js              3D spring poses, continuous idle and blended greetings
    spring.js              Exact damped-spring integration
    renderer.js            Input, viewport lifecycle and worker orchestration
    worker.js              Background animation and direct canvas presentation
    studio.js              Shared WebGL studio, cameras, merging and disposal
    renderer-main.js       Compatibility path for older browsers
  engine.js                Random assignment, scoring, turns, sample selection
  session.js               Safe local match persistence and restoration
  data.js                  Category definitions and sample deck
  styles.css               Core layout, responsive behavior and app motion
  modern.css               Interface layout, responsive behavior and setup flow
  glass.css                Liquid-glass materials and transparency fallbacks
  app-experience.css       Shared dialog, focus and toast details
  useGlassLight.js          Desktop pointer lighting without React re-renders
public/fonts/              Self-hosted fonts and OFL licenses
public/characters/         Native 3D fallback posters and model notes
tests/                     Unit and browser tests
```

To add real multiplayer, replace the local lobby with a server-backed matchmaking/room service and move authoritative assignment, turns, scoring, and validation to the server. Companions must still be shuffled and dealt **once per match** by the authority, never picked by clients. Replace sample selection with a reviewed question provider and appropriate loading/error states.

## Verification

The [component review](docs/experience-review.md) records the screens, interactions, and validation covered in this pass.

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Unit coverage enumerates all 24 four-player companion permutations, verifies no duplicates, proves submitted character choices are ignored, and checks fresh rematches, scoring, shared wins, turns, and the sample deck.

Motion unit coverage checks 30/60/120Hz trajectories, interruption continuity, eye/head/body attention timing, native XYZ wing movement, grounded feet, asynchronous blinking, bounded delayed frames, reduced-motion poses and return to idle. Browser motion checks inspect actual geometry depth, rendered pixels, physical joint quaternions, persistent instances, repeated greetings, pointer yaw, exact pause/resume, dynamic reduced motion and a single shared WebGL context.

Browser coverage also includes complete four-player matches, random bot matches, cancellation, sample room joins, input validation, repeated character interactions, mobile navigation, reduced motion, small-phone clipping, safe match restoration, keyboard answers, handoffs, unobstructed mobile answers, blocked local storage, revising a room after the companion reveal, browser history/focus, mobile rules/focus return, interrupted spins, rapid keyboard input, unfinished-match replacement, room recovery, unscored discovery, interactive collection badges, and scene motion controls.

Use an existing Chromium installation if desired:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

`npm run format` formats the source. GitHub Actions runs the tests and production build on pushes and pull requests.

## Credits

Original Kinesa artwork and interface; inspired by the friendly category-wheel trivia genre, with no Trivia Crack or Muse assets. React 19, Vite, Three.js (MIT), and Lucide icons (ISC). DM Sans is bundled under the SIL Open Font License in `public/fonts/`.

[Mobile preview](docs/kinesa-mobile.png) · [3D companions](docs/kinesa-companions.png) · [Discover](docs/kinesa-discover.png) · [Collection](docs/kinesa-collection.png) · [Results](docs/kinesa-results.png) · [Companion details](docs/kinesa-companion.png) · [Game setup](docs/kinesa-setup.png) · [Friends room](docs/kinesa-room.png) · [Saved game](docs/kinesa-resume.png) · [Assignment reveal](docs/kinesa-assignment.png) · [Gameplay](docs/kinesa-gameplay.png) · [Turn handoff](docs/kinesa-handoff.png) · [Motion preview](docs/kinesa-motion.webm)
