// Inlines the Alexandria font so the film is one self-contained HTML file.
import { readFile, writeFile } from "node:fs/promises";
const here = new URL(".", import.meta.url);
const src = await readFile(new URL("src/kinesa-big-spin.src.html", here), "utf8");
const font = await readFile(new URL("../public/fonts/alexandria-variable-latin.woff2", here));
const out = src.replace("/*@FONT@*/", font.toString("base64"));
await writeFile(new URL("kinesa-big-spin.html", here), out);
console.log(`kinesa-big-spin.html ${(out.length / 1024).toFixed(0)} KB`);
