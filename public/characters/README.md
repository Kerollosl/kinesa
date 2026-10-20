# Kinesa companion artwork

`kinesa-companions-3d.png` is original generated Kinesa artwork: a transparent 1448 × 1086 atlas. Columns are Leo (lion), Lou (ox), Juno (eagle), and Mattie (human); rows are idle, blink, and celebrate. It contains no third-party mascot assets.

`src/components/Mascot.jsx` specifies each source window explicitly because the artwork has irregular gutters. All expressions use the same character scale and camera center, with a shared destination foot baseline. The eagle's raised wings need a wider window than its idle pose. Keep these windows separate to avoid rendering a neighboring character's feathers.

The SVG wrapper provides one accessible name, scoped clip paths, full-body or portrait framing, and a contact shadow. Each pose references the same cached PNG. `index.html` preloads it. No canvas, external service, or 3D engine is required at runtime.

`src/components/companion-motion.css` owns expression switching and gentle body motion. The home scene's existing outer wrapper owns scene travel and its own ground shadow. Reduced motion disables all animation and shows exactly one pose; the scene pause control freezes its frame animation as well as movement.

To replace the art, preserve the four Gospel identities, consistent lighting, fixed scale between expressions, transparent background, and enough space for horns, halos, tails, and spread wings. Update the atlas dimensions and source windows together, then review every pose at full and icon sizes.
