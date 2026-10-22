# Kinesa 3D companions

The cast follows a soft baby/chibi direction: oversized heads, compact bodies, rounded cheeks, broad wings, friendly smiles and warm curved eyes. The animated cast consists of original procedural 3D meshes in `src/three/`. No external model service, paid generation job, third-party character, image plane or pose atlas is used at runtime.

- Leo / Mark: sculpted mane, projecting cream muzzle, articulated paws, feather wings and curved tufted tail.
- Lou / Luke: curved ivory horns, forehead blaze, broad muzzle, cloven hooves, wings, ears and tail.
- Juno / John: white head and neck ruff, hooked gold beak, layered brown shoulder/elbow wings, white tail and talons.
- Mattie / Matthew: continuous swept curls, lavender tunic and sash, hands with wrists/elbows, sandals, wings and a gold halo.

`lion-3d.png`, `ox-3d.png`, `eagle-3d.png` and `human-3d.png` are transparent 512px renders of these exact models. The app shows them while its lazy-loaded 3D renderer starts, or if WebGL is unavailable. They are never swapped as animation frames.

`model-kit.js` supplies meshes, materials, articulated groups, physical eyes and eyelids. `motion.js` produces native rotation/translation/scale deltas in model space; springs retain position and velocity when attention or greetings change. `studio.js` preserves each joint’s rest orientation and supplies one WebGL studio. `worker.js` runs sculpting, simulation and rendering off the page thread, writing directly to transferred avatar canvases; `renderer.js` supplies lightweight DOM input and visibility updates. The main-thread compatibility path shares the same studio. Offscreen/hidden characters suspend, pause preserves the exact pose and reduced motion uses a static semantic pose.

To revise a model, keep its feet at Y=0, face toward +Z, and use +Y as up. The returned head center frames portraits. Register moving groups with the kit’s joint helper so motion blends over the rest orientation. Review front/profile turns, blinks, repeated greetings, portrait cropping and real phone performance after changes.

Regenerate posters and the cast gallery with `node scripts/capture-preview.mjs --companions-only`, or all app previews and the motion recording with `node scripts/capture-preview.mjs`, against the running Vite server.
