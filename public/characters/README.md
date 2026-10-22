# Kinesa illustrated companions

The cast preserves the original soft, expressive artwork: Leo’s fluffy orange mane, Lou’s rounded calf face, Juno’s smiling white head and broad brown wings, and Mattie’s curly hair, lavender tunic and halo. These are articulated illustrations with dimensional shading, not rotatable 3D models.

- Leo / Mark: warm gold fur, a fluffy orange mane, cream muzzle, rounded paws and ivory feather wings.
- Lou / Luke: ivory horns, a forehead blaze, broad smiling muzzle, stocky body and feather wings.
- Juno / John: fluffy white head, curved gold beak, layered brown feathers and expressive wings.
- Mattie / Matthew: brown curls, a lavender tunic and sash, welcoming hands, sandals, wings and a gold halo.

The self-hosted artwork is split into three transparent WebP atlases:

- `kinesa-companion-rig.webp`: heads, wings, limbs and other painted parts.
- `kinesa-companion-torsos.webp`: torso artwork with overlap at moving joints.
- `kinesa-companion-eyelids.webp`: matching painted blinks.

`src/components/companion-rig.js` defines source windows, destination boxes, eye positions and joint pivots. `Mascot.jsx` assembles those parts inside an accessible SVG with full-body and face-focused framing. Clip paths isolate each part without stretching its painted proportions.

`companion-physics.js` blends continuous idle, pointer attention and greetings with damped springs. Retargeting preserves position and velocity. `useCompanionMotion.js` shares an animation scheduler across visible characters, suspends hidden and offscreen companions, and preserves the current pose when paused. Reduced motion uses a static pose. Blinks overlay matching painted eyelids without replacing the head or whole character.

When revising placement or motion, preserve the original faces and silhouettes. Review joint overlap, blinks, repeated greetings, portrait cropping and the full cast at phone and desktop sizes. Keep movement restrained enough that the painted parts remain connected.

Regenerate the cast gallery with `node scripts/capture-preview.mjs --companions-only`, or all app previews and the motion recording with `node scripts/capture-preview.mjs`, against the running Vite server. The script also supports `--stills-only`, `--motion-only` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
