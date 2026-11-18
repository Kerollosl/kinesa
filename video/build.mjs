// Builds the self-contained film: inlines the shared companion model
// (src/companions/model.js, the same characters the app draws) and the
// Alexandria font.
import { readFile, writeFile } from "node:fs/promises";
const here = new URL(".", import.meta.url);
const src = await readFile(new URL("src/kinesa-big-spin.src.html", here), "utf8");
const font = await readFile(new URL("../public/fonts/alexandria-variable-latin.woff2", here));
const model = (await readFile(new URL("../src/companions/model.js", here), "utf8"))
  .replace(/^import .*$/gm, "")
  .replace(/^export (const|function|class) /gm, "$1 ");
const out = src.replace("/*@MODEL@*/", () => model).replace("/*@FONT@*/", () => font.toString("base64"));
await writeFile(new URL("kinesa-big-spin.html", here), out);
console.log(`kinesa-big-spin.html ${(out.length / 1024).toFixed(0)} KB`);
