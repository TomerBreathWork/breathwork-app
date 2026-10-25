import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../dist/", import.meta.url);
const worker = readFileSync(new URL("service-worker.js", root), "utf8");
// Workbox injects literal JSON after bundling. Fail the build if a future large
// asset or new extension is accidentally omitted rather than promising partial
// offline coverage. Source maps and documentation are deliberately nonessential.
const entries = [
  ...worker.matchAll(
    /\{"revision":(?:null|"[^"]+"),"url":"(?:[^"\\]|\\.)*"\}/g,
  ),
].map((match) => JSON.parse(match[0]));
assert(entries.length > 0, "Missing Workbox precache manifest");
const cached = new Set(entries.map((entry) => entry.url));
function check(directory = "") {
  for (const file of readdirSync(new URL(directory, root), {
    withFileTypes: true,
  })) {
    const relative = join(directory, file.name).replaceAll("\\", "/");
    if (file.isDirectory()) check(relative + "/");
    else if (
      relative !== "service-worker.js" &&
      !/\.map$|(?:^|\/)README/i.test(relative)
    )
      assert(cached.has(relative), `Offline precache is missing: ${relative}`);
  }
}
check();
console.log(
  `Verified ${entries.length} precached application, brand and media assets.`,
);
