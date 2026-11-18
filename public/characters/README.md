# Companions

The companions are no longer image files. They are drawn in code from rounded shapes, so they stay crisp at any size and never show a joint:

- `src/companions/model.js`: the four characters (Leo, Lou, Juno, Mattie) as lists of shapes built from a pose.
- `src/companions/motion.js`: the acts the game asks for (idle, wave, cheer, win, sad) as poses over time.
- `src/companions/canvas.js`: draws them on a canvas with soft gradients, core shadows, rim and bounce light, contact shadows and a fine grain.

The film in `video/` draws the same model with WebGL.
