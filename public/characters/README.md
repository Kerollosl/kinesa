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

`companion-materials.js` crops the same paintings into reusable masked textures and composes matching painted eyelids into the head texture. `companion-deformation.js` curves those textures through head turns, torso bends, feather folds, restrained expressions and soft limb bends. `companion-surface.js` draws the mesh with WebGL, with a Canvas 2D mesh fallback. The original SVG stays usable when graphics initialization fails or a context is lost.

`companion-physics.js` coordinates authored performance beats with spring-driven joints and skin fields. Retargeting preserves position and velocity. Greetings commit weight before reaching; hugs nestle the head and curl the wings; jumps anticipate, lift and regain foot contact. `useCompanionMotion.js` shares one scheduler, suspends hidden/offscreen rigs and freezes the current pose when paused. Portraits and reduced motion use the original SVG artwork.

When revising placement or motion, preserve the original faces and silhouettes. Review joint overlap, blinks, repeated greetings, portrait cropping and the full cast at phone and desktop sizes. Keep movement restrained enough that the painted parts remain connected.

Regenerate the cast gallery with `node scripts/capture-preview.mjs --companions-only`, or all app previews and the motion recording with `node scripts/capture-preview.mjs`, against the running Vite server. The script also supports `--stills-only`, `--motion-only` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

Use `node scripts/capture-companion-performance.mjs` for a larger close-up of the real homepage animation.
