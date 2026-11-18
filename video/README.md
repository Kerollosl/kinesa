# Kinesa · The Big Spin (30 s)

Leo tries to spin the giant Kinesa wheel and can't. Lou, Juno and Mattie join one by one, pushing in a line, until it spins. It lands on the cross and everyone celebrates.

It's also the first test of the companions as flat 2D, one-piece cartoon characters: every limb starts inside the body and fades into it, so no joint can open.

- `kinesa-big-spin.html`: the whole film in one self-contained file (WebGL2). Click or press space to play with sound.
- `src/kinesa-big-spin.src.html`: the source. `node build.mjs` inlines the Alexandria font to produce the file above.
- Every frame is a pure function of time `t` (seeded hashes, no clocks or `Math.random`). Cuts and sound moments share one cue sheet (`CUE`).

## Render the MP4

```sh
node video/build.mjs
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium node video/render.mjs out --workers 4
```

The renderer draws 1920×1080 frames at 24 fps in parallel headless Chromium, synthesizes the soundtrack (music and effects), normalizes it to -16 LUFS, and writes `out/kinesa-big-spin.mp4` plus a one-frame-per-second `out/contact-sheet.jpg`.

- `node video/contacts.mjs` checks that every hand that should touch something does, on every frame.
- `node video/stills.mjs dir 4.9 15.3` renders single stills.
- `node video/sheet.mjs sheet.png` renders the character sheet (front, three-quarter, full turn).
