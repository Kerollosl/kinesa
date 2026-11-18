# Kinesa companions: Rive rebuild brief

Written 18 November 2026. Draft for an illustrator/animator.

## Goal

Rebuild the four Gospel companions as **flat 2D cartoon characters animated in Rive**, so each one moves as a single piece (no visible joints) and reacts to the game. Target feel: lively, bouncy, squash-and-stretch, big expressive faces. Reference: "Meta's Muse" (link still to be added).

## Why

The current companions are glossy painted figures cut into toy-like parts: heads, torsos, arms and wings with round pegs and knobs where they attach. Moving a part shows the cut, so motion has to stay small. A stopgap shipped on 18 November 2026 (softened joints, limited swing, whole-body squash and droop), but real liveliness needs art made for animation.

## The cast (keep identity)

- **Leo**, lion (St Mark): warm gold fur, fluffy orange mane, cream muzzle, ivory wings. Brave, big energy.
- **Lou**, ox/calf (St Luke): ivory horns, forehead blaze, broad smiling muzzle, stocky, wings. Steady, kind, surprisingly clever.
- **Juno**, eagle (St John): white head, gold beak, layered brown feathers, big wings. Big ideas, bird's-eye view.
- **Mattie**, human child (St Matthew): brown curls, lavender tunic with a gold sash, sandals, wings, halo. Curious, a little mischief.

They are fictional companions inspired by the traditional Gospel symbols, not portraits of the evangelists. All four are winged. Playful about the game, never about faith. Halo only on Mattie.

## Style

- Flat 2D: bold simple shapes, one shade and one highlight per colour, optional soft outline. No 3D-render look.
- Big heads (about 45% of height), small bodies, large expressive eyes.
- Must read at 28 px (avatar chips) and at 240 px (hero moments).
- Sits on a deep purple background (`#3d1f4a`). Matte colours only; the halo is flat yellow (`#ecc965`), never metallic gold.

## Art deliverables (per character)

- Layered vector source (SVG, AI or Figma), front three-quarter view, standing on a baseline.
- Every part drawn **complete underneath** where it overlaps (no pegs, knobs or cut ends): head, hair/mane, ears, body, arms or front legs, wings (feather groups separable), tail, feet.
- Face kit: eyes open / closed / happy (^ ^) / sad; brows; mouths: smile, big laugh, "ooh", small frown, grimace.

## Rive deliverables

- One `.riv` file, four artboards (one per character), 512 × 512, origin at the feet.
- Bones with mesh deformation for limbs, wings and tail: they bend rather than rotate as rigid pieces.
- A state machine named `Companion` with these inputs:

| Input      | Type           | When the game fires it                  | Animation                                       |
| ---------- | -------------- | --------------------------------------- | ----------------------------------------------- |
| `wave`     | trigger        | pass-the-phone screen, first appearance | greeting, about 1.5 s                           |
| `cheer`    | trigger        | right answer                            | squash, hop, land, about 1.2 s                  |
| `sad`      | trigger        | wrong answer or time out                | droop, small head shake, back to idle in ~1.5 s |
| `win`      | trigger        | won a category or the game              | big celebration loop, about 3 s                 |
| `thinking` | boolean        | question on screen                      | looks at the question, blinks more              |
| `lookX`    | number −1 to 1 | pointer position                        | head and eyes follow                            |

- Idle: breathing, a blink every 2–5 s, an occasional glance, ear flick or feather ruffle; loops seamlessly.
- A head-and-shoulders portrait framing (or portrait artboard) for 28–52 px avatars: idle and blink only.
- A still first frame for each state, used when the player has reduced motion turned on.
- Size target: at most 150 KB per character, vector only (no raster textures).

## How it plugs into the app

- The game already talks to companions in acts: `<Companion kind act>` with `idle`, `wave`, `cheer`, `win`, `sad` (`src/components/Companion.jsx`). These map one-to-one to the state-machine inputs above, so no screen code changes.
- Runtime: `@rive-app/canvas-lite`, about 222 KB compressed per Rive's January 2026 size table. Loaded only when a companion is on screen; the current painted rig stays as the fallback.
- **Needs the owner's OK:** this exceeds the "each new dependency under 30 KB gzipped" rule in `PRODUCT.md`.

## Acceptance

- No visible seams at 3× zoom in any state.
- Every state reads clearly at 52 px.
- Smooth (60 fps) on a mid-range phone with four companions on screen.
- The owner reviews all four for reverence and accuracy before they ship.

## Open questions

- Link or clip for the "Meta's Muse" reference.
- Budget, timeline and who draws them (Rive community freelancers, Dribbble, Upwork).
- Keep today's faces closely, or allow a fresh flat redesign of each character?

Sources: [Rive runtime sizes](https://rive.app/docs/runtimes/runtime-sizes.md) · [Rive canvas vs WebGL](https://rive.app/docs/runtimes/web/canvas-vs-webgl)
