# Product

<!-- impeccable:product-schema 1 -->

## Platform

web, packaged for the App Store (published as "Coptic Trivia") with a Capacitor iOS wrapper; see `docs/STORE-CHECKLIST.md`

## Users

- **Church youth groups.** Teens and young adults playing together, mostly by passing one phone around (pass-and-play) at meetings, retreats, and Sunday school.
- **Individual learners.** People who play solo, often daily, to learn Bible stories, Coptic history, saints, feasts, and church traditions in short sessions.
- **Curious players.** Anyone looking for a fun spiritual learning app, including broadly Christian players outside the Coptic Orthodox Church.

Players are mostly teens and adults; an Easy tier (untimed, gentler questions) keeps younger players welcome. Phones come first; desktop is secondary.

## Product Purpose

Kinesa is a trivia game that teaches the Christian faith, with a Coptic Orthodox flavor. Learning is the point: every answer ends with an explanation and a source the player can check. Success means players come back on their own (daily challenge, streaks, progression), finish matches, and leave knowing something they didn't before.

## Positioning

Few trivia apps are grounded in Coptic Orthodox tradition: the Coptic calendar, feasts and fasts, the Desert Fathers, Saint Mark and the See of Alexandria, and the Coptic language. Kinesa pairs that grounding with original illustrated companions based on the four Gospel symbols: Leo the lion (Mark), Lou the ox (Luke), Juno the eagle (John) and Mattie the human (Matthew). The game deals companions at random; players don't choose them.

## Operating Context

- **Random game:** solo play against clearly labeled practice bots (no real online players).
- **Play with friends:** 2–4 players taking turns on one device, with a handoff screen between turns.
- **Discover:** browse categories and try unscored sample questions.
- **Collection:** progress and badges stored on this device.
- **Help:** "How to play" rules are always available.

Data lives in the browser's localStorage on this device (match, stats, nickname, sound). The app has no accounts, backend, or analytics; there is nothing to sign in to or delete remotely.

## Capabilities and Constraints

- **Stack:** React 19 + Vite, plain CSS in a single token-based stylesheet (`src/styles.css`), lucide-react icons, self-hosted Alexandria (woff2), painted companion rigs (WebGL → Canvas 2D → SVG fallbacks). Static hosting with hash navigation.
- **Saved data must survive upgrades.** Every localStorage format is versioned, and older versions are migrated, never discarded.
- **No heavy dependencies:** each new dependency must be under 30 KB gzipped. Prefer CSS and the Web Animations API.
- **Online multiplayer is not built.** There are no rooms or room codes; friends play on one device. *Open decision:* whether Kinesa later gains accounts, remote rooms, or server-backed questions. Until that's decided, keep local data shapes plain and easy to sync.
- **Question content** lives in a typed bank with exactly one correct answer, an explanation, and a verifiable source per question, checked by a validator script.

## Brand Commitments

- **Identity to keep:** the name "kinesa", a warm and friendly voice, and the four illustrated Gospel companions.
- **Look and feel (November 2026 direction):** less playful and kid-like, more recognizably Coptic, for teens and adults first. The companions stay, but in a smaller supporting role: in-game avatar and reveal moments, not the center of every screen.
- **Hard limits for the Coptic look:**
  - not somber or churchy; it should feel like a game teens want to open, with real energy in the timer, streaks and reveals;
  - no gold-and-ornate kitsch (no heavy gold frames, faux-icon borders or clip-art crosses);
  - no inaccurate details: cross forms, Coptic letters and motifs must be correct and used with care.
- **Reverence:** be playful about the *game*, never about God, the saints, scripture, or liturgy. No jokes at any denomination's expense.
- **Neutral framing:** present Coptic Orthodox positions as Coptic tradition, not as the only Christian view, unless the category is explicitly Coptic. Keep broadly Christian content accessible to everyone.
- **About the companions:** they are fictional characters inspired by the traditional Gospel symbols, not portraits of the evangelists.

## Evidence on Hand

- **Question bank:** a source-noted bank in `src/content/` (12 original samples plus additions). Questions that haven't been reviewed live in a review queue and do not ship.
- **Content review:** the project owner reviews all Coptic and church content.
- **Artwork:** original companion paintings in `public/characters/`; licenses in `public/THIRD-PARTY-NOTICES.txt` and `public/fonts/`.
- **What doesn't exist:** there are no player counts, testimonials, partnerships, or endorsements from any church body. Never claim any.

## Product Principles

1. **Accuracy over volume.** Every fact has a source. If in doubt, it goes to the review queue, not into the app.
2. **The explanation is the reward.** Feedback should make players want to read the "Did you know?"
3. **Zero-friction play.** One tap from opening the app to the first question; customization stays optional.
4. **Come back tomorrow.** Daily challenge, streaks, and mastery give a reason to return without guilt-tripping.
5. **Everyone at the table.** Pass-and-play must be clear, fair, and private for every player in turn.

## Accessibility & Inclusion

- WCAG 2.1 AA contrast, touch targets of at least 44px, full keyboard play (A–D / 1–4), and visible focus.
- Respect `prefers-reduced-motion` and `prefers-reduced-transparency`. Sound is off by default and haptics follow the mute toggle.
- A relaxed (untimed) mode is always available, and the Easy tier is always untimed.
- Layouts must work at 360px wide with no horizontal scroll.
