# Kinesa companion rig artwork

The four original Gospel companions are assembled from transparent, self-hosted painted parts:

- `kinesa-companion-rig.webp` (1536 × 1024): six parts per character—body reference, head, left/right wings, left/right limbs. Rows are Leo, Lou, Juno and Mattie.
- `kinesa-companion-torsos.webp` (1983 × 793): underpainted lion and ox bodies behind moving forelimbs.
- `kinesa-companion-eyelids.webp` (2172 × 724): matching closed-eye facial textures, registered locally over each eye rather than swapping full heads.

All artwork was generated originally for Kinesa. Lossless WebP encoding preserves every visible RGBA channel value from the PNG originals and reduces the three textures by 41%. There are no external runtime requests or third-party mascot assets. The former full-body action atlas is retained in Git history.

`src/components/companion-rig.js` defines source windows, destination camera boxes, shoulder/head pivots, and eye registration. These are explicit because generated atlas gutters are irregular. Head clip shapes exclude neighboring pieces at narrow gutters; the ox chest has a feathered underpaint layer to conceal shoulder roots. Parts overlap under heads, manes and collars. Keep feet grounded when adjusting the camera.

`Mascot.jsx` renders one accessible SVG with scoped clip/mask identifiers. `useCompanionMotion.js` updates persistent joint transforms directly, using one shared animation frame scheduler. `companion-physics.js` supplies damped springs, asynchronous continuous idle movement, pointer attention, blinking and interruptible greetings. No React renders occur per animation frame or pointer movement.

Pause preserves phase, position and velocity. Offscreen and hidden-tab rigs suspend without catch-up. Reduced motion uses one static articulated pose. `companion-motion.css` supplies framing and overrides obsolete sprite animations; it does not restart joint motion on hover or click.

To replace the artwork, keep generous hidden neck/shoulder overlap, consistent baked lighting, original Gospel identities, and complete transparent silhouettes. Update windows, pivots and local eyelid registration together. Review idle, interrupted greetings, blinks and icon framing; regenerate the app screenshots and motion recording with `node scripts/capture-preview.mjs`.
